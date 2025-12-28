/**
 * @license
 * Copyright 2025 Your Name
 * SPDX-License-Identifier: Apache-2.0
 */

import fetch from 'node-fetch';

// types.ts
export interface CompanyTicker {
  cik_str: number;
  ticker: string;
  title: string;
}

export interface StockSymbolLookupParams {
  companyName?: string;
  stockSymbol?: string;
}

export interface Cache {
  get(key: string): any;
  set(key: string, value: any, ttlMs: number): void;
  has(key: string): boolean;
}

/**
 * Handler for the stock symbol lookup tool
 */
export async function stockSymbolLookupHandler(
  params: StockSymbolLookupParams,
  cache: Cache
): Promise<any> {
  try {
    // Validate parameters
    if (!params.companyName && !params.stockSymbol) {
      return {
        error: true,
        message: 'Either companyName or stockSymbol must be provided'
      };
    }

    if (params.companyName && params.stockSymbol) {
      return {
        error: true,
        message: 'Only one of companyName or stockSymbol should be provided, not both'
      };
    }

    // Load ticker data
    const tickerData = await loadTickerData(cache);
    
    if (params.companyName) {
      // Look up company name to find the stock symbol
      const ticker = tickerData.find(
        (item: CompanyTicker) => 
          item.title.toLowerCase().includes(params.companyName!.toLowerCase())
      );
      
      if (ticker) {
        return {
          success: true,
          message: `The stock symbol for "${params.companyName}" is ${ticker.ticker}`,
          symbol: ticker.ticker,
          company: ticker.title
        };
      } else {
        return {
          success: false,
          message: `Could not find a stock symbol for the company "${params.companyName}"`
        };
      }
    } else if (params.stockSymbol) {
      // Validate if the stock symbol exists
      const ticker = tickerData.find(
        (item: CompanyTicker) => 
          item.ticker.toLowerCase() === params.stockSymbol!.toLowerCase()
      );
      
      if (ticker) {
        return {
          success: true,
          message: `The stock symbol "${params.stockSymbol}" exists for company: ${ticker.title}`,
          symbol: params.stockSymbol,
          company: ticker.title
        };
      } else {
        return {
          success: false,
          message: `The stock symbol "${params.stockSymbol}" does not exist`
        };
      }
    }
  } catch (error) {
    return {
      error: true,
      message: `Error during stock symbol lookup: ${(error as Error).message}`
    };
  }
}

/**
 * Load ticker data from cache or download if needed
 */
async function loadTickerData(cache: Cache): Promise<CompanyTicker[]> {
  const cacheKey = 'company_tickers';
  const cacheTtlMs = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  // Check if we already have cached data
  if (cache.has(cacheKey)) {
    console.error('Using cached ticker data');
    return cache.get(cacheKey);
  }

  // Otherwise, download the latest data
  try {
    console.error('Downloading company ticker data...');
    const response = await fetch('https://www.sec.gov/files/company_tickers.json');
    
    if (!response.ok) {
      throw new Error(`Failed to download ticker data: ${response.statusText}`);
    }
    
    const tickerData = await response.json() as CompanyTicker[];
    
    // Cache the data for 24 hours
    cache.set(cacheKey, tickerData, cacheTtlMs);
    
    console.error(`Downloaded and cached ${tickerData.length} company tickers`);
    return tickerData;
  } catch (error) {
    console.error('Error downloading ticker data:', error);
    throw error;
  }
}