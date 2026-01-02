/**
 * Team-specific tool injection utility
 * This ensures tools are always included in requests without modifying core
 */

import type { GenerateContentParameters } from '@google/genai';
import type { Config } from '@qwen-code/qwen-code-core';

export class TeamToolInjector {
  constructor(private config: Config) {}

  /**
   * Ensures tools are included in the request for proper OpenAI tool calling
   */
  injectTools(request: GenerateContentParameters): GenerateContentParameters {
    // If tools are already in the request, use them
    if (request.config?.tools) {
      console.log('[TeamToolInjector] Tools already in request config');
      return request;
    }

    // Get tools from the CLI config's tool registry
    const toolRegistry = this.config.getToolRegistry();
    if (!toolRegistry) {
      console.log('[TeamToolInjector] No tool registry found');
      return request;
    }

    const toolDeclarations = toolRegistry.getFunctionDeclarations();
    if (toolDeclarations.length === 0) {
      console.log('[TeamToolInjector] No tool declarations found');
      return request;
    }

    // Add tools to the request config
    const tools = [{ functionDeclarations: toolDeclarations }];
    const enhancedRequest: GenerateContentParameters = {
      ...request,
      config: {
        ...request.config,
        tools: tools,
      },
    };

    console.log(`[TeamToolInjector] Added ${toolDeclarations.length} tools to request`);
    return enhancedRequest;
  }
}
