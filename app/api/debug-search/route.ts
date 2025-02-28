import { NextRequest, NextResponse } from "next/server";
import { searchSymbols } from "@/lib/api";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q") || "";
    
    console.log("Debug search API called with query:", query);
    
    // Log all search parameters
    console.log("All search parameters:", 
      Object.fromEntries([...searchParams.entries()])
    );
    
    if (!query) {
      return NextResponse.json({
        status: "error",
        message: "No query parameter (q) provided",
        receivedParams: Object.fromEntries([...searchParams.entries()]),
      });
    }
    
    // Call the searchSymbols function directly
    const result = await searchSymbols(query);
    
    console.log("Search result type:", typeof result);
    console.log("Search result structure:", JSON.stringify(result, null, 2));
    
    // Check result format and transform if needed
    let formattedResults = [];
    
    if (result && result.bestMatches && Array.isArray(result.bestMatches)) {
      formattedResults = result.bestMatches.map((item: any) => ({
        symbol: item["1. symbol"],
        name: item["2. name"],
        type: item["3. type"].toLowerCase(),
        market: item["4. region"]
      }));
    }
    
    return NextResponse.json({
      status: "success",
      query: query,
      rawResult: result,
      formattedResults: formattedResults,
      resultType: typeof result,
      hasMatches: result && result.bestMatches ? "yes" : "no",
      matchesCount: result && result.bestMatches ? result.bestMatches.length : 0
    });
  } catch (error: any) {
    console.error("Debug search error:", error);
    
    return NextResponse.json({
      status: "error",
      message: "Error processing search request",
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined
    }, { status: 500 });
  }
} 