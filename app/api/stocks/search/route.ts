import { NextRequest, NextResponse } from "next/server";
import { POLYGON_API_KEY } from "@/lib/utils";
import { popularStocks } from "@/lib/api";

// GET /api/stocks/search?q=apple
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q");

    if (!query) {
      return NextResponse.json(
        { error: "Search query is required" },
        { status: 400 }
      );
    }

    // If query is less than 2 characters, return a limited set of popular stocks
    if (query.length < 2) {
      const mockResults = popularStocks.slice(0, 5).map(symbol => ({
        symbol,
        name: `${symbol} Stock`,
        type: "stock"
      }));
      return NextResponse.json(mockResults);
    }

    // Try the Polygon API first now that we have a valid key
    try {
      const response = await fetch(
        `https://api.polygon.io/v3/reference/tickers?search=${encodeURIComponent(query)}&active=true&sort=ticker&order=asc&limit=10&apiKey=${POLYGON_API_KEY}`
      );

      const data = await response.json();

      if (data.results && data.results.length > 0) {
        // Map the results to a simpler format
        const results = data.results.map((item: any) => ({
          symbol: item.ticker,
          name: item.name,
          type: item.type.toLowerCase(),
          market: item.market,
          currencySymbol: "$" // Default to USD
        }));

        return NextResponse.json(results);
      }
    } catch (apiError) {
      console.warn("Polygon API error, falling back to mock data:", apiError);
      // Continue to fallback if API fails
    }

    // Fall back to mock data if API call fails or returns no results
    const filteredStocks = popularStocks
      .filter(s => s.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 5)
      .map(symbol => ({
        symbol,
        name: `${symbol} Stock`,
        type: "stock"
      }));
    
    return NextResponse.json(filteredStocks);
  } catch (error) {
    console.error("Error searching stocks:", error);
    
    // Fallback to mock data if everything fails
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q") || "";
    
    const filteredStocks = popularStocks
      .filter(s => s.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 5)
      .map(symbol => ({
        symbol,
        name: `${symbol} Stock`,
        type: "stock"
      }));
      
    return NextResponse.json(filteredStocks);
  }
} 