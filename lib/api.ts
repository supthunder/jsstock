import { POLYGON_API_KEY, ALPHA_VANTAGE_API_KEY, FINNHUB_API_KEY, API_RATE_LIMITS } from './utils'

export interface StockData {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
  volume: number
  marketCap: number
  performance: number[]
  winRate: number
  trades: {
    wins: number
    losses: number
    draws: number
  }
  type: 'smart' | 'fresh' | 'kol' | 'sniper' | 'regular'
  socialMetrics: {
    followers: number
    comments: number
    mentions: number
  }
}

// Helper function to handle API rate limits
function handleRateLimitError(provider: 'polygon' | 'alphaVantage' | 'finnhub', error: any) {
  console.warn(`Rate limit hit for ${provider} API:`, error);
  
  // Mark the API as rate limited for 1 minute (simple cooldown)
  API_RATE_LIMITS[provider].isLimited = true;
  API_RATE_LIMITS[provider].resetTime = new Date(Date.now() + 60000); // Reset after 1 minute
  
  // Check if we should reset any provider's rate limit status
  Object.keys(API_RATE_LIMITS).forEach(key => {
    const provider = key as keyof typeof API_RATE_LIMITS;
    if (API_RATE_LIMITS[provider].resetTime && new Date() > API_RATE_LIMITS[provider].resetTime!) {
      API_RATE_LIMITS[provider].isLimited = false;
      API_RATE_LIMITS[provider].resetTime = null;
    }
  });
}

// Get stock quote with fallback between providers
export async function getStockQuote(symbol: string): Promise<any> {
  // Try Polygon first if not rate limited
  if (!API_RATE_LIMITS.polygon.isLimited) {
    try {
      const response = await fetch(
        `https://api.polygon.io/v2/aggs/ticker/${symbol}/prev?adjusted=true&apiKey=${POLYGON_API_KEY}`
      );
      const data = await response.json();
      
      // Check if we got a rate limit error
      if (data.status === "ERROR" && data.error?.includes("exceeded the maximum requests")) {
        handleRateLimitError('polygon', data.error);
        // Continue to fallback
      } else {
        return data;
      }
    } catch (error) {
      console.error("Polygon API error:", error);
      // Continue to fallback
    }
  }
  
  // Try Finnhub as second option if not rate limited
  if (!API_RATE_LIMITS.finnhub.isLimited) {
    try {
      const response = await fetch(
        `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`
      );
      const data = await response.json();
      
      // Check for Finnhub rate limit (HTTP status 429)
      if (response.status === 429) {
        handleRateLimitError('finnhub', "Rate limit exceeded");
        // Continue to next fallback
      } else {
        // Format Finnhub data to match Polygon structure
        return {
          results: [{
            T: symbol,
            o: data.o,
            h: data.h, 
            l: data.l,
            c: data.c,
            v: data.v,
            t: Date.now()
          }]
        };
      }
    } catch (error) {
      console.error("Finnhub API error:", error);
      // Continue to fallback
    }
  }
  
  // Finally try Alpha Vantage if others failed
  if (!API_RATE_LIMITS.alphaVantage.isLimited) {
    try {
      const response = await fetch(
        `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${ALPHA_VANTAGE_API_KEY}`
      );
      const data = await response.json();
      
      // Check if we got a rate limit error
      if (data["Note"] && data["Note"].includes("API call frequency")) {
        handleRateLimitError('alphaVantage', data["Note"]);
        // All APIs exhausted, return mock data
      } else if (data["Global Quote"]) {
        // Format Alpha Vantage data to match Polygon structure
        const quote = data["Global Quote"];
        return {
          results: [{
            T: symbol,
            o: parseFloat(quote["02. open"]),
            h: parseFloat(quote["03. high"]),
            l: parseFloat(quote["04. low"]),
            c: parseFloat(quote["05. price"]),
            v: parseFloat(quote["06. volume"]),
            t: Date.now()
          }]
        };
      }
    } catch (error) {
      console.error("Alpha Vantage API error:", error);
      // All APIs failed, will return mock data
    }
  }
  
  // Fallback: generate mock data
  console.log("All APIs failed or rate limited, using mock data for", symbol);
  const mockPrice = Math.random() * 500 + 50;
  return {
    results: [{
      T: symbol,
      o: mockPrice * 0.99,
      h: mockPrice * 1.02,
      l: mockPrice * 0.98,
      c: mockPrice,
      v: Math.floor(Math.random() * 10000000) + 1000000,
      t: Date.now()
    }]
  };
}

