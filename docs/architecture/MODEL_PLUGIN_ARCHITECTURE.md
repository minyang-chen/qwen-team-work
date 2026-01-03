# Model Plugin Architecture Design

## Current Issues

### team-ai-agent Implementation
The current `OpenAIClient` in `packages/team-ai-agent` has model-specific logic mixed in:

1. **Qwen-specific XML parsing** (lines 180-195):
   - Extracts content from `<parameter=content>` XML tags
   - Strips `<tool_call>` and `<function=` XML markers
   - This is Qwen-Coder specific behavior

2. **OpenAI-compatible API calls** (lines 270-320):
   - Uses OpenAI `/chat/completions` endpoint
   - Converts Gemini tool format to OpenAI function format
   - Hardcoded to OpenAI request/response structure

3. **System prompt manipulation** (lines 110-115):
   - Removes Qwen-specific `[tool_call: ...]` syntax
   - Strips `<tool_call>` XML tags from system prompts

### packages/core Implementation
The core package has separate content generators:
- `geminiContentGenerator/` - Gemini-specific
- `openaiContentGenerator/` - OpenAI-specific  
- `anthropicContentGenerator/` - Anthropic-specific

But team-ai-agent doesn't use this pattern.

## Proposed Plugin Architecture

### 1. Model Provider Interface

```typescript
// packages/team-ai-agent/src/models/ModelProvider.ts

export interface ModelProvider {
  name: string;
  
  // Format system prompt for this model
  formatSystemPrompt(prompt: string): string;
  
  // Convert tool declarations to model-specific format
  formatTools(tools: ToolDeclaration[]): any;
  
  // Make API call to model
  makeApiCall(request: ModelRequest): Promise<ModelResponse>;
  
  // Parse model response and extract content/tool calls
  parseResponse(response: any): ParsedResponse;
  
  // Check if this is a continuation request
  isContinuation(request: any): boolean;
  
  // Build messages array for API call
  buildMessages(
    systemPrompt: string,
    conversationHistory: ChatMessage[],
    currentMessage: string,
    isContinuation: boolean
  ): any[];
}

export interface ParsedResponse {
  content?: string;
  toolCalls?: ToolCall[];
  finishReason?: string;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: any;
}
```

### 2. Qwen Model Provider

```typescript
// packages/team-ai-agent/src/models/QwenModelProvider.ts

export class QwenModelProvider implements ModelProvider {
  name = 'qwen';
  
  formatSystemPrompt(prompt: string): string {
    // Remove Qwen-specific XML that conflicts with OpenAI
    let cleaned = prompt.replace(/\[tool_call:[^\]]+\]/g, '[use the appropriate tool]');
    cleaned = cleaned.replace(/<tool_call>[\s\S]*?<\/tool_call>/g, '');
    return cleaned;
  }
  
  formatTools(tools: ToolDeclaration[]): any {
    // Convert to OpenAI function format
    return tools.map(tool => ({
      type: "function",
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parametersJsonSchema || tool.parameters
      }
    }));
  }
  
  parseResponse(response: any): ParsedResponse {
    const message = response.choices?.[0]?.message;
    if (!message) return {};
    
    let content = message.content;
    
    // Extract content from Qwen XML format
    const xmlMatch = content?.match(/<parameter=content>\s*([\s\S]*?)\s*<\/parameter>/);
    if (xmlMatch && xmlMatch[1]) {
      const extractedContent = xmlMatch[1].trim();
      const beforeXml = content.substring(0, content.indexOf('<tool_call>')).trim();
      content = beforeXml + (beforeXml ? '\n\n' : '') + '```\n' + extractedContent + '\n```';
    } else {
      // Strip XML tags
      content = content?.replace(/<tool_call>[\s\S]*$/g, '').trim();
      content = content?.replace(/<function=[\s\S]*$/g, '').trim();
    }
    
    return {
      content,
      toolCalls: message.tool_calls?.map((tc: any) => ({
        id: tc.id,
        name: tc.function.name,
        arguments: JSON.parse(tc.function.arguments)
      })),
      finishReason: response.choices[0].finish_reason
    };
  }
  
  async makeApiCall(request: ModelRequest): Promise<any> {
    const baseUrl = process.env.OPENAI_BASE_URL || 'http://10.0.0.82:8080/v1';
    const apiKey = process.env.OPENAI_API_KEY || 'sk-svcacct-team-key';
    
    // HTTP request implementation
    // ... (existing makeOpenAICall logic)
  }
}
```

### 3. OpenAI Model Provider

