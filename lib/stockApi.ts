// Normalized Stock API Interface
import { 
  ALPACA_API_KEY, 
  ALPACA_API_SECRET, 
  ALPACA_DATA_URL,
  CACHE_TTL,
  cacheHelper,
  getAlpacaHeaders,
  handleResponse
} from './alpaca';

// Normalized stock data interfaces
export interface StockQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  volume: number;
  timestamp: string;
  source: string;
}

export interface StockCandle {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface StockSearchResult {
  symbol: string;
  name: string;
  type: string;
  market?: string;
  currencySymbol?: string;
}

// Helper function to generate cache keys
function getCacheKey(type: string, params: Record<string, any>): string {
  const paramString = Object.entries(params)
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
  return `stock_api:${type}:${paramString}`;
}

// Get real-time quote for a stock
export async function getStockQuote(symbol: string): Promise<StockQuote> {
  console.log(`Getting quote for ${symbol}`);
  
  // Check cache first
  const cacheKey = getCacheKey('quote', { symbol });
  const cachedData = await cacheHelper.get(cacheKey);
  
  if (cachedData) {
    console.log(`Cache hit for ${symbol} quote`);
    return cachedData as StockQuote;
  }
  
  console.log(`Cache miss for ${symbol} quote, fetching from Alpaca`);
  
  try {
    const response = await fetch(`${ALPACA_DATA_URL}/stocks/${symbol}/quotes/latest`, {
      headers: getAlpacaHeaders(),
    });
    
    const data = await handleResponse(response);
    
    // Normalize data format
    const quote: StockQuote = {
      symbol,
      price: data.quote?.ap || data.quote?.p || 0, // Ask price or last price
      change: 0, // We'll need to calculate this from last close
      changePercent: 0, // Same here
      high: data.quote?.h || 0,
      low: data.quote?.l || 0,
      open: 0, // Not directly available from quotes endpoint
      previousClose: 0, // Not directly available from quotes endpoint
      volume: data.quote?.v || 0,
      timestamp: data.quote?.t ? new Date(data.quote.t).toISOString() : new Date().toISOString(),
      source: 'alpaca',
    };
    
    // Get the previous day's close to calculate change
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    try {
      const barResponse = await fetch(
        `${ALPACA_DATA_URL}/stocks/${symbol}/bars?timeframe=1D&start=${yesterday.toISOString()}&limit=2`,
        { headers: getAlpacaHeaders() }
      );
      
      const barData = await handleResponse(barResponse);
      
      if (barData.bars && barData.bars.length > 0) {
        const previousBar = barData.bars[0];
        quote.previousClose = previousBar.c;
        quote.open = previousBar.o || barData.bars[barData.bars.length - 1]?.o || 0;
        quote.change = quote.price - quote.previousClose;
        quote.changePercent = quote.previousClose ? (quote.change / quote.previousClose) * 100 : 0;
      }
    } catch (error) {
      console.error(`Error fetching bar data for ${symbol}:`, error);
    }
    
    // Cache the result
    await cacheHelper.set(cacheKey, quote, CACHE_TTL.STOCK_QUOTE);
    
    return quote;
  } catch (error) {
    console.error(`Error fetching quote for ${symbol}:`, error);
    throw error;
  }
}

// Get historical candles for a stock
export async function getStockCandles(
  symbol: string, 
  timeframe: string = '1D', 
  start: string = '', 
  end: string = '',
  limit: number = 100
): Promise<StockCandle[]> {
  console.log(`Getting candles for ${symbol}, timeframe: ${timeframe}`);
  
  // Default start date if not provided (30 days ago)
  if (!start) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    start = startDate.toISOString();
  }
  
  // Check cache first
  const cacheKey = getCacheKey('candles', { symbol, timeframe, start, end, limit });
  const cachedData = await cacheHelper.get(cacheKey);
  
  if (cachedData) {
    console.log(`Cache hit for ${symbol} candles`);
    return cachedData as StockCandle[];
  }
  
  console.log(`Cache miss for ${symbol} candles, fetching from Alpaca`);
  
  try {
    // Build URL with parameters
    let url = `${ALPACA_DATA_URL}/stocks/${symbol}/bars?timeframe=${timeframe}&limit=${limit}`;
    if (start) url += `&start=${start}`;
    if (end) url += `&end=${end}`;
    
    const response = await fetch(url, {
      headers: getAlpacaHeaders(),
    });
    
    const data = await handleResponse(response);
    
    // Normalize data format
    const candles: StockCandle[] = (data.bars || []).map((bar: any) => ({
      timestamp: new Date(bar.t).toISOString(),
      open: bar.o,
      high: bar.h,
      low: bar.l,
      close: bar.c,
      volume: bar.v,
    }));
    
    // Cache the result
    await cacheHelper.set(cacheKey, candles, CACHE_TTL.STOCK_BARS);
    
    return candles;
  } catch (error) {
    console.error(`Error fetching candles for ${symbol}:`, error);
    throw error;
  }
}

