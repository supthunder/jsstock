// Alpaca API configuration and utilities
import { Redis } from '@upstash/redis';

// Alpaca API credentials
export const ALPACA_API_KEY = 'PKVDOYT09VXMR4DRPIAC';
export const ALPACA_API_SECRET = 'Xz5Et6hoEpy258TmJHydpoKd56jr6gyNmeywR9l8';
export const ALPACA_BASE_URL = 'https://paper-api.alpaca.markets/v2';
export const ALPACA_DATA_URL = 'https://data.alpaca.markets/v2';

// Create Redis client for caching
// You'll need to add @upstash/redis to your dependencies and configure with your Redis credentials
// For development, you can use a Map as a simple in-memory cache
export const cache = process.env.REDIS_URL 
  ? new Redis({
      url: process.env.REDIS_URL || '',
      token: process.env.REDIS_TOKEN || '',
    })
  : new Map();

// Cache TTL values (in seconds)
export const CACHE_TTL = {
  STOCK_QUOTE: 60, // 1 minute for quotes
  STOCK_BARS: 300, // 5 minutes for bars
  STOCK_SEARCH: 3600, // 1 hour for search results
  COMPANY_INFO: 86400, // 1 day for company info
};

// Helper for Redis-compatible cache operations (works with both Redis and Map)
export const cacheHelper = {
  async get(key: string) {
    if (cache instanceof Map) {
      const item = cache.get(key);
      if (!item) return null;
      
      const { value, expiry } = JSON.parse(item as string);
      if (expiry < Date.now()) {
        cache.delete(key);
        return null;
      }
      return value;
    }
    
    return cache.get(key);
  },
  
  async set(key: string, value: any, ttl: number) {
    if (cache instanceof Map) {
      const item = {
        value,
        expiry: Date.now() + (ttl * 1000),
      };
      cache.set(key, JSON.stringify(item));
      return true;
    }
    
    return cache.set(key, value, { ex: ttl });
  },
  
  async delete(key: string) {
    if (cache instanceof Map) {
      return cache.delete(key);
    }
    
    return cache.del(key);
  }
};

// Standard error handling for API responses
export async function handleResponse(response: Response) {
  if (!response.ok) {
    const errorText = await response.text();
    try {
      const errorJson = JSON.parse(errorText);
      throw new Error(errorJson.message || errorJson.error || 'Unknown error');
    } catch (e) {
      throw new Error(`API error (${response.status}): ${errorText}`);
    }
  }
  return response.json();
}

// Alpaca API headers
export function getAlpacaHeaders() {
  return {
    'APCA-API-KEY-ID': ALPACA_API_KEY,
    'APCA-API-SECRET-KEY': ALPACA_API_SECRET,
  };
} 