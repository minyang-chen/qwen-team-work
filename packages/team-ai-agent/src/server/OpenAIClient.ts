import type { Config, ToolCallRequestInfo, ToolCallResponseInfo } from '@qwen-code/qwen-code-core';
import { GeminiClient, GeminiEventType, getCoreSystemPrompt } from '@qwen-code/qwen-code-core';
import type { ServerGeminiStreamEvent } from '@qwen-code/qwen-code-core';
import { FinishReason } from '@google/genai';
import { AgentConfigLoader } from '@qwen-team/shared';
import { ModelProviderRegistry, type ModelProvider } from '../models/index.js';

export class OpenAIClient extends GeminiClient {
  private currentCycleHistory: Array<any> = [];
  private agentConfigLoader: AgentConfigLoader;
  private modelProviderRegistry: ModelProviderRegistry;
  private currentProvider: ModelProvider;
  public conversationHistory: Array<{role: string, content: string}> = [];
  
  constructor(config: Config) {
    super(config);
    this.agentConfigLoader = new AgentConfigLoader();
    
    // Initialize provider registry
    this.modelProviderRegistry = new ModelProviderRegistry();
    
    // Detect provider from model name and base URL
    const modelName = (this as any).config.getModel();
    const baseUrl = process.env.OPENAI_BASE_URL;
    this.currentProvider = this.modelProviderRegistry.detectProvider(modelName, baseUrl);
    
    console.log('[OpenAIClient] Using model provider:', this.currentProvider.name);
  }

  async *sendMessageStream(
    request: any,
    signal: AbortSignal,
    prompt_id: string,
    options?: { isContinuation: boolean },
    turns?: number
  ): AsyncGenerator<ServerGeminiStreamEvent, any> {
    // Use conversation history from instance
    const conversationHistory = this.conversationHistory;
    console.log('[OpenAIClient] Starting OpenAI API call...');
    console.log('[OpenAIClient] Conversation history provided:', conversationHistory?.length || 0, 'messages');
    
    // Use provider to check continuation
    const isContinuation = this.currentProvider.isContinuation(request);
    
    // Get active agent configuration
    const activeAgent = this.agentConfigLoader.getActiveAgent();
    console.log('[OpenAIClient] Active agent:', activeAgent.name, '(' + activeAgent.id + ')');
    
    // Get tools from config and filter by agent's allowed tools
    const toolRegistry = (this as any).config.getToolRegistry();
    const allToolDeclarations = toolRegistry.getFunctionDeclarations();
    
    // Filter tools based on active agent configuration
    const toolDeclarations = allToolDeclarations.filter((t: any) => 
      activeAgent.tools.includes(t.name)
    );
    console.log('[OpenAIClient] Using tools:', toolDeclarations.map((t: any) => t.name));
    
    // Use provider to format tools
    const tools = this.currentProvider.formatTools(toolDeclarations);

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
      // New query: Get conversation history from session
      console.log('[OpenAIClient] NEW QUERY');
      
      // Extract prompt text for initial call
      const promptText = Array.isArray(request) 
        ? request.map(r => r.text || '').join(' ')
        : request.text || request;
        
      console.log('[OpenAIClient] Request:', JSON.stringify(request));
      console.log('[OpenAIClient] Extracted prompt text:', JSON.stringify(promptText));
      
      // Get system prompt and clean it for OpenAI function calling
      const userMemory = (this as any).config.getUserMemory();
      const model = (this as any).config.getModel();
      
      // Get system prompt based on active agent configuration
      let systemPrompt: string;
      if (activeAgent.systemPrompt === 'default') {
        // Use core system prompt from packages/core
        systemPrompt = getCoreSystemPrompt(userMemory, model);
      } else {
        // Use agent-specific system prompt
        systemPrompt = activeAgent.systemPrompt;
        
        // Add user memory if available
        if (userMemory && userMemory.trim()) {
          systemPrompt += `\n\n# User Memory\n${userMemory}`;
        }
      }
      
      // Use provider to format system prompt
      systemPrompt = this.currentProvider.formatSystemPrompt(systemPrompt);
      
      // Add working directory information
      const targetDir = (this as any).config.getTargetDir();
      systemPrompt += `\n\n## Working Directory\nYou are running in a sandboxed Docker environment. Your current working directory is: ${targetDir}\nWhen creating files, use either:\n1. Relative paths: "quick_sort.py" (recommended)\n2. Absolute paths: "${targetDir}/quick_sort.py"\n\nDo NOT use paths like /home/user/ as they don't exist in the sandbox. All files must be in ${targetDir}.`;
      
      console.log('[OpenAIClient] Working directory:', targetDir);
      console.log('[OpenAIClient] System prompt sample:', systemPrompt.substring(0, 500));
      
      // Use provided conversation history (from MongoDB)
      const historyMessages = conversationHistory || [];
      console.log('[OpenAIClient] Using', historyMessages.length, 'history messages from MongoDB');
      
      messages = [
        { role: "system", content: systemPrompt },
        ...historyMessages,  // Include conversation history from MongoDB
        { role: "user", content: promptText }  // Current message
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
        
        // Use provider to parse response
        const parsed = this.currentProvider.parseResponse(response);
        
        // Yield content
        if (parsed.content) {
          yield {
            type: GeminiEventType.Content,
            value: parsed.content
          };
        }

        // Convert tool_calls to tool_call_request events
        if (parsed.toolCalls && parsed.toolCalls.length > 0) {
          console.log('[OpenAIClient] Converting', parsed.toolCalls.length, 'tool calls');
          
          for (const toolCall of parsed.toolCalls) {
            console.log('[OpenAIClient] Processing tool call:', toolCall.name);
            
            // Add default values for missing parameters
            if (toolCall.name === 'run_shell_command' && !('is_background' in toolCall.arguments)) {
              toolCall.arguments.is_background = false;
            }
            
            const toolRequest: ToolCallRequestInfo = {
              callId: toolCall.id,
              name: toolCall.name,
              args: toolCall.arguments,
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
