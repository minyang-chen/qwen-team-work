import { WebSocketMessage, AcpMessage } from '../schemas/messageSchemas.js';

export interface MessageTrace {
  traceId: string;
  correlationId: string;
  sessionId: string;
  userId: string;
  spans: MessageSpan[];
  startTime: number;
  endTime?: number;
  status: 'active' | 'completed' | 'failed';
}

export interface MessageSpan {
  spanId: string;
  parentSpanId?: string;
  service: string;
  operation: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  status: 'active' | 'completed' | 'failed';
  metadata: Record<string, any>;
  error?: string;
}

export class MessageTracer {
  private traces = new Map<string, MessageTrace>();
  private activeSpans = new Map<string, MessageSpan>();
  private readonly maxTraces = 10000;
  private readonly traceRetention = 3600000; // 1 hour

  // Start new trace
  startTrace(
    correlationId: string,
    sessionId: string,
    userId: string,
    service: string,
    operation: string
  ): string {
    const traceId = correlationId;
    const spanId = `${service}-${Date.now()}`;

    const span: MessageSpan = {
      spanId,
      service,
      operation,
      startTime: Date.now(),
      status: 'active',
      metadata: {}
    };

    const trace: MessageTrace = {
      traceId,
      correlationId,
      sessionId,
      userId,
      spans: [span],
      startTime: Date.now(),
      status: 'active'
    };

    this.traces.set(traceId, trace);
    this.activeSpans.set(spanId, span);

    return spanId;
  }

  // Add span to existing trace
  addSpan(
    correlationId: string,
    service: string,
    operation: string,
    parentSpanId?: string
  ): string {
    const trace = this.traces.get(correlationId);
    if (!trace) return '';

    const spanId = `${service}-${Date.now()}`;
    const span: MessageSpan = {
      spanId,
      parentSpanId,
      service,
      operation,
      startTime: Date.now(),
      status: 'active',
      metadata: {}
    };

    trace.spans.push(span);
    this.activeSpans.set(spanId, span);

    return spanId;
  }

  // Complete span
  completeSpan(spanId: string, metadata?: Record<string, any>, error?: string): void {
    const span = this.activeSpans.get(spanId);
    if (!span) return;

    span.endTime = Date.now();
    span.duration = span.endTime - span.startTime;
    span.status = error ? 'failed' : 'completed';
    span.error = error;
    
    if (metadata) {
      span.metadata = { ...span.metadata, ...metadata };
    }

    this.activeSpans.delete(spanId);

    // Check if trace is complete
    const trace = this.traces.get(span.spanId.split('-')[0]);
    if (trace && trace.spans.every(s => s.status !== 'active')) {
      trace.endTime = Date.now();
      trace.status = trace.spans.some(s => s.status === 'failed') ? 'failed' : 'completed';
    }
  }

  // Get trace by correlation ID
  getTrace(correlationId: string): MessageTrace | undefined {
    return this.traces.get(correlationId);
  }

  // Get traces by session
  getSessionTraces(sessionId: string): MessageTrace[] {
    return Array.from(this.traces.values()).filter(trace => trace.sessionId === sessionId);
  }

  // Get performance metrics
  getMetrics(): {
    totalTraces: number;
    activeTraces: number;
    averageLatency: number;
    errorRate: number;
    throughput: number;
  } {
    const traces = Array.from(this.traces.values());
    const completedTraces = traces.filter(t => t.status === 'completed');
    const failedTraces = traces.filter(t => t.status === 'failed');
    const activeTraces = traces.filter(t => t.status === 'active');

    const totalLatency = completedTraces.reduce((sum, trace) => {
      return sum + (trace.endTime! - trace.startTime);
    }, 0);

    const averageLatency = completedTraces.length > 0 ? totalLatency / completedTraces.length : 0;
    const errorRate = traces.length > 0 ? failedTraces.length / traces.length : 0;

    // Calculate throughput (traces per minute)
    const oneMinuteAgo = Date.now() - 60000;
    const recentTraces = traces.filter(t => t.startTime > oneMinuteAgo);

    return {
      totalTraces: traces.length,
      activeTraces: activeTraces.length,
      averageLatency,
      errorRate,
      throughput: recentTraces.length
    };
  }

