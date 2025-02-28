import { NextRequest, NextResponse } from "next/server";
import { getStockPerformance } from "@/lib/stockApi";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const symbol = searchParams.get("symbol");
    const period = searchParams.get("period") || "1m";

    console.log(`📈 Stock performance API called for symbol: ${symbol}, period: ${period}`);

    if (!symbol) {
      return NextResponse.json(
        { error: "Symbol parameter is required" },
        { status: 400 }
      );
    }

    // Validate period
    const validPeriods = ["1d", "1w", "1m", "3m", "1y", "5y"];
    if (!validPeriods.includes(period)) {
      return NextResponse.json(
        { 
          error: "Invalid period parameter", 
          message: `Period must be one of: ${validPeriods.join(", ")}`,
          receivedPeriod: period
        },
        { status: 400 }
      );
    }

    // Get performance data using our cached API
    const performance = await getStockPerformance(symbol, period);

    return NextResponse.json(performance);
  } catch (error: any) {
    console.error(`❌ Error fetching stock performance: ${error.message}`);
    
    return NextResponse.json(
      { 
        error: "Failed to fetch stock performance", 
        details: error.message,
        symbol: request.nextUrl.searchParams.get("symbol"),
        period: request.nextUrl.searchParams.get("period") || "1m"
      },
      { status: 500 }
    );
  }
} 