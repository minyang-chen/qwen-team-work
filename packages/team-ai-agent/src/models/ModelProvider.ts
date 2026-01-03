/**
 * Model Provider Interface
 * Abstracts model-specific logic for different LLM providers
 */

export interface ModelProvider {
  name: string;
  
  /**
   * Format system prompt for this model
   */
  formatSystemPrompt(prompt: string): string;
  
  /**
   * Convert tool declarations to model-specific format
   */
  formatTools(tools: any[]): any;
  
  /**
   * Parse model response and extract content/tool calls
   */
  parseResponse(response: any): ParsedResponse;
  
  /**
   * Check if this is a continuation request (has tool results)
   */
  isContinuation(request: any): boolean;
  
  /**
   * Build messages array for API call
   */
  buildMessages(
    systemPrompt: string,
    conversationHistory: ChatMessage[],
    currentMessage: string,
    cycleHistory: any[]
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

export interface ChatMessage {
  role: string;
  content: string;
}

export interface ModelRequest {
  model: string;
  messages: any[];
  tools?: any;
  tool_choice?: string;
}
