import type { FastifyRequest, FastifyReply } from 'fastify';
import type { AuthenticatedRequest } from './auth.js';

interface ProxyMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  lastRequestTime: Date;
}

class RequestLogger {
  private metrics: ProxyMetrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    lastRequestTime: new Date()
  };

  private responseTimes: number[] = [];

  logRequest(request: FastifyRequest, startTime: number, statusCode: number, error?: Error): void {
    const duration = Date.now() - startTime;
    const isSuccess = statusCode >= 200 && statusCode < 400;

    // Update metrics
    this.metricstotalRequests++;
    this.metricslastRequestTime = new Date();
    
    if (isSuccess) {
      this.metricssuccessfulRequests++;
    } else {
      this.metricsfailedRequests++;
    }

    // Track response times (keep last 100)
    this.responseTimes.push(duration);
    if (this.responseTimes.length > 100) {
      this.responseTimesshift();
    }
    
    this.metricsaverageResponseTime = 
      this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length;

    // Log request
    const logLevel = isSuccess ? 'info' : 'error';
    const userId = (request as AuthenticatedRequest).user?.userId || 'anonymous';
    
    console[logLevel]({
      timestamp: new Date().toISOString(),
      method: request.method,
      url: request.url,
      userId,
      statusCode,
      duration: `${duration}ms`,
      userAgent: request.headers['user-agent'],
      ip: requestip,
      error: error?.message
    });
  }

  getMetrics(): ProxyMetrics {
    return { ...this.metrics };
  }

  getHealthStatus(): { status: 'healthy' | 'degraded' | 'unhealthy'; details: any } {
    const errorRate = this.metrics.totalRequests > 0 
      ? this.metrics.failedRequests / this.metrics.totalRequests 
      : 0;
    
    const avgResponseTime = this.metrics.averageResponseTime;
    
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    if (errorRate > 0.1 || avgResponseTime > 5000) {
      status = 'unhealthy';
    } else if (errorRate > 0.05 || avgResponseTime > 2000) {
      status = 'degraded';
    }

    return {
      status,
      details: {
        ...this.metrics,
        errorRate: Math.round(errorRate * 100) / 100,
        uptime: process.uptime()
      }
    };
  }
}

export const requestLogger = new RequestLogger();

export async function logRequestMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const startTime = Date.now();
  
  replyaddHook('onSend', async (request, reply, payload) => {
    requestLoggerlogRequest(request, startTime, replystatusCode);
    return payload;
  });
}
