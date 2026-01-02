import type { Config, ToolCallRequestInfo, ToolCallResponseInfo } from '@qwen-code/qwen-code-core';
import { GeminiClient, GeminiEventType, getCoreSystemPrompt } from '@qwen-code/qwen-code-core';
import type { ServerGeminiStreamEvent } from '@qwen-code/qwen-code-core';
import { FinishReason } from '@google/genai';

export class OpenAIClient extends GeminiClient {
  private currentCycleHistory: Array<any> = [];
  
  constructor(config: Config) {
    super(config);
  }

  async *sendMessageStream(
    request: any,
    signal: AbortSignal,
    prompt_id: string
  ): AsyncGenerator<ServerGeminiStreamEvent, any> {
    console.log('[OpenAIClient] Starting OpenAI API call...');
    
    // Check if this is a continuation (request contains functionResponse)
    const isContinuation = Array.isArray(request) && request.some(part => part.functionResponse);
    
    // Get tools from config
    const toolRegistry = (this as any).config.getToolRegistry();
    const allToolDeclarations = toolRegistry.getFunctionDeclarations();
    
    // Use all available tools
    const toolDeclarations = allToolDeclarations;
    console.log('[OpenAIClient] Using tools:', toolDeclarations.map((t: any) => t.name));
    
    // Convert to OpenAI format with proper parameters
    const tools = toolDeclarations.map((tool: any) => {
      // Use parametersJsonSchema from the tool registry (Gemini format)
      // and convert it to OpenAI format
      let parameters = tool.parametersJsonSchema || tool.parameters || { type: "object", properties: {} };
      
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
    if (isContinuation) {
      // Continuation: append tool results to CURRENT cycle history only
      console.log('[OpenAIClient] Continuation - appending', request.length, 'tool results');
      
      for (const part of request) {
        if (part.functionResponse) {
          this.currentCycleHistory.push({
            role: 'tool',
            tool_call_id: part.functionResponse.id,
            content: JSON.stringify(part.functionResponse.response)
          });
        }
      }
      
      // Don't add system message - let LLM naturally summarize from tool results
      messages = this.currentCycleHistory;
      console.log('[OpenAIClient] Current cycle history now has', messages.length, 'messages');
    } else {
      // New query: reset cycle history
      console.log('[OpenAIClient] NEW QUERY - resetting cycle history (was', this.currentCycleHistory.length, 'messages)');
      this.currentCycleHistory = [];
      
      // Extract prompt text for initial call
      const promptText = Array.isArray(request) 
        ? request.map(r => r.text || '').join(' ')
        : request.text || request;
        
      console.log('[OpenAIClient] Request:', JSON.stringify(request));
      console.log('[OpenAIClient] Extracted prompt text:', JSON.stringify(promptText));
      
      // Get system prompt and clean it for OpenAI function calling
      const userMemory = (this as any).config.getUserMemory();
      const model = (this as any).config.getModel();
      let systemPrompt = getCoreSystemPrompt(userMemory, model);
      
      // Remove Qwen-specific tool_call syntax that conflicts with OpenAI function calling
      // Replace [tool_call: ...] with generic instruction
      systemPrompt = systemPrompt.replace(/\[tool_call:[^\]]+\]/g, '[use the appropriate tool]');
      // Remove any <tool_call> XML tags
      systemPrompt = systemPrompt.replace(/<tool_call>[\s\S]*?<\/tool_call>/g, '');
      
      // Add working directory information
      const targetDir = (this as any).config.getTargetDir();
      systemPrompt += `\n\n## Working Directory\nYou are running in a sandboxed Docker environment. Your current working directory is: ${targetDir}\nWhen creating files, use either:\n1. Relative paths: "quick_sort.py" (recommended)\n2. Absolute paths: "${targetDir}/quick_sort.py"\n\nDo NOT use paths like /home/user/ as they don't exist in the sandbox. All files must be in ${targetDir}.`;
      
      console.log('[OpenAIClient] Working directory:', targetDir);
      console.log('[OpenAIClient] System prompt sample:', systemPrompt.substring(0, 500));
      
      messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: promptText }
      ];
      
      // Save to cycle history for continuation
      this.currentCycleHistory = [...messages];
    }

    const requestData = {
      model: (this as any).config.getModel(),
      messages: messages,
      // Don't send tools in continuation - we want text summary only
      tools: isContinuation ? undefined : (tools.length > 0 ? tools : undefined),
      tool_choice: isContinuation ? "none" : (tools.length > 0 ? "auto" : undefined)
    };

    console.log('[OpenAIClient] Using model:', (this as any).config.getModel());
    console.log('[OpenAIClient] Tools:', isContinuation ? 'none (continuation)' : `${tools.length} tools`);
    console.log('[OpenAIClient] Request has', messages.length, 'messages');
    console.log('[OpenAIClient] Is continuation:', isContinuation);
    
    if (isContinuation) {
      console.log('[OpenAIClient] Continuation messages:');
      messages.forEach((msg, idx) => {
        console.log(`  [${idx}] role: ${msg.role}, content length: ${msg.content?.length || 0}, has tool_calls: ${!!msg.tool_calls}, has tool_call_id: ${!!msg.tool_call_id}`);
      });
    }

    try {
      // Make direct OpenAI API call
      const response = await this.makeOpenAICall(requestData);
      console.log('[OpenAIClient] Raw OpenAI response:', JSON.stringify(response, null, 2));

      if (response.choices && response.choices[0]) {
        const message = response.choices[0].message;
        
        // Save assistant message to cycle history (for continuation)
        if (message.tool_calls && message.tool_calls.length > 0) {
          this.currentCycleHistory.push({
            role: 'assistant',
            content: message.content || null,
            tool_calls: message.tool_calls
          });
          console.log('[OpenAIClient] Saved assistant message with tool_calls to cycle history');
        }
        
        // Yield content (only if not null)
        if (message.content) {
          let cleanContent = message.content;
          
          // Try to extract content from XML tool calls that Qwen outputs
          const xmlMatch = message.content.match(/<parameter=content>\s*([\s\S]*?)\s*<\/parameter>/);
          if (xmlMatch && xmlMatch[1]) {
            // Found content in XML, extract and display it
            const extractedContent = xmlMatch[1].trim();
            // Also get the text before the XML
            const beforeXml = message.content.substring(0, message.content.indexOf('<tool_call>')).trim();
            cleanContent = beforeXml + (beforeXml ? '\n\n' : '') + '```\n' + extractedContent + '\n```';
          } else {
            // No XML content found, just strip the XML tags
            cleanContent = message.content.replace(/<tool_call>[\s\S]*$/g, '').trim();
            cleanContent = cleanContent.replace(/<function=[\s\S]*$/g, '').trim();
          }
          
          if (cleanContent) {
            yield {
              type: GeminiEventType.Content,
              value: cleanContent
            };
          }
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
