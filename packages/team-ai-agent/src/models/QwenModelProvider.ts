/**
 * Qwen Model Provider
 * Handles Qwen-specific XML parsing and formatting
 */

import type { ModelProvider, ParsedResponse, ChatMessage, ToolCall } from './ModelProvider.js';

export class QwenModelProvider implements ModelProvider {
  name = 'qwen';
  
  formatSystemPrompt(prompt: string): string {
    // Remove Qwen-specific XML that conflicts with OpenAI function calling
    let cleaned = prompt.replace(/\[tool_call:[^\]]+\]/g, '[use the appropriate tool]');
    cleaned = cleaned.replace(/<tool_call>[\s\S]*?<\/tool_call>/g, '');
    return cleaned;
  }
  
  formatTools(tools: any[]): any {
    // Convert to OpenAI function format
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
    
    let content = message.content;
    let toolCalls = message.tool_calls;
    
    // Parse XML tool calls if present in content
    if (content?.includes('<tool_call>') && !toolCalls) {
      const xmlToolCalls = this.parseXmlToolCalls(content);
      if (xmlToolCalls.length > 0) {
        toolCalls = xmlToolCalls;
        // Strip XML from content
        content = content.substring(0, content.indexOf('<tool_call>')).trim();
      }
    }
    
    return {
      content,
      toolCalls: toolCalls?.map((tc: any) => ({
        id: tc.id || `call_${Date.now()}`,
        name: tc.function?.name || tc.name,
        arguments: typeof tc.function?.arguments === 'string' 
          ? JSON.parse(tc.function.arguments) 
          : tc.arguments
      })),
      finishReason: response.choices[0].finish_reason
    };
  }

  private parseXmlToolCalls(content: string): any[] {
    const toolCalls: any[] = [];
    const toolCallRegex = /<tool_call>([\s\S]*?)<\/tool_call>/g;
    let match;
    
    while ((match = toolCallRegex.exec(content)) !== null) {
      const xmlContent = match[1];
      if (!xmlContent) continue;
      
      const functionMatch = xmlContent.match(/<function=([^>]+)>/);
      if (!functionMatch || !functionMatch[1]) continue;
      
      const functionName = functionMatch[1];
      const args: any = {};
      
      // Parse parameters
      const paramRegex = /<parameter=([^>]+)>([\s\S]*?)<\/parameter>/g;
      let paramMatch;
      
      while ((paramMatch = paramRegex.exec(xmlContent)) !== null) {
        if (paramMatch[1] && paramMatch[2]) {
          args[paramMatch[1]] = paramMatch[2].trim();
        }
      }
      
      toolCalls.push({
        id: `call_${Date.now()}_${toolCalls.length}`,
        name: functionName,
        arguments: args
      });
    }
    
    return toolCalls;
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
