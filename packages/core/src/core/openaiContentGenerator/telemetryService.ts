/**
 * @license
 * Copyright 2025 Qwen
 * SPDX-License-Identifier: Apache-2.0
 */

export interface RequestContext {
  userPromptId: string;
  model: string;
  authType: string;
  startTime: number;
  duration: number;
  isStreaming: boolean;
}

export interface TelemetryService {
  logSuccess(context: RequestContext, response: any, request?: any, openaiResponse?: any): Promise<void>;
  logError(context: RequestContext, error: Error, request?: any): Promise<void>;
  logStreamingSuccess(context: RequestContext, response: any, request?: any, chunks?: any): Promise<void>;
}

export class NoOpTelemetryService implements TelemetryService {
  async logSuccess(_context: RequestContext, _response: any, _request?: any, _openaiResponse?: any): Promise<void> {
    // No-op implementation
  }

  async logError(_context: RequestContext, _error: Error, _request?: any): Promise<void> {
    // No-op implementation
  }

  async logStreamingSuccess(_context: RequestContext, _response: any, _request?: any, _chunks?: any): Promise<void> {
    // No-op implementation
  }
}
