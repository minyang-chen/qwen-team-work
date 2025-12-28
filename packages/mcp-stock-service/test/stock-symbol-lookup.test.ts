/**
 * @license
 * Copyright 2025 Your Name
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { stockSymbolLookupHandler, type StockSymbolLookupParams } from './tools/stock-symbol-lookup.js';
import type { Cache } from './tools/stock-symbol-lookup.js';

// Mock cache for testing
const createMockCache = (): Cache => {
  const store = new Map();
  return {
    get: (key: string) => store.get(key),
    set: (key: string, value: any, ttlMs: number) => store.set(key, value),
    has: (key: string) => store.has(key),
  };
};

describe('stockSymbolLookupHandler', () => {
  let mockCache: Cache;

  beforeEach(() => {
    mockCache = createMockCache();
  });

  it('should return error when neither companyName nor stockSymbol is provided', async () => {
    const params = {} as StockSymbolLookupParams;
    const result = await stockSymbolLookupHandler(params, mockCache);
    
    expect(result).toEqual({
      error: true,
      message: 'Either companyName or stockSymbol must be provided'
    });
  });

  it('should return error when both companyName and stockSymbol are provided', async () => {
    const params = {
      companyName: 'Apple',
      stockSymbol: 'AAPL'
    };
    const result = await stockSymbolLookupHandler(params, mockCache);
    
    expect(result).toEqual({
      error: true,
      message: 'Only one of companyName or stockSymbol should be provided, not both'
    });
  });

  it('should lookup company name and return stock symbol', async () => {
    // Mock cache to return test data
    const testData = [
      { cik_str: 320193, ticker: 'AAPL', title: 'Apple Inc.' },
      { cik_str: 1318605, ticker: 'MSFT', title: 'Microsoft Corp.' }
    ];
    
    mockCache.set('company_tickers', testData, 86400000); // 24 hours TTL
    
    const params = { companyName: 'Apple' };
    const result = await stockSymbolLookupHandler(params, mockCache);
    
    expect(result).toEqual({
      success: true,
      message: 'The stock symbol for "Apple" is AAPL',
      symbol: 'AAPL',
      company: 'Apple Inc.'
    });
  });

  it('should validate stock symbol', async () => {
    // Mock cache to return test data
    const testData = [
      { cik_str: 320193, ticker: 'AAPL', title: 'Apple Inc.' },
      { cik_str: 1318605, ticker: 'MSFT', title: 'Microsoft Corp.' }
    ];
    
    mockCache.set('company_tickers', testData, 86400000); // 24 hours TTL
    
    const params = { stockSymbol: 'AAPL' };
    const result = await stockSymbolLookupHandler(params, mockCache);
    
    expect(result).toEqual({
      success: true,
      message: 'The stock symbol "AAPL" exists for company: Apple Inc.',
      symbol: 'AAPL',
      company: 'Apple Inc.'
    });
  });

  it('should return not found for unknown company name', async () => {
    // Mock cache to return test data
    const testData = [
      { cik_str: 320193, ticker: 'AAPL', title: 'Apple Inc.' }
    ];
    
    mockCache.set('company_tickers', testData, 86400000); // 24 hours TTL
    
    const params = { companyName: 'Unknown Company' };
    const result = await stockSymbolLookupHandler(params, mockCache);
    
    expect(result).toEqual({
      success: false,
      message: 'Could not find a stock symbol for the company "Unknown Company"'
    });
  });

  it('should return not found for unknown stock symbol', async () => {
    // Mock cache to return test data
    const testData = [
      { cik_str: 320193, ticker: 'AAPL', title: 'Apple Inc.' }
    ];
    
    mockCache.set('company_tickers', testData, 86400000); // 24 hours TTL
    
    const params = { stockSymbol: 'UNKNOWN' };
    const result = await stockSymbolLookupHandler(params, mockCache);
    
    expect(result).toEqual({
      success: false,
      message: 'The stock symbol "UNKNOWN" does not exist'
    });
  });
});