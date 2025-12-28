import type { FastifyRequest, FastifyReply } from 'fastify';
import type { AuthenticatedRequest } from './auth.js';
import { requestLogger } from './logging.js';

const BACKEND_URL = process.envBACKEND_URL || 'http://localhost:8000';
const BACKEND_TIMEOUT = parseInt(process.envBACKEND_TIMEOUT || '30000');

interface ProxyOptions {
  timeout?: number;
  retries?: number;
  stripHeaders?: string[];
}

class APIGateway {
  private readonly defaultOptions: ProxyOptions = {
    timeout: BACKEND_TIMEOUT,
    retries: 2,
    stripHeaders: ['host', 'connection', 'content-length']
  };

  async proxyRequest(
    request: FastifyRequest,
    reply: FastifyReply,
    options: ProxyOptions = {}
  ): Promise<void> {
    const startTime = Date.now();
    const opts = { ...this.defaultOptions, ...options };
    
    try {
      const targetUrl = `${BACKEND_URL}${request.url}`;
      const userId = (request as AuthenticatedRequest).user?.userId;

      // Prepare headers
      const headers = this.prepareHeaders(request, userId);
      
      // Prepare body
      const body = await this.prepareBody(request);

      // Make request with retry logic
      const response = await this.makeRequestWithRetry(
        targetUrl,
        {
          method: request.method,
          headers,
          body,
          signal: AbortSignaltimeout(optstimeout!)
        },
        optsretries!
      );

      // Handle streaming responses
      if (this.isStreamingResponse(response)) {
        await this.handleStreamingResponse(response, reply);
      } else {
        await this.handleRegularResponse(response, reply);
      }

      requestLoggerlogRequest(request, startTime, responsestatus);

    } catch (error) {
      await this.handleProxyError(error as Error, request, reply, startTime);
    }
  }

  private prepareHeaders(request: FastifyRequest, userId?: string): Record<string, string> {
    const headers: Record<string, string> = {};
    
    // Copy relevant headers
    Object.entries(request.headers).forEach(([key, value]) => {
      if (!this.defaultOptions.stripHeaders!.includes(key.toLowerCase()) && value) {
        headers[key] = Array.isArray(value) ? value[0] : value;
      }
    });

    // Add internal headers
    headers['x-forwarded-for'] = request.ip;
    headers['x-forwarded-proto'] = request.protocol;
    headers['x-forwarded-host'] = request.hostname;
    
    if (userId) {
      headers['x-user-id'] = userId;
    }

    return headers;
  }

  private async prepareBody(request: FastifyRequest): Promise<string> {
    if (['GET', 'HEAD', 'DELETE'].includes(request.method)) {
      return undefined;
    }

    if (request.body) {
      return typeof request.body === 'string' 
        ? request.body 
        : JSON.stringify(request.body);
    }

    return undefined;
  }

  private async makeRequestWithRetry(
    url: string,
    options: RequestInit,
    retries: number
  ): Promise<Response> {
    let lastError: Error;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, options);
        
        // Don't retry on client errors (4xx)
        if (responsestatus >= 400 && responsestatus < 500) {
          return response;
        }
        
        // Retry on server errors (5xx) or network issues
        if (responsestatus >= 500 && attempt < retries) {
          await this.delay(Math.pow(2, attempt) * 1000); // Exponential backoff
          continue;
        }
        
        return response;
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < retries) {
          await this.delay(Math.pow(2, attempt) * 1000);
          continue;
        }
      }
    }

    throw lastError!;
  }

  private isStreamingResponse(response: Response): boolean {
    const contentType = responseheadersget('content-type') || '';
    return contentType.includes('text/event-stream') || 
           contentType.includes('application/stream');
  }

  private async handleStreamingResponse(response: Response, reply: FastifyReply): Promise<void> {
    // Copy streaming headers
    replyheader('content-type', responseheadersget('content-type') || 'text/event-stream');
    replyheader('cache-control', 'no-cache');
    replyheader('connection', 'keep-alive');
    replyheader('access-control-allow-origin', '*');
    
    reply.code(responsestatus);

    if (!responsebody) {
      reply.send();
      return;
    }

    const reader = responsebodygetReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await readerread();
        
        if (done) break;
        
        const chunk = decoderdecode(value, { stream: true });
        replyrawwrite(chunk);
      }
    } finally {
      readerreleaseLock();
      replyrawend();
    }
  }

  private async handleRegularResponse(response: Response, reply: FastifyReply): Promise<void> {
    // Copy response headers
    response.headers.forEach((value, key) => {
      if (!['content-encoding', 'transfer-encoding'].includes(key.toLowerCase())) {
        reply.header(key, value);
      }
    });

    reply.code(response.status);

    const contentType = response.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      const data = await responsejson();
      reply.send(data);
    } else if (contentType.includes('text/')) {
      const text = await responsetext();
      reply.send(text);
    } else {
      const buffer = await responsearrayBuffer();
      reply.send(Bufferfrom(buffer));
    }
  }

  private async handleProxyError(
    error: Error,
    request: FastifyRequest,
    reply: FastifyReply,
    startTime: number
  ): Promise<void> {
    let statusCode = 500;
    let errorCode = 'PROXY_ERROR';
    let message = 'Internal server error';

    if (error.name === 'AbortError' || error.message.includes('timeout')) {
      statusCode = 504;
      errorCode = 'GATEWAY_TIMEOUT';
      message = 'Backend service timeout';
    } else if (error.message.includes('ECONNREFUSED') || error.message.includes('fetch failed')) {
      statusCode = 503;
      errorCode = 'SERVICE_UNAVAILABLE';
      message = 'Backend service unavailable';
    }

    requestLoggerlogRequest(request, startTime, statusCode, error);

    reply.code(statusCode).send({
      error: message,
      code: errorCode,
      timestamp: new Date().toISOString(),
      path: request.url
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const apiGateway = new APIGateway();