export async function getMultipleStockQuotes(symbols: string[]): Promise<any> {
  console.log(`Getting quotes for ${symbols.length} symbols`);
  
  // Process in batches of 5 to avoid rate limits
  const batchSize = 5;
  const results = [];
  
  // Process in batches with delay between batches
  for (let i = 0; i < symbols.length; i += batchSize) {
    console.log(`Processing batch ${Math.floor(i/batchSize) + 1} of ${Math.ceil(symbols.length/batchSize)}`);
    const batch = symbols.slice(i, i + batchSize);
    
    // Process the current batch in parallel
    const batchPromises = batch.map(symbol => getStockQuote(symbol)
      .catch(error => {
        console.error(`Error fetching quote for ${symbol}:`, error);
        // Return mock data on error
        const mockPrice = Math.random() * 500 + 50;
        return {
          results: [{
            T: symbol,
            o: mockPrice * 0.99,
            h: mockPrice * 1.02,
            l: mockPrice * 0.98,
            c: mockPrice,
            v: Math.floor(Math.random() * 10000000) + 1000000,
            t: Date.now()
          }]
        };
      })
    );
    
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
    
    // Add delay between batches to avoid rate limits
    if (i + batchSize < symbols.length) {
      console.log('Adding delay between batches to avoid rate limits');
      await new Promise(resolve => setTimeout(resolve, 1200)); // 1.2 second delay
    }
  }
  
  return results;
}

export async function searchSymbols(query: string): Promise<any> {
  // Try Alpha Vantage first if not rate limited
  if (!API_RATE_LIMITS.alphaVantage.isLimited) {
    try {
      const response = await fetch(
        `https://www.alphavantage.co/query?function=SYMBOL_SEARCH&keywords=${query}&apiKey=${ALPHA_VANTAGE_API_KEY}`
      );
      const data = await response.json();
      
      // Check if we got a rate limit error
      if (data["Note"] && data["Note"].includes("API call frequency")) {
        handleRateLimitError('alphaVantage', data["Note"]);
        // Continue to fallback
      } else if (data.bestMatches) {
        return data;
      }
    } catch (error) {
      console.error("Alpha Vantage search error:", error);
      // Continue to fallback
    }
  }
  
  // Try Finnhub as fallback if not rate limited
  if (!API_RATE_LIMITS.finnhub.isLimited) {
    try {
      const response = await fetch(
        `https://finnhub.io/api/v1/search?q=${query}&token=${FINNHUB_API_KEY}`
      );
      
      // Check for Finnhub rate limit (HTTP status 429)
      if (response.status === 429) {
        handleRateLimitError('finnhub', "Rate limit exceeded");
        // All search APIs tried, return mock data
      } else {
        const data = await response.json();
        if (data.result) {
          // Format to match Alpha Vantage structure
          return {
            bestMatches: data.result.slice(0, 10).map((item: any) => ({
              "1. symbol": item.symbol,
              "2. name": item.description,
              "3. type": "Equity",
              "4. region": "US"
            }))
          };
        }
      }
    } catch (error) {
      console.error("Finnhub search error:", error);
    }
  }
  
  // Fallback to mock data if all APIs fail or are rate limited
  console.log("All search APIs failed or rate limited, using mock data for", query);
  const filteredStocks = popularStocks
    .filter(s => s.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 5);
    
  return {
    bestMatches: filteredStocks.map(symbol => ({
      "1. symbol": symbol,
      "2. name": `${symbol} Stock`,
      "3. type": "Equity",
      "4. region": "US"
    }))
  };
}

// Finnhub API functions that should only be called server-side
// because of CORS restrictions
export const finnhubServerOnlyAPIs = {
  async getCandles(symbol: string, resolution: string, from: number, to: number): Promise<any> {
    try {
      const response = await fetch(
        `https://finnhub.io/api/v1/stock/candle?symbol=${symbol}&resolution=${resolution}&from=${from}&to=${to}&token=${FINNHUB_API_KEY}`
      );
      
      if (response.status === 429) {
        handleRateLimitError('finnhub', "Rate limit exceeded");
        throw new Error('Finnhub rate limit exceeded');
      }
      
      const data = await response.json();
      if (data.s === 'ok') {
        return data;
      }
      throw new Error('Failed to get candle data from Finnhub');
    } catch (error) {
      console.error("Finnhub getCandles API error:", error);
      throw error;
    }
  }
}

