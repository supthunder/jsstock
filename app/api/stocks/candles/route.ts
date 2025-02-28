import { NextRequest, NextResponse } from "next/server";
import { getStockCandles } from "@/lib/stockApi";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const symbol = searchParams.get("symbol");
    const timeframe = searchParams.get("timeframe") || "1D";
    const start = searchParams.get("start") || "";
    const end = searchParams.get("end") || "";
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit") as string, 10) : 100;

    console.log(`📊 Stock candles API called for symbol: ${symbol}, timeframe: ${timeframe}`);

    if (!symbol) {
      return NextResponse.json(
        { error: "Symbol parameter is required" },
        { status: 400 }
      );
    }

    // Validate timeframe
    const validTimeframes = ["1Min", "5Min", "15Min", "30Min", "1H", "1D", "1W", "1M"];
    if (!validTimeframes.includes(timeframe)) {
      return NextResponse.json(
        { 
          error: "Invalid timeframe parameter", 
          message: `Timeframe must be one of: ${validTimeframes.join(", ")}`,
          receivedTimeframe: timeframe
        },
        { status: 400 }
      );
    }

    // Get candles data using our cached API
    const candles = await getStockCandles(symbol, timeframe, start, end, limit);

    return NextResponse.json({
      symbol,
      timeframe,
      start: start || undefined,
      end: end || undefined,
      candles,
      count: candles.length
    });
  } catch (error: any) {
    console.error(`❌ Error fetching stock candles: ${error.message}`);
    
    return NextResponse.json(
      { 
        error: "Failed to fetch stock candles", 
        details: error.message,
        symbol: request.nextUrl.searchParams.get("symbol"),
        timeframe: request.nextUrl.searchParams.get("timeframe") || "1D"
      },
      { status: 500 }
    );
  }
} 