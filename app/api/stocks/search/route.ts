import { NextRequest, NextResponse } from "next/server";
import { searchStocks } from "@/lib/stockApi";

// Sample popular stocks for fallback
const popularStocks = [
  { symbol: "AAPL", name: "Apple Inc.", type: "stock", market: "US", currencySymbol: "$" },
  { symbol: "MSFT", name: "Microsoft Corporation", type: "stock", market: "US", currencySymbol: "$" },
  { symbol: "GOOGL", name: "Alphabet Inc.", type: "stock", market: "US", currencySymbol: "$" },
  { symbol: "AMZN", name: "Amazon.com Inc.", type: "stock", market: "US", currencySymbol: "$" },
  { symbol: "META", name: "Meta Platforms Inc.", type: "stock", market: "US", currencySymbol: "$" },
  { symbol: "TSLA", name: "Tesla Inc.", type: "stock", market: "US", currencySymbol: "$" },
  { symbol: "NVDA", name: "NVIDIA Corporation", type: "stock", market: "US", currencySymbol: "$" },
  { symbol: "JPM", name: "JPMorgan Chase & Co.", type: "stock", market: "US", currencySymbol: "$" },
  { symbol: "V", name: "Visa Inc.", type: "stock", market: "US", currencySymbol: "$" },
  { symbol: "JNJ", name: "Johnson & Johnson", type: "stock", market: "US", currencySymbol: "$" },
];

// GET /api/stocks/search?q=apple
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q");
  
  console.log(`🔍 Stocks search API called with query: ${query}`);
  
  try {
    // If no query or query is too short, return popular stocks
    if (!query || query.length < 2) {
      console.log("Query too short, returning popular stocks");
      return NextResponse.json(popularStocks);
    }
    
    // Use our normalized search function with built-in caching
    const results = await searchStocks(query);
    
    console.log(`📊 Search found ${results.length} results for "${query}"`);
    
    // If no results found, return filtered popular stocks
    if (!results || results.length === 0) {
      console.log("No results found, returning filtered popular stocks");
      const filteredPopular = popularStocks.filter(stock => 
        stock.symbol.toLowerCase().includes(query.toLowerCase()) || 
        stock.name.toLowerCase().includes(query.toLowerCase())
      );
      return NextResponse.json(filteredPopular);
    }
    
    return NextResponse.json(results);
  } catch (error) {
    console.error("❌ Error in stocks search API:", error);
    
    // Fallback to filtered popular stocks on error
    const filteredPopular = popularStocks.filter(stock => 
      stock.symbol.toLowerCase().includes(query?.toLowerCase() || "") || 
      stock.name.toLowerCase().includes(query?.toLowerCase() || "")
    );
    
    if (filteredPopular.length > 0) {
      console.log("Returning filtered popular stocks as fallback");
      return NextResponse.json(filteredPopular);
    }
    
    return NextResponse.json(popularStocks);
  }
} 