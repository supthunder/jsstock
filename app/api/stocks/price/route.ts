import { NextRequest, NextResponse } from "next/server";
import { getStockQuote } from "@/lib/stockApi";

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
    const date = searchParams.get("date"); // Format: YYYY-MM-DD

    console.log(`💰 Stock price API called for symbol: ${symbol}, date: ${date || 'latest'}`);

    if (!symbol) {
      return NextResponse.json(
        { error: "Symbol parameter is required" },
        { status: 400 }
      );
    }

    // For historical date queries, we would need to implement a separate function
    // that fetches historical data. For now, we'll just handle current prices.
    if (date) {
      console.log(`Historical price requested for ${symbol} on ${date} - this is not fully implemented yet`);
      // TODO: Implement historical price lookup with Alpaca's bars endpoint
      // For now, we'll fall back to current price
    }

    // Get the quote using our cached API
    const quote = await getStockQuote(symbol);

    // Return the price in a consistent format
    return NextResponse.json({
      symbol: quote.symbol,
      close: quote.price,
      open: quote.open,
      high: quote.high,
      low: quote.low,
      volume: quote.volume,
      change: quote.change,
      changePercent: quote.changePercent,
      source: quote.source,
      timestamp: quote.timestamp
    });
  } catch (error: any) {
    console.error(`❌ Error fetching stock price: ${error.message}`);
    
    return NextResponse.json(
      { 
        error: "Failed to fetch stock price", 
        details: error.message,
        symbol: request.nextUrl.searchParams.get("symbol")
      },
      { status: 500 }
    );
  }
} 