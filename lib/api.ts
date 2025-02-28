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
  const promises = symbols.map(symbol => getStockQuote(symbol))
  return Promise.all(promises)
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
  // Try Polygon first if not rate limited
  if (!API_RATE_LIMITS.polygon.isLimited) {
    try {
      const response = await fetch(
        `https://api.polygon.io/v2/aggs/ticker/${symbol}/range/1/minute/2024-01-01/2024-12-31?adjusted=true&sort=asc&limit=120&apiKey=${POLYGON_API_KEY}`
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
      console.error("Polygon performance API error:", error);
      // Continue to fallback
    }
  }
  
  // For Finnhub, we need to use our Next.js API rather than calling directly
  // because of CORS restrictions
  if (!API_RATE_LIMITS.finnhub.isLimited) {
    try {
      // Get candle data via our API to avoid CORS issues
      const to = Math.floor(Date.now() / 1000);
      const from = to - 86400; // Last 24 hours
      const resolution = interval === '1d' ? '5' : '60'; // Use 5 min for 1d interval, 60 min otherwise
      
      console.log(`Fetching performance data via server API for ${symbol} from=${from} to=${to} resolution=${resolution}`);
      
      // Route through our Next.js API
      const requestUrl = `/api/finnhub/candles?symbol=${encodeURIComponent(symbol)}&resolution=${resolution}&from=${from}&to=${to}`;
      console.log("Requesting URL:", requestUrl);
      
      const response = await fetch(requestUrl);
      
      // Check for HTTP errors and log detailed information
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Server API returned status ${response.status}: ${errorText}`);
        
        if (response.status === 429) {
          handleRateLimitError('finnhub', "Rate limit exceeded");
        }
        
        throw new Error(`API returned ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      console.log("Received data:", data);
      
      // Check for Finnhub specific errors
      if (data.error) {
        console.error("Finnhub API returned error:", data.error);
        throw new Error(data.error);
      }
      
      // Format to match Polygon structure
      if (data.s === 'ok' && Array.isArray(data.t) && data.t.length > 0) {
        const results = [];
        for (let i = 0; i < data.t.length; i++) {
          results.push({
            o: data.o[i],
            h: data.h[i],
            l: data.l[i],
            c: data.c[i],
            v: data.v[i],
            t: data.t[i] * 1000 // Convert seconds to milliseconds
          });
        }
        return { results };
      } else if (data.s === 'no_data') {
        console.warn(`No data available for symbol ${symbol}`);
        // Continue to fallback for mock data
      } else {
        console.error("Invalid data format from Finnhub:", data);
        throw new Error("Invalid data format from Finnhub");
      }
    } catch (error) {
      console.error("Finnhub performance API error:", error);
      // Continue to fallback with mock data
    }
  }
  
  // Fallback: generate mock performance data
  console.log("All performance APIs failed or rate limited, using mock data for", symbol);
  const results = [];
  const basePrice = Math.random() * 500 + 50;
  const now = Date.now();
  
  for (let i = 0; i < 120; i++) {
    const timeOffset = i * 60000; // 1 minute intervals
    const price = basePrice * (1 + (Math.random() - 0.5) * 0.1); // Random fluctuation +/- 5%
    results.push({
      o: price * 0.99,
      h: price * 1.02,
      l: price * 0.98,
      c: price,
      v: Math.floor(Math.random() * 100000) + 10000,
      t: now - (120 - i) * 60000 // Timestamps from past to present
    });
  }
  
  return { results };
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