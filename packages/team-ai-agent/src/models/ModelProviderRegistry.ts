/**
 * Model Provider Registry
 * Manages and auto-detects model providers
 */

import type { ModelProvider } from './ModelProvider.js';
import { QwenModelProvider } from './QwenModelProvider.js';
import { OpenAIModelProvider } from './OpenAIModelProvider.js';

export class ModelProviderRegistry {
  private providers = new Map<string, ModelProvider>();
  
  constructor() {
    // Register default providers
    this.register(new QwenModelProvider());
    this.register(new OpenAIModelProvider());
  }
  
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
  
  /**
   * Auto-detect provider from model name or base URL
   * Can be overridden with explicit MODEL_PROVIDER env var
   */
  detectProvider(modelName: string, baseUrl?: string): ModelProvider {
    // Check for explicit provider configuration
    const explicitProvider = process.env.MODEL_PROVIDER;
    if (explicitProvider) {
      console.log('[ModelProviderRegistry] Using explicit provider:', explicitProvider);
      return this.get(explicitProvider.toLowerCase());
    }
    
    // Check model name
    if (modelName.toLowerCase().includes('qwen')) {
      return this.get('qwen');
    }
    
    if (modelName.toLowerCase().includes('gpt')) {
      return this.get('openai');
    }
    
    // Check base URL
    if (baseUrl) {
      if (baseUrl.includes('dashscope') || baseUrl.includes('aliyun')) {
        return this.get('qwen');
      }
      
      if (baseUrl.includes('openai.com')) {
        return this.get('openai');
      }
    }
    
    // Default to OpenAI-compatible
    console.log('[ModelProviderRegistry] No explicit provider, defaulting to openai');
    return this.get('openai');
  }
}
