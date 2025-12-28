/**
 * @license
 * Copyright 2025 Your Name
 * SPDX-License-Identifier: Apache-2.0
 */

interface CacheEntry {
  value: any;
  expiry: number;
}

export interface Cache {
  get(key: string): any;
  set(key: string, value: any, ttlMs: number): void;
  has(key: string): boolean;
}

/**
 * Simple in-memory cache implementation
 */
class InMemoryCache implements Cache {
  private store: Map<string, CacheEntry> = new Map();

  get(key: string): any {
    const entry = this.store.get(key);
    if (!entry) {
      return undefined;
    }

    // Check if the entry has expired
    if (Date.now() > entry.expiry) {
      this.store.delete(key);
      return undefined;
    }

    return entry.value;
  }

  set(key: string, value: any, ttlMs: number): void {
    const expiry = Date.now() + ttlMs;
    this.store.set(key, { value, expiry });
  }

  has(key: string): boolean {
    const entry = this.store.get(key);
    if (!entry) {
      return false;
    }

    // Check if the entry has expired
    if (Date.now() > entry.expiry) {
      this.store.delete(key);
      return false;
    }

    return true;
  }
}

/**
 * Creates a new cache instance
 */
export function createCache(): Cache {
  return new InMemoryCache();
}