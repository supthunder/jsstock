import { NextRequest, NextResponse } from "next/server";
import { POLYGON_API_KEY, API_RATE_LIMITS } from "@/lib/utils";
import { popularStocks, searchSymbols } from "@/lib/api";

// GET /api/stocks/search?q=apple
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q");

    console.log("Stock search API called with query:", query);

    if (!query) {
      return NextResponse.json(
        { error: "Search query is required" },
        { status: 400 }
      );
    }

    // If query is less than 2 characters, return a limited set of popular stocks
    if (query.length < 2) {
      console.log("Query too short, returning popular stocks");
      const mockResults = popularStocks.slice(0, 5).map(symbol => ({
        symbol,
        name: `${symbol} Stock`,
        type: "stock"
      }));
      return NextResponse.json(mockResults);
    }

    // Try searching with our fallback-enabled function
    try {
      console.log("Calling searchSymbols with query:", query);
      const data = await searchSymbols(query);
      console.log("Search API response:", JSON.stringify(data));
      
      // Format the results in a consistent way regardless of which API provided the data
      if (data && data.bestMatches && Array.isArray(data.bestMatches) && data.bestMatches.length > 0) {
        const results = data.bestMatches.map((item: any) => ({
          symbol: item["1. symbol"],
          name: item["2. name"],
          type: item["3. type"].toLowerCase(),
          market: item["4. region"]
        }));
        
        console.log("Formatted search results:", JSON.stringify(results));
        return NextResponse.json(results);
      } else {
        console.log("No bestMatches found in data, using fallback");
      }
    } catch (error) {
      console.error("Error from search API:", error);
      // Continue to fallback if the enhanced API call fails
    }
    
    // Final fallback to mock data if everything else fails
    console.log("Using final fallback with filtered popularStocks");
    const filteredStocks = popularStocks
      .filter(s => s.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 5)
      .map(symbol => ({
        symbol,
        name: `${symbol} Stock`,
        type: "stock"
      }));
      
    console.log("Fallback results:", JSON.stringify(filteredStocks));
    return NextResponse.json(filteredStocks);
  } catch (error) {
    console.error("Error searching stocks:", error);
    
    // Fallback to mock data if everything fails
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q") || "";
    
    console.log("Error fallback for query:", query);
    const filteredStocks = popularStocks
      .filter(s => s.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 5)
      .map(symbol => ({
        symbol,
        name: `${symbol} Stock`,
        type: "stock"
      }));
      
    console.log("Error fallback results:", JSON.stringify(filteredStocks));
    return NextResponse.json(filteredStocks);
  }
} 