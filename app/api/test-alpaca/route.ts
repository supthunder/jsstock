import { NextRequest, NextResponse } from "next/server";
import { 
  ALPACA_API_KEY, 
  ALPACA_API_SECRET, 
  ALPACA_BASE_URL,
  ALPACA_DATA_URL,
  getAlpacaHeaders,
  handleResponse
} from "@/lib/alpaca";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const endpoint = searchParams.get("endpoint") || "account";
  const symbol = searchParams.get("symbol") || "AAPL";
  
  console.log(`🧪 Testing Alpaca API: ${endpoint} for symbol ${symbol}`);
  
  try {
    let url = "";
    let response;
    let data;
    
    // Test different Alpaca endpoints
    switch (endpoint) {
      case "account":
        url = `${ALPACA_BASE_URL}/account`;
        console.log("Testing account endpoint:", url);
        response = await fetch(url, { headers: getAlpacaHeaders() });
        data = await handleResponse(response);
        break;
        
      case "assets":
        url = `${ALPACA_BASE_URL}/assets?status=active&asset_class=us_equity`;
        console.log("Testing assets endpoint:", url);
        response = await fetch(url, { headers: getAlpacaHeaders() });
        data = await handleResponse(response);
        data = data.slice(0, 10); // Just return the first 10 for brevity
        break;
        
      case "quote":
        url = `${ALPACA_DATA_URL}/stocks/${symbol}/quotes/latest`;
        console.log("Testing quote endpoint:", url);
        response = await fetch(url, { headers: getAlpacaHeaders() });
        data = await handleResponse(response);
        break;
        
      case "bars":
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 7);
        
        url = `${ALPACA_DATA_URL}/stocks/${symbol}/bars?timeframe=1D&start=${yesterday.toISOString()}&limit=5`;
        console.log("Testing bars endpoint:", url);
        response = await fetch(url, { headers: getAlpacaHeaders() });
        data = await handleResponse(response);
        break;
        
      default:
        return NextResponse.json({
          error: "Invalid endpoint parameter",
          message: "Endpoint must be one of: account, assets, quote, bars",
          receivedEndpoint: endpoint
        }, { status: 400 });
    }
    
    return NextResponse.json({
      status: "success",
      endpoint,
      symbol: symbol || undefined,
      data,
      requestUrl: url
    });
  } catch (error: any) {
    console.error(`❌ Alpaca API test error:`, error);
    
    return NextResponse.json({
      status: "error",
      message: "Error testing Alpaca API",
      error: error.message,
      endpoint,
      symbol: symbol || undefined
    }, { status: error.status || 500 });
  }
} 