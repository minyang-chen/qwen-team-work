# Model Provider Configuration

## Overview

The team-ai-agent uses a **provider pattern** to support different LLM models with model-specific parsing and formatting logic.

## Supported Providers

1. **QwenModelProvider** (`qwen`)
   - Handles Qwen-specific XML parsing (`<tool_call>`, `<parameter=content>`)
   - Strips Qwen-specific syntax from system prompts
   - Use for: Qwen models, DashScope API

2. **OpenAIModelProvider** (`openai`)
   - Standard OpenAI JSON response parsing
   - No XML processing
   - Use for: OpenAI GPT models, OpenAI-compatible APIs

## Configuration Methods

### Method 1: Explicit Provider (Recommended for Local IPs)

Set the `MODEL_PROVIDER` environment variable:

```bash
# For Qwen models
export MODEL_PROVIDER=qwen
export OPENAI_BASE_URL=http://10.0.0.82:8080/v1
export OPENAI_MODEL=Qwen/Qwen2.5-Coder-32B-Instruct

# For OpenAI-compatible models
export MODEL_PROVIDER=openai
export OPENAI_BASE_URL=http://10.0.0.82:8080/v1
export OPENAI_MODEL=gpt-4
```

### Method 2: Auto-Detection

If `MODEL_PROVIDER` is not set, the provider is auto-detected:

**By Model Name:**
- Contains "qwen" → QwenModelProvider
- Contains "gpt" → OpenAIModelProvider

**By Base URL:**
- Contains "dashscope" or "aliyun" → QwenModelProvider
- Contains "openai.com" → OpenAIModelProvider

**Default:** OpenAIModelProvider

## Examples

### Qwen Model (Local)
```bash
MODEL_PROVIDER=qwen
OPENAI_BASE_URL=http://10.0.0.82:8080/v1
OPENAI_MODEL=Qwen/Qwen2.5-Coder-32B-Instruct
OPENAI_API_KEY=your_key
```

### Qwen Model (DashScope)
```bash
# Auto-detected as qwen from URL
OPENAI_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
OPENAI_MODEL=qwen-coder-plus
OPENAI_API_KEY=your_dashscope_key
```

### OpenAI GPT
```bash
# Auto-detected as openai from model name
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4
OPENAI_API_KEY=your_openai_key
```

### OpenAI-Compatible (Local)
```bash
MODEL_PROVIDER=openai
OPENAI_BASE_URL=http://localhost:8080/v1
OPENAI_MODEL=llama-3-70b
OPENAI_API_KEY=local_key
```

## When to Use Explicit Configuration

Use `MODEL_PROVIDER` when:
- Using local IP addresses (e.g., `http://10.0.0.82:8080/v1`)
- Model name doesn't contain "qwen" or "gpt"
- You want explicit control over provider selection
- Auto-detection might be ambiguous

## Adding New Providers

To add a new provider:

1. Create provider class implementing `ModelProvider` interface
2. Register in `ModelProviderRegistry` constructor
3. Add detection logic in `detectProvider()` method
4. Update this documentation

See `packages/team-ai-agent/src/models/` for implementation details.
