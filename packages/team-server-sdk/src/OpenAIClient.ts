import { GeminiClient, Config, type ServerGeminiStreamEvent, GeminiEventType, getCoreSystemPrompt } from '@qwen-code/core';
import type { ToolCallRequestInfo } from '@qwen-code/core';
import { FinishReason } from '@google/genai';

export class OpenAIClient extends GeminiClient {
  constructor(config: Config) {
    super(config);
  }

  async *sendMessageStream(
    request: any,
    signal: AbortSignal,
    prompt_id: string,
    options?: { isContinuation: boolean }
  ): AsyncGenerator<ServerGeminiStreamEvent, any> {
    console.log('[OpenAIClient] Starting OpenAI API call...');
    
    // Get tools from config - limit to just write_file for testing
    const toolRegistry = (this as any).config.getToolRegistry();
    const allToolDeclarations = toolRegistry.getFunctionDeclarations();
    
    // Use all available tools
    const toolDeclarations = allToolDeclarations;
    console.log('[OpenAIClient] Using tools:', toolDeclarations.map((t: any) => t.name));
    
    // Convert to OpenAI format with proper parameters
    const tools = toolDeclarations.map((tool: any) => {
      let parameters = tool.parameters || { type: "object", properties: {} };
      
      // Add proper parameters for essential tools
      if (tool.name === 'write_file') {
        parameters = {
          type: "object",
          properties: {
            file_path: { type: "string", description: "The absolute path to the file to write to" },
            content: { type: "string", description: "The content to write to the file" }
          },
          required: ["file_path", "content"]
        };
      } else if (tool.name === 'run_shell_command') {
        parameters = {
          type: "object",
          properties: {
            command: { type: "string", description: "The shell command to execute" },
            is_background: { type: "boolean", description: "Whether to run the command in background", default: false }
          },
          required: ["command"]
        };
      } else if (tool.name === 'list_directory') {
        parameters = {
          type: "object",
          properties: {
            path: { type: "string", description: "The directory path to list" }
          },
          required: ["path"]
        };
      }
      
      return {
        type: "function",
        function: {
          name: tool.name,
          description: tool.description,
          parameters: parameters
        }
      };
    });

    // Handle different request types
    let messages;
    if (options?.isContinuation && Array.isArray(request)) {
      // This is a continuation with function responses - skip for now
      console.log('[OpenAIClient] Skipping continuation call for now');
      return;
    } else {
      // Extract prompt text for initial call
      const promptText = Array.isArray(request) 
        ? request.map(r => r.text || '').join(' ')
        : request.text || request;
        
      console.log('[OpenAIClient] Request:', JSON.stringify(request));
      console.log('[OpenAIClient] Extracted prompt text:', JSON.stringify(promptText));
      
      // Get system prompt like GeminiClient does
      const userMemory = (this as any).config.getUserMemory();
      const model = (this as any).config.getModel();
      const systemPrompt = getCoreSystemPrompt(userMemory, model);
      
      messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: promptText }
      ];
    }

    const requestData = {
      model: (this as any).config.getModel(),
      messages: messages,
      tools: tools.length > 0 ? tools : undefined,
      tool_choice: tools.length > 0 ? "auto" : undefined
    };

    console.log('[OpenAIClient] Using model:', (this as any).config.getModel());
    console.log('[OpenAIClient] Request data:', JSON.stringify(requestData, null, 2));

    try {
      // Make direct OpenAI API call
      const response = await this.makeOpenAICall(requestData);
      console.log('[OpenAIClient] Raw OpenAI response:', JSON.stringify(response, null, 2));

      if (response.choices && response.choices[0]) {
        const message = response.choices[0].message;
        
        // Yield content (only if not null)
        if (message.content) {
          yield {
            type: GeminiEventType.Content,
            value: message.content
          };
        }

        // Convert tool_calls to tool_call_request events
        if (message.tool_calls && message.tool_calls.length > 0) {
          console.log('[OpenAIClient] Converting', message.tool_calls.length, 'tool calls');
          console.log('[OpenAIClient] Tool calls:', JSON.stringify(message.tool_calls, null, 2));
          
          for (const toolCall of message.tool_calls) {
            console.log('[OpenAIClient] Processing tool call:', toolCall.function.name);
            console.log('[OpenAIClient] Raw arguments:', toolCall.function.arguments);
            
            let parsedArgs;
            try {
              parsedArgs = JSON.parse(toolCall.function.arguments);
              console.log('[OpenAIClient] Parsed arguments:', parsedArgs);
              
              // Add default values for missing parameters
              if (toolCall.function.name === 'run_shell_command' && !('is_background' in parsedArgs)) {
                parsedArgs.is_background = false;
              }
            } catch (e) {
              console.error('[OpenAIClient] Failed to parse arguments:', e);
              parsedArgs = {};
            }
            
            const toolRequest: ToolCallRequestInfo = {
              callId: toolCall.id,
              name: toolCall.function.name,
              args: parsedArgs,
              isClientInitiated: false,
              prompt_id: prompt_id,
              response_id: response.id || 'unknown'
            };

            yield {
              type: GeminiEventType.ToolCallRequest,
              value: toolRequest
            };
          }
        }

        // Yield finished event
        yield {
          type: GeminiEventType.Finished,
          value: {
            reason: FinishReason.STOP,
            usageMetadata: {
              promptTokenCount: response.usage?.prompt_tokens || 0,
              candidatesTokenCount: response.usage?.completion_tokens || 0,
              totalTokenCount: response.usage?.total_tokens || 0
            }
          }
        };
      }

    } catch (error) {
      console.error('[OpenAIClient] API call failed:', error);
      yield {
        type: GeminiEventType.Error,
        value: {
          error: {
            message: error instanceof Error ? error.message : 'Unknown error',
            status: 500
          }
        }
      };
    }

    return { /* dummy return */ };
  }

  private async makeOpenAICall(requestData: any): Promise<any> {
    // Get base URL from config
    const baseUrl = process.env.OPENAI_BASE_URL || 'http://10.0.0.82:8080/v1';
    const apiKey = process.env.OPENAI_API_KEY || 'sk-svcacct-team-key';
    
    console.log('[OpenAIClient] Using base URL:', baseUrl);
    console.log('[OpenAIClient] Using API key:', apiKey.substring(0, 10) + '...');
    
    // Parse the URL
    const url = new URL(baseUrl);
    const { request } = await import(url.protocol === 'https:' ? 'https' : 'http');
    const postData = JSON.stringify(requestData);
    
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + '/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    return new Promise((resolve, reject) => {
      const req = request(options, (res: any) => {
        let data = '';
        
        res.on('data', (chunk: any) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            resolve(response);
          } catch (error) {
            reject(error);
          }
        });
      });
      
      req.on('error', (error: any) => {
        reject(error);
      });
      
      req.write(postData);
      req.end();
    });
  }
}