```typescript
// packages/team-ai-agent/src/models/OpenAIModelProvider.ts

export class OpenAIModelProvider implements ModelProvider {
  name = 'openai';
  
  formatSystemPrompt(prompt: string): string {
    // OpenAI doesn't need special formatting
    return prompt;
  }
  
  formatTools(tools: ToolDeclaration[]): any {
    return tools.map(tool => ({
      type: "function",
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parametersJsonSchema || tool.parameters
      }
    }));
  }
  
  parseResponse(response: any): ParsedResponse {
    const message = response.choices?.[0]?.message;
    if (!message) return {};
    
    // OpenAI response is clean, no XML parsing needed
    return {
      content: message.content,
      toolCalls: message.tool_calls?.map((tc: any) => ({
        id: tc.id,
        name: tc.function.name,
        arguments: JSON.parse(tc.function.arguments)
      })),
      finishReason: response.choices[0].finish_reason
    };
  }
  
  async makeApiCall(request: ModelRequest): Promise<any> {
    // Same as Qwen but could use official OpenAI SDK
  }
}
```

### 4. Model Provider Registry

```typescript
// packages/team-ai-agent/src/models/ModelProviderRegistry.ts

export class ModelProviderRegistry {
  private providers = new Map<string, ModelProvider>();
  
  register(provider: ModelProvider): void {
    this.providers.set(provider.name, provider);
  }
  
  get(name: string): ModelProvider {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new Error(`Model provider '${name}' not found`);
    }
    return provider;
  }
  
  // Auto-detect provider from model name or config
  detectProvider(modelName: string): ModelProvider {
    if (modelName.includes('qwen') || modelName.includes('Qwen')) {
      return this.get('qwen');
    }
    if (modelName.includes('gpt')) {
      return this.get('openai');
    }
    // Default to OpenAI-compatible
    return this.get('openai');
  }
}
```

### 5. Updated OpenAIClient

```typescript
// packages/team-ai-agent/src/server/OpenAIClient.ts

export class OpenAIClient extends GeminiClient {
  private modelProviderRegistry: ModelProviderRegistry;
  private currentProvider: ModelProvider;
  
  constructor(config: Config) {
    super(config);
    
    // Initialize registry
    this.modelProviderRegistry = new ModelProviderRegistry();
    this.modelProviderRegistry.register(new QwenModelProvider());
    this.modelProviderRegistry.register(new OpenAIModelProvider());
    
    // Detect provider from model name
    const modelName = config.getModel();
    this.currentProvider = this.modelProviderRegistry.detectProvider(modelName);
    
    console.log('[OpenAIClient] Using model provider:', this.currentProvider.name);
  }
  
  async *sendMessageStream(
    request: any,
    signal: AbortSignal,
    prompt_id: string,
    conversationHistory?: Array<{role: string, content: string}>
  ): AsyncGenerator<ServerGeminiStreamEvent, any> {
    
    // Use provider to check continuation
    const isContinuation = this.currentProvider.isContinuation(request);
    
    // Get system prompt
    let systemPrompt = this.getSystemPrompt();
    
    // Format system prompt using provider
    systemPrompt = this.currentProvider.formatSystemPrompt(systemPrompt);
    
    // Get and format tools
    const tools = this.getFilteredTools();
    const formattedTools = this.currentProvider.formatTools(tools);
    
    // Build messages using provider
    const messages = this.currentProvider.buildMessages(
      systemPrompt,
      conversationHistory || [],
      this.extractPromptText(request),
      isContinuation
    );
    
    // Make API call using provider
    const response = await this.currentProvider.makeApiCall({
      model: this.config.getModel(),
      messages,
      tools: isContinuation ? undefined : formattedTools
    });
    
    // Parse response using provider
    const parsed = this.currentProvider.parseResponse(response);
    
    // Yield content
    if (parsed.content) {
      yield {
        type: GeminiEventType.Content,
        value: parsed.content
      };
    }
    
    // Yield tool calls
    if (parsed.toolCalls) {
      for (const toolCall of parsed.toolCalls) {
        yield {
          type: GeminiEventType.ToolCallRequest,
          value: {
            id: toolCall.id,
            name: toolCall.name,
            args: toolCall.arguments
          }
        };
      }
    }
  }
}
```

## Benefits

1. **Separation of Concerns**: Model-specific logic isolated in providers
2. **Easy to Add Models**: Just implement ModelProvider interface
3. **Testable**: Each provider can be unit tested independently
4. **Maintainable**: Changes to Qwen XML format only affect QwenModelProvider
5. **Flexible**: Can switch providers at runtime based on model name
6. **Reusable**: Providers can be shared across packages

## Migration Path

1. Create `packages/team-ai-agent/src/models/` directory
2. Implement `ModelProvider` interface
3. Create `QwenModelProvider` with existing XML parsing logic
4. Create `OpenAIModelProvider` for standard OpenAI models
5. Update `OpenAIClient` to use provider pattern
6. Add tests for each provider
7. Document provider API for adding new models

## Future Enhancements

1. **Gemini Provider**: Use packages/core geminiContentGenerator
2. **Anthropic Provider**: Use packages/core anthropicContentGenerator
3. **Custom Providers**: Allow users to register custom providers
4. **Provider Configuration**: Load providers from config file
5. **Streaming Support**: Add streaming-specific methods to interface
