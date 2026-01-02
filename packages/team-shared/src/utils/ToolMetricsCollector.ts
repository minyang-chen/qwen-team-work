/**
 * Metrics collector for tool execution monitoring
 */

export interface ToolExecutionMetric {
  toolName: string;
  executionTimeMs: number;
  success: boolean;
  outputSize: number;
  truncated: boolean;
  timestamp: Date;
  error?: string;
}

export interface ToolStats {
  totalExecutions: number;
  successRate: number;
  avgExecutionTime: number;
  truncationRate: number;
  lastExecution?: Date;
}

export class ToolMetricsCollector {
  private metrics: ToolExecutionMetric[] = [];
  private readonly maxMetrics = 1000; // Keep last 1000 metrics

  record(metric: ToolExecutionMetric): void {
    this.metrics.push(metric);
    
    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }
  }

  getStats(toolName?: string): ToolStats {
    const filtered = toolName 
      ? this.metrics.filter(m => m.toolName === toolName)
      : this.metrics;
      
    if (filtered.length === 0) {
      return {
        totalExecutions: 0,
        successRate: 0,
        avgExecutionTime: 0,
        truncationRate: 0
      };
    }

    const successful = filtered.filter(m => m.success).length;
    const truncated = filtered.filter(m => m.truncated).length;
    const totalTime = filtered.reduce((sum, m) => sum + m.executionTimeMs, 0);

    return {
      totalExecutions: filtered.length,
      successRate: successful / filtered.length,
      avgExecutionTime: totalTime / filtered.length,
      truncationRate: truncated / filtered.length,
      lastExecution: filtered[filtered.length - 1]?.timestamp
    };
  }

  getAllToolStats(): Map<string, ToolStats> {
    const toolNames = new Set(this.metrics.map(m => m.toolName));
    const stats = new Map<string, ToolStats>();
    
    for (const toolName of toolNames) {
      stats.set(toolName, this.getStats(toolName));
    }
    
    return stats;
  }

  getRecentMetrics(limit: number = 10): ToolExecutionMetric[] {
    return this.metrics.slice(-limit);
  }

  clear(): void {
    this.metrics = [];
  }
}

// Singleton instance
let metricsCollector: ToolMetricsCollector | null = null;

export function getMetricsCollector(): ToolMetricsCollector {
  if (!metricsCollector) {
    metricsCollector = new ToolMetricsCollector();
  }
  return metricsCollector;
}
