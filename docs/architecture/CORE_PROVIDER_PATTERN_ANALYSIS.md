# How packages/core and packages/cli Manage Multiple LLM Providers

## Architecture Overview

### 1. Provider Pattern with OpenAICompatibleProvider Interface

**Location**: `packages/core/src/core/openaiContentGenerator/provider/`

The core package uses a **provider pattern** to support multiple OpenAI-compatible LLM providers:

```typescript
// Provider Interface
export interface OpenAICompatibleProvider {
  buildHeaders(): Record<string, string | undefined>;
  buildClient(): OpenAI;
  buildRequest(
    request: OpenAI.Chat.ChatCompletionCreateParams,
    userPromptId: string,
  ): OpenAI.Chat.ChatCompletionCreateParams;
  getDefaultGenerationConfig(): GenerateContentConfig;
}
```

### 2. Provider Implementations

Each provider implements the interface with provider-specific logic:

#### Available Providers:
1. **DefaultOpenAICompatibleProvider** - Standard OpenAI API
2. **DashScopeOpenAICompatibleProvider** - Alibaba DashScope (Qwen OAuth)
3. **DeepSeekOpenAICompatibleProvider** - DeepSeek API
4. **ModelScopeOpenAICompatibleProvider** - ModelScope API
5. **OpenRouterOpenAICompatibleProvider** - OpenRouter API

#### Example: DashScopeOpenAICompatibleProvider

```typescript
export class DashScopeOpenAICompatibleProvider implements OpenAICompatibleProvider {
  static isDashScopeProvider(config: ContentGeneratorConfig): boolean {
    const authType = config.authType;
    const baseUrl = config.baseUrl;
    return (
      authType === AuthType.QWEN_OAUTH ||
      baseUrl === 'https://dashscope.aliyuncs.com/compatible-mode/v1' ||
      baseUrl === 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1'
    );
  }

  buildHeaders(): Record<string, string | undefined> {
    return {
      'User-Agent': userAgent,
      'X-DashScope-CacheControl': 'enable',
      'X-DashScope-UserAgent': userAgent,
      'X-DashScope-AuthType': authType,
    };
  }

  buildRequest(request, userPromptId): OpenAI.Chat.ChatCompletionCreateParams {
    // Apply DashScope-specific configurations:
    // - Cache control for system/tool/history messages
    // - Output token limits based on model
    // - Vision model parameters
    // - Request metadata for session tracking
    return enhancedRequest;
  }
}
```

### 3. Provider Auto-Detection

**Location**: `packages/core/src/core/openaiContentGenerator/index.ts`

```typescript
export function determineProvider(
  contentGeneratorConfig: ContentGeneratorConfig,
  cliConfig: Config,
): OpenAICompatibleProvider {
  // Check for DashScope provider
  if (DashScopeOpenAICompatibleProvider.isDashScopeProvider(config)) {
    return new DashScopeOpenAICompatibleProvider(config, cliConfig);
  }

  if (DeepSeekOpenAICompatibleProvider.isDeepSeekProvider(config)) {
    return new DeepSeekOpenAICompatibleProvider(config, cliConfig);
  }

  if (OpenRouterOpenAICompatibleProvider.isOpenRouterProvider(config)) {
    return new OpenRouterOpenAICompatibleProvider(config, cliConfig);
  }

  if (ModelScopeOpenAICompatibleProvider.isModelScopeProvider(config)) {
    return new ModelScopeOpenAICompatibleProvider(config, cliConfig);
  }

  // Default provider for standard OpenAI-compatible APIs
  return new DefaultOpenAICompatibleProvider(config, cliConfig);
}
```

### 4. Content Generator Factory

**Location**: `packages/core/src/core/contentGenerator.ts`

The factory pattern creates the appropriate content generator based on `AuthType`:

```typescript
export enum AuthType {
  USE_OPENAI = 'openai',
  QWEN_OAUTH = 'qwen-oauth',
  USE_GEMINI = 'gemini',
  USE_VERTEX_AI = 'vertex-ai',
  USE_ANTHROPIC = 'anthropic',
}

export async function createContentGenerator(
  config: ContentGeneratorConfig,
  gcConfig: Config,
): Promise<ContentGenerator> {
  if (config.authType === AuthType.USE_OPENAI) {
    const { createOpenAIContentGenerator } = await import(
      './openaiContentGenerator/index.js'
    );
    const generator = createOpenAIContentGenerator(config, gcConfig);
    return new LoggingContentGenerator(generator, gcConfig);
  }

  if (config.authType === AuthType.QWEN_OAUTH) {
    const { QwenContentGenerator } = await import(
      '../qwen/qwenContentGenerator.js'
    );
    const qwenClient = await getQwenOauthClient(gcConfig);
    const generator = new QwenContentGenerator(qwenClient, config, gcConfig);
    return new LoggingContentGenerator(generator, gcConfig);
  }

  if (config.authType === AuthType.USE_ANTHROPIC) {
    const { createAnthropicContentGenerator } = await import(
      './anthropicContentGenerator/index.js'
    );
    const generator = createAnthropicContentGenerator(config, gcConfig);
    return new LoggingContentGenerator(generator, gcConfig);
  }

  if (config.authType === AuthType.USE_GEMINI || 
      config.authType === AuthType.USE_VERTEX_AI) {
    const { createGeminiContentGenerator } = await import(
      './geminiContentGenerator/index.js'
    );
    const generator = createGeminiContentGenerator(config, gcConfig);
    return new LoggingContentGenerator(generator, gcConfig);
  }

  throw new Error(`Unsupported authType: ${config.authType}`);
}
```

