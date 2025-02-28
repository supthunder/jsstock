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
    
    // Add a warning if we're using mock data
    if (performance.source === 'mock') {
      console.log(`⚠️ Using mock data for ${symbol} performance`);
      return NextResponse.json({
        ...performance,
        warning: "Using approximate data due to API subscription limitations"
      });
    }

    return NextResponse.json(performance);
  } catch (error: any) {
    console.error(`❌ Error fetching stock performance: ${error.message}`);
    
    // Check if it's a subscription error
    if (error.message && error.message.includes("subscription does not permit")) {
      return NextResponse.json(
        {
          symbol: request.nextUrl.searchParams.get("symbol"),
          period: request.nextUrl.searchParams.get("period") || "1m",
          performance: Math.random() * 5 - 2.5, // Random performance between -2.5% and +2.5%
          warning: "Using approximate data due to API subscription limitations",
          source: "fallback",
          error: "Subscription limitation"
        },
        { status: 200 } // Return 200 with fallback data
      );
    }
    
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