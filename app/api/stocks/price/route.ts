import { NextRequest, NextResponse } from "next/server";
import { POLYGON_API_KEY, API_RATE_LIMITS } from "@/lib/utils";
import { getStockQuote } from "@/lib/api";

// Mock price data for development
const mockPrices = {
  AAPL: { price: 187.32, prevClose: 185.14 },
  MSFT: { price: 417.45, prevClose: 415.56 },
  GOOGL: { price: 142.72, prevClose: 140.99 },
  AMZN: { price: 182.87, prevClose: 180.35 },
  META: { price: 474.03, prevClose: 469.47 },
  NVDA: { price: 834.71, prevClose: 822.79 },
  TSLA: { price: 193.57, prevClose: 197.42 },
  JPM: { price: 198.48, prevClose: 196.62 },
  V: { price: 277.38, prevClose: 275.96 },
  WMT: { price: 59.45, prevClose: 58.68 },
  NFLX: { price: 628.82, prevClose: 624.46 },
  DIS: { price: 114.35, prevClose: 112.85 },
  PYPL: { price: 62.78, prevClose: 63.96 },
  ADBE: { price: 529.15, prevClose: 524.32 },
  INTC: { price: 32.42, prevClose: 31.89 },
  CMCSA: { price: 40.66, prevClose: 39.98 },
  PEP: { price: 171.27, prevClose: 169.82 },
  CSCO: { price: 49.21, prevClose: 48.76 },
  AVGO: { price: 1306.54, prevClose: 1292.87 },
  ABT: { price: 111.78, prevClose: 110.42 },
  ACN: { price: 345.67, prevClose: 342.89 },
  TXN: { price: 168.52, prevClose: 166.74 },
  QCOM: { price: 154.35, prevClose: 152.17 },
  COST: { price: 757.93, prevClose: 752.56 },
  NKE: { price: 92.35, prevClose: 93.78 },
  AMD: { price: 159.82, prevClose: 157.34 },
  CHTR: { price: 289.75, prevClose: 286.54 },
  TMUS: { price: 162.37, prevClose: 160.88 },
  SBUX: { price: 78.93, prevClose: 80.24 },
  GILD: { price: 68.42, prevClose: 67.56 }
};

// GET /api/stocks/price?symbol=AAPL&date=2023-06-01
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const symbol = searchParams.get("symbol");
    const date = searchParams.get("date"); // Optional date parameter in YYYY-MM-DD format

    if (!symbol) {
      return NextResponse.json(
        { error: "Stock symbol is required" },
        { status: 400 }
      );
    }

    // If a historical date is requested, we can't use the enhanced getStockQuote function
    // because it's designed for current quotes
    if (date) {
      // First try Polygon if not rate limited
      if (!API_RATE_LIMITS.polygon.isLimited) {
        try {
          const apiUrl = `https://api.polygon.io/v1/open-close/${symbol}/${date}?adjusted=true&apiKey=${POLYGON_API_KEY}`;
          const response = await fetch(apiUrl);
          const data = await response.json();
          
          // Check if we got a rate limit error
          if (data.status === "ERROR" && data.error?.includes("exceeded the maximum requests")) {
            // Mark polygon as rate limited
            API_RATE_LIMITS.polygon.isLimited = true;
            API_RATE_LIMITS.polygon.resetTime = new Date(Date.now() + 60000); // Reset after 1 minute
            // Fall through to mock data
          } else if (data.open !== undefined) {
            // Format for historical data
            return NextResponse.json({
              symbol,
              date,
              open: data.open,
              high: data.high,
              low: data.low,
              close: data.close,
              volume: data.volume
            });
          }
        } catch (error) {
          console.error("Error fetching historical price from Polygon:", error);
          // Fall through to mock data
        }
      }
      
      // Fall back to mock data for historical prices if API call fails or is rate limited
      if (mockPrices[symbol]) {
        const mockData = mockPrices[symbol];
        
        // Generate a slight variation for historical data
        const variation = (Math.random() - 0.5) * 0.1; // ±5% variation
        const basePrice = mockData.price * (1 + variation);
        
        return NextResponse.json({
          symbol,
          date,
          open: basePrice * 0.99,
          high: basePrice * 1.02,
          low: basePrice * 0.98,
          close: basePrice,
          volume: Math.floor(Math.random() * 10000000) + 1000000
        });
      } else {
        // Generate random mock data for any symbol
        const mockPrice = Math.random() * 500 + 50;
        
        return NextResponse.json({
          symbol,
          date,
          open: mockPrice * 0.99,
          high: mockPrice * 1.02,
          low: mockPrice * 0.98,
          close: mockPrice,
          volume: Math.floor(Math.random() * 10000000) + 1000000
        });
      }
    } else {
      // For current prices, use the enhanced getStockQuote function that handles multiple APIs
      try {
        const data = await getStockQuote(symbol);
        
        if (data.results && data.results.length > 0) {
          const result = data.results[0];
          
          return NextResponse.json({
            symbol,
            date: new Date(result.t).toISOString().split('T')[0],
            open: result.o,
            high: result.h,
            low: result.l,
            close: result.c,
            volume: result.v
          });
        }
      } catch (error) {
        console.error("Error fetching current price:", error);
        // Fall through to return the mock data (although the enhanced function should already handle this)
      }
      
      // This code should rarely be reached since getStockQuote has its own mock data generation
      if (mockPrices[symbol]) {
        const mockData = mockPrices[symbol];
        const currentDate = new Date().toISOString().split('T')[0];
        
        return NextResponse.json({
          symbol,
          date: currentDate,
          open: mockData.prevClose,
          high: mockData.price * 1.02,
          low: mockData.price * 0.98,
          close: mockData.price,
          volume: Math.floor(Math.random() * 10000000) + 1000000
        });
      } else {
        // Generate random data as final fallback
        const mockPrice = Math.random() * 500 + 50;
        const currentDate = new Date().toISOString().split('T')[0];
        
        return NextResponse.json({
          symbol,
          date: currentDate,
          open: mockPrice * 0.99,
          high: mockPrice * 1.02,
          low: mockPrice * 0.98,
          close: mockPrice,
          volume: Math.floor(Math.random() * 10000000) + 1000000
        });
      }
    }
  } catch (error) {
    console.error("Error fetching stock price:", error);
    
    // Get the query parameters for the fallback response
    const searchParams = request.nextUrl.searchParams;
    const symbol = searchParams.get("symbol") || "UNKNOWN";
    const date = searchParams.get("date") || new Date().toISOString().split('T')[0];
    
    // Generate random mock data for any symbol as a fallback
    const mockPrice = Math.random() * 500 + 50;
    
    return NextResponse.json({
      symbol,
      date,
      open: mockPrice * 0.99,
      high: mockPrice * 1.02,
      low: mockPrice * 0.98,
      close: mockPrice,
      volume: Math.floor(Math.random() * 10000000) + 1000000
    });
  }
} 