// Search for stocks
export async function searchStocks(query: string): Promise<StockSearchResult[]> {
  if (!query || query.length < 2) {
    return [];
  }
  
  console.log(`Searching stocks with query: ${query}`);
  
  // Check cache first
  const cacheKey = getCacheKey('search', { query });
  const cachedData = await cacheHelper.get(cacheKey);
  
  if (cachedData) {
    console.log(`Cache hit for search: ${query}`);
    return cachedData as StockSearchResult[];
  }
  
  console.log(`Cache miss for search: ${query}, fetching from Alpaca`);
  
  try {
    // Alpaca doesn't have a direct search endpoint, but we can use the assets endpoint
    // and filter the results
    const response = await fetch(`${ALPACA_DATA_URL}/assets?status=active`, {
      headers: getAlpacaHeaders(),
    });
    
    const assets = await handleResponse(response);
    
    // Filter and normalize the results
    const lowercaseQuery = query.toLowerCase();
    const results = assets
      .filter((asset: any) => 
        asset.symbol.toLowerCase().includes(lowercaseQuery) || 
        (asset.name && asset.name.toLowerCase().includes(lowercaseQuery))
      )
      .slice(0, 15) // Limit to top 15 results
      .map((asset: any) => ({
        symbol: asset.symbol,
        name: asset.name || asset.symbol,
        type: asset.class || 'stock',
        market: asset.exchange,
        currencySymbol: '$', // Assuming USD
      }));
    
    // Cache the result
    await cacheHelper.set(cacheKey, results, CACHE_TTL.STOCK_SEARCH);
    
    return results;
  } catch (error) {
    console.error(`Error searching stocks with query ${query}:`, error);
    // Return empty array on error
    return [];
  }
}

// Get stock performance data (for a specific period)
export async function getStockPerformance(
  symbol: string,
  period: string = '1m' // 1d, 1w, 1m, 3m, 1y, 5y
): Promise<{ 
  symbol: string,
  performance: number,
  startPrice: number,
  endPrice: number,
  startDate: string,
  endDate: string,
  source: string
}> {
  console.log(`Getting performance for ${symbol}, period: ${period}`);
  
  // Check cache first
  const cacheKey = getCacheKey('performance', { symbol, period });
  const cachedData = await cacheHelper.get(cacheKey);
  
  if (cachedData) {
    console.log(`Cache hit for ${symbol} performance`);
    return cachedData as any;
  }
  
  console.log(`Cache miss for ${symbol} performance, fetching from Alpaca`);
  
  try {
    // Calculate date range based on period
    const end = new Date();
    const start = new Date();
    
    switch (period) {
      case '1d':
        start.setDate(start.getDate() - 1);
        break;
      case '1w':
        start.setDate(start.getDate() - 7);
        break;
      case '1m':
        start.setMonth(start.getMonth() - 1);
        break;
      case '3m':
        start.setMonth(start.getMonth() - 3);
        break;
      case '1y':
        start.setFullYear(start.getFullYear() - 1);
        break;
      case '5y':
        start.setFullYear(start.getFullYear() - 5);
        break;
      default:
        start.setMonth(start.getMonth() - 1); // Default to 1 month
    }
    
    const startStr = start.toISOString();
    const endStr = end.toISOString();
    
    // Get candles for the period
    const candles = await getStockCandles(symbol, '1D', startStr, endStr, 1000);
    
    if (!candles || candles.length < 2) {
      throw new Error(`Insufficient data for ${symbol} performance calculation`);
    }
    
    const startPrice = candles[0].close;
    const endPrice = candles[candles.length - 1].close;
    const performance = ((endPrice - startPrice) / startPrice) * 100;
    
    const result = {
      symbol,
      performance,
      startPrice,
      endPrice,
      startDate: candles[0].timestamp,
      endDate: candles[candles.length - 1].timestamp,
      source: 'alpaca'
    };
    
    // Cache the result
    await cacheHelper.set(cacheKey, result, CACHE_TTL.STOCK_BARS);
    
    return result;
  } catch (error) {
    console.error(`Error fetching performance for ${symbol}:`, error);
    throw error;
  }
} 