/**
 * Enhanced error formatting for tool execution
 */

export interface ToolExecutionContext {
  toolName: string;
  callId: string;
  args: any;
  attempt?: number;
  maxAttempts?: number;
}

export class ToolErrorFormatter {
  static formatError(error: Error, context: ToolExecutionContext): string {
    const parts: string[] = [];
    
    // Header
    parts.push(`❌ Tool Execution Failed: ${context.toolName}`);
    parts.push(`Call ID: ${context.callId}`);
    
    // Retry info
    if (context.attempt && context.maxAttempts) {
      parts.push(`Attempt: ${context.attempt}/${context.maxAttempts}`);
    }
    
    // Error details
    parts.push(`\nError: ${error.message}`);
    
    // Arguments
    parts.push(`\nArguments:`);
    parts.push(JSON.stringify(context.args, null, 2));
    
    // Stack trace (first 5 lines)
    if (error.stack) {
      const stackLines = error.stack.split('\n').slice(0, 5);
      parts.push(`\nStack Trace:`);
      parts.push(stackLines.join('\n'));
    }
    
    // Suggestions
    const suggestions = this.getSuggestions(error, context);
    if (suggestions.length > 0) {
      parts.push(`\nSuggestions:`);
      suggestions.forEach(s => parts.push(`  • ${s}`));
    }
    
    return parts.join('\n');
  }

  private static getSuggestions(error: Error, context: ToolExecutionContext): string[] {
    const suggestions: string[] = [];
    const errorMsg = error.message.toLowerCase();
    
    // Command not found
    if (errorMsg.includes('command not found')) {
      suggestions.push('Check if the command is installed in the container');
      suggestions.push('Try using the full path to the command');
    }
    
    // Permission denied
    if (errorMsg.includes('permission denied')) {
      suggestions.push('Check file/directory permissions');
      suggestions.push('Ensure the container user has necessary access');
    }
    
    // File not found
    if (errorMsg.includes('no such file') || errorMsg.includes('enoent')) {
      suggestions.push('Verify the file path is correct');
      suggestions.push('Check if the file exists in /workspace');
    }
    
    // Container issues
    if (errorMsg.includes('container')) {
      suggestions.push('Container may have stopped - it will restart automatically');
      suggestions.push('Try the command again');
    }
    
    // Timeout
    if (errorMsg.includes('timeout')) {
      suggestions.push('Command took too long to execute');
      suggestions.push('Try breaking it into smaller operations');
    }
    
    // Network issues
    if (errorMsg.includes('econnrefused') || errorMsg.includes('enotfound')) {
      suggestions.push('Check network connectivity');
      suggestions.push('Verify the service is running');
    }
    
    return suggestions;
  }

  static formatSuccess(context: ToolExecutionContext, executionTimeMs: number): string {
    return `✅ ${context.toolName} completed in ${executionTimeMs}ms`;
  }
}