// Try Finnhub as fallback if not rate limited
export async function getStockPerformance(symbol: string, interval: string = '1d'): Promise<any> {
  // Cache key based on symbol and interval
  const cacheKey = `performance_${symbol}_${interval}`;
  
  // Check cache first
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    try {
      const cachedData = JSON.parse(cached);
      const cacheTime = cachedData.timestamp;
      
      // Use cache if less than 1 hour old
      if (Date.now() - cacheTime < 60 * 60 * 1000) {
        console.log(`Using cached performance data for ${symbol}`);
        return cachedData.data;
      }
    } catch (e) {
      console.warn(`Invalid cache for ${symbol} performance:`, e);
      // Continue to fetch new data
    }
  }
  
  // Try Polygon first if not rate limited
  if (!API_RATE_LIMITS.polygon.isLimited) {
    try {
      // Build time range based on interval
      const now = new Date();
      const to = Math.floor(now.getTime() / 1000);
      let from;
      
      switch (interval) {
        case '1d':
          from = Math.floor(new Date(now.getTime() - 24 * 60 * 60 * 1000).getTime() / 1000);
          break;
        case '1w':
          from = Math.floor(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).getTime() / 1000);
          break;
        case '1m':
        default:
          from = Math.floor(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).getTime() / 1000);
          break;
      }
      
      // Get the appropriate resolution based on interval
      let resolution;
      switch (interval) {
        case '1d': resolution = 'hour'; break;
        case '1w': resolution = 'day'; break;
        case '1m': resolution = 'day'; break;
        default: resolution = 'day';
      }
      
      console.log(`Fetching ${symbol} performance from Polygon: ${interval}, ${resolution}, ${from} to ${to}`);
      
      const response = await fetch(
        `https://api.polygon.io/v2/aggs/ticker/${symbol}/range/1/${resolution}/${from * 1000}/${to * 1000}?adjusted=true&sort=asc&limit=365&apiKey=${POLYGON_API_KEY}`
      );
      
      // Check for rate limit
      if (response.status === 429) {
        handleRateLimitError('polygon', "Rate limit exceeded");
        throw new Error("Polygon rate limit exceeded");
      }
      
      const data = await response.json();
      
      // If successful, cache the result
      if (data.results && data.results.length > 0) {
        try {
          localStorage.setItem(cacheKey, JSON.stringify({
            timestamp: Date.now(),
            data: data
          }));
        } catch (e) {
          console.warn("Failed to cache performance data:", e);
        }
        
        return data;
      }
      
      throw new Error(`No performance data from Polygon for ${symbol}`);
    } catch (error) {
      console.error(`Polygon performance API error for ${symbol}:`, error);
      // Continue to fallback
    }
  }
  
  // Try Finnhub as fallback if not rate limited
  if (!API_RATE_LIMITS.finnhub.isLimited) {
    try {
      // Build time range based on interval
      const now = new Date();
      const to = Math.floor(now.getTime() / 1000);
      let from;
      
      switch (interval) {
        case '1d':
          from = Math.floor(new Date(now.getTime() - 24 * 60 * 60 * 1000).getTime() / 1000);
          break;
        case '1w':
          from = Math.floor(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).getTime() / 1000);
          break;
        case '1m':
        default:
          from = Math.floor(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).getTime() / 1000);
          break;
      }
      
      // Get the appropriate resolution based on interval
      let resolution;
      switch (interval) {
        case '1d': resolution = '60'; break;
        case '1w': resolution = 'D'; break;
        case '1m': resolution = 'D'; break;
        default: resolution = 'D';
      }
      
      console.log(`Fetching ${symbol} performance from Finnhub: ${interval}, ${resolution}, ${from} to ${to}`);
      
      // Use server-side API to avoid CORS and handle errors better
      const response = await fetch(`/api/finnhub/candles?symbol=${symbol}&resolution=${resolution}&from=${from}&to=${to}`);
      
      if (!response.ok) {
        throw new Error(`API returned ${response.status}: ${await response.text()}`);
      }
      
      const data = await response.json();
      
      // Check if we got valid data
      if (data.s === 'ok' && data.c && data.c.length > 0) {
        // Convert Finnhub format to match Polygon format for consistency
        const results = data.t.map((timestamp: number, index: number) => ({
          t: timestamp * 1000,
          o: data.o[index],
          h: data.h[index],
          l: data.l[index],
          c: data.c[index],
          v: data.v[index]
        }));
        
        const formattedData = {
          ticker: symbol,
          results: results,
          // Add metadata about the source to help debugging
          source: data.source || 'finnhub'
        };
        
        // Cache the result
        try {
          localStorage.setItem(cacheKey, JSON.stringify({
            timestamp: Date.now(),
            data: formattedData
          }));
        } catch (e) {
          console.warn("Failed to cache performance data:", e);
        }
        
        return formattedData;
      }
      
      throw new Error(`No performance data from Finnhub for ${symbol}: ${JSON.stringify(data)}`);
    } catch (error) {
      console.error(`Finnhub performance API error for ${symbol}:`, error);
      // Fall back to mock data
    }
  }
  
  // If all APIs fail or are rate limited, use mock data
  console.log(`All performance APIs failed for ${symbol}, using mock data`);
  
  // Create mock stock performance data
  const now = new Date();
  const results = [];
  
  // Number of data points based on interval
  let numPoints;
  switch (interval) {
    case '1d': numPoints = 24; break;
    case '1w': numPoints = 7; break;
    case '1m': default: numPoints = 30; break;
  }
  
  // Generate a deterministic baseline price based on symbol
  const symbolSum = symbol.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
  const basePrice = 50 + (symbolSum % 200);  // Between $50 and $250
  
  // Create a random walk price pattern with some trend
  const trendDirection = (symbolSum % 3 === 0) ? 1 : (symbolSum % 3 === 1) ? -1 : 0;
  const trendStrength = 0.05 + (symbolSum % 10) / 100;  // 0.05% to 0.15% baseline trend per point
  
  let price = basePrice;
  for (let i = 0; i < numPoints; i++) {
    const timestamp = new Date(now.getTime() - (numPoints - i) * (24 * 60 * 60 * 1000 / numPoints));
    
    // Add some random variation + trend
    const randomChange = (Math.random() - 0.5) * 0.01 * price;  // ±0.5% random variation
    const trendChange = trendDirection * trendStrength * price;
    price += randomChange + trendChange;
    
    // Ensure price stays positive with some min/max guardrails
    price = Math.max(basePrice * 0.7, Math.min(basePrice * 1.3, price));
    
    // Derive other price points from closing price
    const open = price * (1 + (Math.random() - 0.5) * 0.005);
    const high = Math.max(open, price) * (1 + Math.random() * 0.005);
    const low = Math.min(open, price) * (1 - Math.random() * 0.005);
    
    results.push({
      t: timestamp.getTime(),
      o: open,
      h: high,
      l: low,
      c: price,
      v: Math.floor(100000 + Math.random() * 900000)  // Random volume between 100K-1M
    });
  }
  
  const mockData = {
    ticker: symbol,
    results: results,
    source: 'mock'  // Flag that this is mock data
  };
  
  // Cache the mock data too
  try {
    localStorage.setItem(cacheKey, JSON.stringify({
      timestamp: Date.now(),
      data: mockData
    }));
  } catch (e) {
    console.warn("Failed to cache mock performance data:", e);
  }
  
  return mockData;
}

