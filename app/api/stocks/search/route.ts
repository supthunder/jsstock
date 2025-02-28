import { NextRequest, NextResponse } from "next/server";
import { POLYGON_API_KEY, API_RATE_LIMITS } from "@/lib/utils";
import { popularStocks, searchSymbols } from "@/lib/api";

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

    // Use the enhanced searchSymbols function that tries multiple providers with fallbacks
    try {
      const data = await searchSymbols(query);
      
      // Format the results in a consistent way regardless of which API provided the data
      if (data.bestMatches && data.bestMatches.length > 0) {
        const results = data.bestMatches.map((item: any) => ({
          symbol: item["1. symbol"],
          name: item["2. name"],
          type: item["3. type"].toLowerCase(),
          market: item["4. region"]
        }));
        
        return NextResponse.json(results);
      }
    } catch (error) {
      console.error("Error from search API:", error);
      // Continue to fallback if the enhanced API call fails
    }
    
    // Final fallback to mock data if everything else fails
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