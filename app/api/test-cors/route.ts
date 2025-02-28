import { NextRequest, NextResponse } from 'next/server';
import { FINNHUB_API_KEY } from '@/lib/utils';

export async function GET(request: NextRequest) {
  // Log the request
  console.log("Test CORS endpoint called");
  
  try {
    // Make a direct call to Finnhub API
    const response = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=AAPL&token=${FINNHUB_API_KEY}`
    );
    
    // Check the response
    if (!response.ok) {
      console.error(`Finnhub API returned status: ${response.status}`);
      return NextResponse.json(
        { error: `Finnhub API returned status: ${response.status}` },
        { status: response.status }
      );
    }
    
    // Parse and return the data
    const data = await response.json();
    console.log("Finnhub data:", data);
    
    return NextResponse.json({
      message: "Successfully fetched data from Finnhub API",
      data
    });
  } catch (error) {
    console.error("Error in test-cors endpoint:", error);
    return NextResponse.json(
      { error: "Failed to fetch data from Finnhub API", details: String(error) },
      { status: 500 }
    );
  }
} 