// Mock data for initial development
export const popularStocks = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'TSLA', 'JPM', 'V', 'WMT',
  'NFLX', 'DIS', 'PYPL', 'ADBE', 'INTC', 'CMCSA', 'PEP', 'CSCO', 'AVGO', 'ABT',
  'ACN', 'TXN', 'QCOM', 'COST', 'NKE', 'AMD', 'CHTR', 'TMUS', 'SBUX', 'GILD'
]

export const mockPerformanceData = {
  wins: [193, 128, 71, 158, 67],
  losses: [96, 150, 71, 43, 54],
  draws: [2, 4, 12, 0, 5]
}

// New functions for filtering and detailed data
export function getStockDetails(symbol: string): Promise<any> {
  return Promise.all([
    getStockQuote(symbol),
    getStockPerformance(symbol),
    getStockNews(symbol)
  ])
}

export async function getStockNews(symbol: string): Promise<any> {
  // Try Alpha Vantage first if not rate limited
  if (!API_RATE_LIMITS.alphaVantage.isLimited) {
    try {
      const response = await fetch(
        `https://www.alphavantage.co/query?function=NEWS_SENTIMENT&tickers=${symbol}&apikey=${ALPHA_VANTAGE_API_KEY}`
      );
      const data = await response.json();
      
      // Check if we got a rate limit error
      if (data["Note"] && data["Note"].includes("API call frequency")) {
        handleRateLimitError('alphaVantage', data["Note"]);
        // Continue to fallback
      } else {
        return data;
      }
    } catch (error) {
      console.error("Alpha Vantage news API error:", error);
      // Continue to fallback
    }
  }
  
  // Try Finnhub as fallback if not rate limited
  if (!API_RATE_LIMITS.finnhub.isLimited) {
    try {
      const today = new Date();
      const lastWeek = new Date(today);
      lastWeek.setDate(lastWeek.getDate() - 7);
      
      const fromDate = lastWeek.toISOString().split('T')[0];
      const toDate = today.toISOString().split('T')[0];
      
      const response = await fetch(
        `https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=${fromDate}&to=${toDate}&token=${FINNHUB_API_KEY}`
      );
      
      // Check for Finnhub rate limit (HTTP status 429)
      if (response.status === 429) {
        handleRateLimitError('finnhub', "Rate limit exceeded");
        // All news APIs tried, return mock data
      } else {
        const newsItems = await response.json();
        if (Array.isArray(newsItems) && newsItems.length > 0) {
          // Format to match Alpha Vantage structure
          return {
            feed: newsItems.map((item: any) => ({
              title: item.headline,
              url: item.url,
              time_published: new Date(item.datetime * 1000).toISOString(),
              summary: item.summary,
              source: item.source,
              overall_sentiment_score: Math.random() * 2 - 1,
              overall_sentiment_label: ["Bearish", "Neutral", "Bullish"][Math.floor(Math.random() * 3)]
            }))
          };
        }
      }
    } catch (error) {
      console.error("Finnhub news API error:", error);
    }
  }
  
  // Fallback: generate mock news data
  console.log("All news APIs failed or rate limited, using mock data for", symbol);
  return {
    feed: [
      {
        title: `${symbol} Reports Strong Quarterly Results`,
        url: `https://example.com/news/${symbol.toLowerCase()}/quarterly-results`,
        time_published: new Date().toISOString(),
        summary: `${symbol} exceeded analyst expectations with record revenue growth in the latest quarter.`,
        source: "MockFinancialNews",
        overall_sentiment_score: 0.78,
        overall_sentiment_label: "Bullish"
      },
      {
        title: `Analyst Upgrades ${symbol} to Buy`,
        url: `https://example.com/news/${symbol.toLowerCase()}/analyst-upgrade`,
        time_published: new Date(Date.now() - 86400000).toISOString(),
        summary: `Leading analysts have upgraded ${symbol} citing strong potential for growth in the coming year.`,
        source: "MockMarketWatch",
        overall_sentiment_score: 0.65,
        overall_sentiment_label: "Bullish"
      },
      {
        title: `Market Trends Impact ${symbol}`,
        url: `https://example.com/news/${symbol.toLowerCase()}/market-trends`,
        time_published: new Date(Date.now() - 172800000).toISOString(),
        summary: `Recent market volatility has created both challenges and opportunities for ${symbol}.`,
        source: "MockFinancialTimes",
        overall_sentiment_score: 0.12,
        overall_sentiment_label: "Neutral"
      }
    ]
  };
}

// Mock data for filtering
export const stockTypes = {
  AAPL: 'smart',
  MSFT: 'kol',
  GOOGL: 'smart',
  AMZN: 'sniper',
  META: 'fresh',
  NVDA: 'smart',
  TSLA: 'kol',
  JPM: 'regular',
  V: 'sniper',
  WMT: 'regular'
}

export const mockSocialMetrics = {
  AAPL: { followers: 1234, comments: 45, mentions: 89 },
  MSFT: { followers: 987, comments: 32, mentions: 67 },
  GOOGL: { followers: 1567, comments: 78, mentions: 123 },
  // ... add more mock data for other stocks
}

// Helper function to filter stocks by type
export function filterStocksByType(stocks: any[], type: string): any[] {
  if (type === 'all') return stocks
  return stocks.filter(stock => stockTypes[stock.symbol] === type)
}