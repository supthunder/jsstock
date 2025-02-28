import { NextRequest, NextResponse } from "next/server";
import { POLYGON_API_KEY } from "@/lib/utils";

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

    let apiUrl;
    
    if (date) {
      // Get historical price for the specified date
      apiUrl = `https://api.polygon.io/v1/open-close/${symbol}/${date}?adjusted=true&apiKey=${POLYGON_API_KEY}`;
    } else {
      // Get the latest price
      apiUrl = `https://api.polygon.io/v2/aggs/ticker/${symbol}/prev?adjusted=true&apiKey=${POLYGON_API_KEY}`;
    }

    const response = await fetch(apiUrl);
    const data = await response.json();

    if (date) {
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
    } else {
      // Format for latest data
      if (!data.results || data.results.length === 0) {
        return NextResponse.json(
          { error: "No price data available" },
          { status: 404 }
        );
      }
      
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
    console.error("Error fetching stock price:", error);
    return NextResponse.json(
      { error: "Failed to fetch stock price" },
      { status: 500 }
    );
  }
} 