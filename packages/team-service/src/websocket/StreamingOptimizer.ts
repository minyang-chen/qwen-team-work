import type { EnhancedStreamChunk } from '@qwen-team/ai-agent';

export interface StreamingOptimizer {
  optimizeChunk(chunk: any): any;
  shouldBuffer(chunk: any): boolean;
  flushBuffer(): any[];
}

export class WebSocketStreamOptimizer implements StreamingOptimizer {
  private buffer: any[] = [];
  private bufferTimeout?: NodeJS.Timeout;
  private readonly BUFFER_SIZE = 5;
  private readonly BUFFER_TIMEOUT = 50; // ms

  optimizeChunk(chunk: any): any {
    // Convert ACP stream chunks to WebSocket format
    switch (chunk.type) {
      case 'content':
        return {
          type: 'text',
          data: { text: chunk.text }
        };
      case 'tool':
        return {
          type: 'tool_call',
          data: { 
            name: chunk.toolName,
            args: chunk.args || {}
          }
        };
      case 'tool_result':
        return {
          type: 'tool_response',
          data: {
            name: chunk.toolName,
            result: chunk.result
          }
        };
      case 'finished':
        return {
          type: 'complete',
          data: { finished: true }
        };
      default:
        return {
          type: 'unknown',
          data: chunk
        };
    }
  }

  shouldBuffer(chunk: any): boolean {
    // Buffer small content chunks for efficiency
    return chunk.type === 'content' && 
           chunk.text && 
           chunk.text.length < 100;
  }

  flushBuffer(): any[] {
    if (this.buffer.length === 0) return [];

    // Combine buffered content chunks
    const contentChunks = this.buffer.filter(c => c.type === 'content');
    const otherChunks = this.buffer.filter(c => c.type !== 'content');

    const result: any[] = [];

    if (contentChunks.length > 0) {
      const combinedText = contentChunks.map(c => c.text).join('');
      result.push({
        type: 'text',
        data: { text: combinedText }
      });
    }

    // Add other chunks as-is
    result.push(...otherChunks.map(c => this.optimizeChunk(c)));

    this.buffer = [];
    if (this.bufferTimeout) {
      clearTimeout(this.bufferTimeout);
      this.bufferTimeout = undefined;
    }

    return result;
  }

  addToBuffer(chunk: any, flushCallback: () => void): void {
    this.buffer.push(chunk);

    // Flush if buffer is full
    if (this.buffer.length >= this.BUFFER_SIZE) {
      flushCallback();
      return;
    }

    // Set timeout to flush buffer
    if (!this.bufferTimeout) {
      this.bufferTimeout = setTimeout(() => {
        flushCallback();
      }, this.BUFFER_TIMEOUT);
    }
  }
}

export class ToolExecutionTracker {
  private activeTasks = new Map<string, {
    startTime: number;
    toolName: string;
    status: 'pending' | 'executing' | 'completed' | 'failed';
  }>();

  startTool(toolId: string, toolName: string): void {
    this.activeTasks.set(toolId, {
      startTime: Date.now(),
      toolName,
      status: 'executing'
    });
  }

  completeTool(toolId: string, success: boolean): void {
    const task = this.activeTasks.get(toolId);
    if (task) {
      task.status = success ? 'completed' : 'failed';
      // Keep completed tasks for a short time for status queries
      setTimeout(() => {
        this.activeTasks.delete(toolId);
      }, 5000);
    }
  }

  getActiveTools(): Array<{ toolId: string; toolName: string; duration: number }> {
    const now = Date.now();
    return Array.from(this.activeTasks.entries())
      .filter(([_, task]) => task.status === 'executing')
      .map(([toolId, task]) => ({
        toolId,
        toolName: task.toolName,
        duration: now - task.startTime
      }));
  }

  getToolStatus(toolId: string): string | null {
    return this.activeTasks.get(toolId)?.status || null;
  }
}