### 5. OpenAIContentGenerator with Pipeline

**Location**: `packages/core/src/core/openaiContentGenerator/openaiContentGenerator.ts`

```typescript
export class OpenAIContentGenerator implements ContentGenerator {
  protected pipeline: ContentGenerationPipeline;

  constructor(
    contentGeneratorConfig: ContentGeneratorConfig,
    cliConfig: Config,
    provider: OpenAICompatibleProvider,  // Provider injected here
  ) {
    const pipelineConfig: PipelineConfig = {
      cliConfig,
      provider,  // Provider used in pipeline
      contentGeneratorConfig,
      telemetryService: new NoOpTelemetryService(),
      errorHandler: new EnhancedErrorHandler(),
    };

    this.pipeline = new ContentGenerationPipeline(pipelineConfig);
  }

  async generateContent(request, userPromptId): Promise<GenerateContentResponse> {
    return this.pipeline.execute(request, userPromptId);
  }

  async generateContentStream(request, userPromptId) {
    return this.pipeline.executeStream(request, userPromptId);
  }
}
```

### 6. Pipeline Execution

**Location**: `packages/core/src/core/openaiContentGenerator/pipeline.ts`

The pipeline uses the provider to:
1. Build the OpenAI client
2. Convert Gemini format to OpenAI format
3. Apply provider-specific request modifications
4. Execute the API call
5. Convert OpenAI response back to Gemini format

```typescript
export class ContentGenerationPipeline {
  async execute(request, userPromptId): Promise<GenerateContentResponse> {
    // 1. Build client using provider
    const client = this.config.provider.buildClient();
    
    // 2. Convert Gemini format to OpenAI format
    const openaiRequest = this.converter.convertToOpenAI(request);
    
    // 3. Apply provider-specific modifications
    const enhancedRequest = this.config.provider.buildRequest(
      openaiRequest, 
      userPromptId
    );
    
    // 4. Execute API call
    const response = await client.chat.completions.create(enhancedRequest);
    
    // 5. Convert back to Gemini format
    return this.converter.convertToGemini(response);
  }
}
```

## Key Design Principles

### 1. **Separation of Concerns**
- **Provider**: Handles provider-specific API details (headers, request format, etc.)
- **ContentGenerator**: Implements the ContentGenerator interface
- **Pipeline**: Orchestrates the conversion and execution flow
- **Converter**: Handles format conversion between Gemini and OpenAI

### 2. **Provider Detection**
- Each provider has a static `isXxxProvider()` method
- Auto-detection based on `baseUrl` or `authType`
- Falls back to `DefaultOpenAICompatibleProvider`

### 3. **Extensibility**
- New providers just implement `OpenAICompatibleProvider` interface
- Add detection logic in `determineProvider()`
- No changes needed to core pipeline or converter

### 4. **Provider-Specific Customization**
- **Headers**: Custom headers per provider (e.g., DashScope cache control)
- **Request Enhancement**: Provider-specific parameters (e.g., token limits, metadata)
- **Generation Config**: Default parameters per provider

### 5. **Unified Interface**
- All providers expose the same `ContentGenerator` interface
- CLI code doesn't need to know which provider is being used
- Wrapped in `LoggingContentGenerator` for consistent logging

## Comparison: team-ai-agent vs core

| Aspect | packages/core | team-ai-agent |
|--------|---------------|---------------|
| **Provider Pattern** | ✅ Yes - `OpenAICompatibleProvider` interface | ❌ No - Hardcoded in `OpenAIClient` |
| **Auto-Detection** | ✅ Yes - `determineProvider()` | ❌ No - Manual configuration |
| **Qwen XML Parsing** | ❌ Not needed (uses Gemini format) | ✅ Yes - Hardcoded in `parseResponse()` |
| **Provider Isolation** | ✅ Yes - Each provider in separate file | ❌ No - Mixed in single file |
| **Extensibility** | ✅ Easy - Implement interface | ❌ Hard - Modify OpenAIClient |
| **Format Conversion** | ✅ Yes - Converter handles Gemini ↔ OpenAI | ❌ No - Direct OpenAI format |

## Recommendation for team-ai-agent

Adopt the same provider pattern from packages/core:

1. **Create Provider Interface** similar to `OpenAICompatibleProvider`
2. **Implement Providers**:
   - `QwenModelProvider` - With XML parsing logic
   - `OpenAIModelProvider` - Standard OpenAI
3. **Add Provider Registry** with auto-detection
4. **Refactor OpenAIClient** to use providers
5. **Keep existing API** for backward compatibility

This approach:
- ✅ Isolates Qwen-specific XML parsing
- ✅ Makes it easy to add new models
- ✅ Follows established patterns from core
- ✅ Maintains backward compatibility
- ✅ Improves testability and maintainability
