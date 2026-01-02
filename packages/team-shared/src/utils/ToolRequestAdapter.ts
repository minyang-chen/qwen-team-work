/**
 * Adapter to normalize tool request formats between CoreToolScheduler and SandboxedToolExecutor
 */

export interface NormalizedToolRequest {
  id: string;
  callId: string;
  name: string;
  parameters: any;
  args: any;
}

export class ToolRequestAdapter {
  /**
   * Normalize tool request to include both 'parameters' and 'args' for compatibility
   */
  static normalize(request: any): NormalizedToolRequest {
    const args = request.args || request.parameters || {};
    
    return {
      id: request.id || request.callId,
      callId: request.callId || request.id,
      name: request.name,
      parameters: args,
      args: args
    };
  }
  
  /**
   * Normalize batch of requests
   */
  static normalizeBatch(requests: any[]): NormalizedToolRequest[] {
    return requests.map(r => this.normalize(r));
  }
}
