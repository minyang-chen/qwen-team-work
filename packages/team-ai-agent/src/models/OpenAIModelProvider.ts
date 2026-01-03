/**
 * OpenAI Model Provider
 * Handles standard OpenAI API without XML parsing
 */

import type { ModelProvider, ParsedResponse, ChatMessage } from './ModelProvider.js';

export class OpenAIModelProvider implements ModelProvider {
  name = 'openai';
  
  formatSystemPrompt(prompt: string): string {
    // OpenAI doesn't need special formatting
    return prompt;
  }
  
  formatTools(tools: any[]): any {
    return tools.map(tool => ({
      type: "function",
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parametersJsonSchema || tool.parameters || { type: "object", properties: {} }
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
  
  isContinuation(request: any): boolean {
    return Array.isArray(request) && request.some(part => part.functionResponse);
  }
  
  buildMessages(
    systemPrompt: string,
    conversationHistory: ChatMessage[],
    currentMessage: string,
    cycleHistory: any[]
  ): any[] {
    if (cycleHistory.length > 0) {
      // Continuation - use cycle history
      return cycleHistory;
    }
    
    // New query - build from scratch
    return [
      { role: "system", content: systemPrompt },
      ...conversationHistory,
      { role: "user", content: currentMessage }
    ];
  }
}