  // Cleanup old traces
  cleanup(): void {
    const now = Date.now();
    const cutoff = now - this.traceRetention;

    for (const [traceId, trace] of this.traces.entries()) {
      if (trace.startTime < cutoff) {
        this.traces.delete(traceId);
      }
    }

    // Limit total traces
    if (this.traces.size > this.maxTraces) {
      const sortedTraces = Array.from(this.traces.entries())
        .sort(([, a], [, b]) => a.startTime - b.startTime);
      
      const toDelete = sortedTraces.slice(0, this.traces.size - this.maxTraces);
      toDelete.forEach(([traceId]) => this.traces.delete(traceId));
    }
  }

  // Export traces for analysis
  exportTraces(sessionId?: string): MessageTrace[] {
    const traces = Array.from(this.traces.values());
    return sessionId ? traces.filter(t => t.sessionId === sessionId) : traces;
  }
}

// Performance metrics collector
export class PerformanceCollector {
  private metrics = {
    messageCount: 0,
    totalLatency: 0,
    errorCount: 0,
    throughputWindow: [] as number[],
    latencyHistogram: new Map<number, number>(),
    serviceMetrics: new Map<string, {
      count: number;
      totalLatency: number;
      errorCount: number;
    }>()
  };

  recordMessage(service: string, latency: number, isError = false): void {
    this.metrics.messageCount++;
    this.metrics.totalLatency += latency;
    
    if (isError) {
      this.metrics.errorCount++;
    }

    // Update service metrics
    if (!this.metrics.serviceMetrics.has(service)) {
      this.metrics.serviceMetrics.set(service, { count: 0, totalLatency: 0, errorCount: 0 });
    }
    
    const serviceMetric = this.metrics.serviceMetrics.get(service)!;
    serviceMetric.count++;
    serviceMetric.totalLatency += latency;
    if (isError) serviceMetric.errorCount++;

    // Update latency histogram (buckets: 0-10ms, 10-50ms, 50-100ms, 100-500ms, 500ms+)
    const bucket = latency < 10 ? 10 : latency < 50 ? 50 : latency < 100 ? 100 : latency < 500 ? 500 : 1000;
    this.metrics.latencyHistogram.set(bucket, (this.metrics.latencyHistogram.get(bucket) || 0) + 1);

    // Update throughput window (last minute)
    this.metrics.throughputWindow.push(Date.now());
    const oneMinuteAgo = Date.now() - 60000;
    this.metrics.throughputWindow = this.metrics.throughputWindow.filter(t => t > oneMinuteAgo);
  }

  getMetrics() {
    const averageLatency = this.metrics.messageCount > 0 ? this.metrics.totalLatency / this.metrics.messageCount : 0;
    const errorRate = this.metrics.messageCount > 0 ? this.metrics.errorCount / this.metrics.messageCount : 0;

    const serviceStats = Object.fromEntries(
      Array.from(this.metrics.serviceMetrics.entries()).map(([service, stats]) => [
        service,
        {
          averageLatency: stats.count > 0 ? stats.totalLatency / stats.count : 0,
          errorRate: stats.count > 0 ? stats.errorCount / stats.count : 0,
          throughput: stats.count
        }
      ])
    );

    return {
      totalMessages: this.metrics.messageCount,
      averageLatency,
      errorRate,
      throughput: this.metrics.throughputWindow.length,
      latencyHistogram: Object.fromEntries(this.metrics.latencyHistogram),
      serviceStats
    };
  }

  reset(): void {
    this.metrics = {
      messageCount: 0,
      totalLatency: 0,
      errorCount: 0,
      throughputWindow: [],
      latencyHistogram: new Map(),
      serviceMetrics: new Map()
    };
  }
}

export const messageTracer = new MessageTracer();
export const performanceCollector = new PerformanceCollector();

// Cleanup every 10 minutes
setInterval(() => {
  messageTracer.cleanup();
}, 600000);
