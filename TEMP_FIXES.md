# Temporary Fixes - To Be Rolled Back

## 1. Stop Token Fix in OpenAI Pipeline

**File:** `packages/core/src/core/openaiContentGenerator/pipeline.ts`
**Lines:** ~275-285
**Issue:** Model server stops generation at `<|end|>` token, truncating responses
**Fix:** Remove `<|end|>` from stop tokens array
**Rollback:** Remove the stop token filtering code once:
- Model server configuration is updated to not use `<|end|>` as stop token, OR
- System prompt is changed to not use the analysis format

**Debug logs added:**
- `packages/qwen-core-agent/src/adapters/CoreAdapter.ts` - Stream chunk logging
- `packages/qwen-core-agent/src/handlers/ChatHandler.ts` - Response analysis logging
- `packages/core/src/core/openaiContentGenerator/pipeline.ts` - Request parameter logging

## How to Rollback

1. Remove the stop token filtering code in pipeline.ts
2. Remove all debug console.log statements
3. Delete this file
