import { NextRequest, NextResponse } from 'next/server';
import { finnhubServerOnlyAPIs } from '@/lib/api';
import { API_RATE_LIMITS, FINNHUB_API_KEY } from '@/lib/utils';

export async function GET(request: NextRequest) {
  // Get parameters from the URL
  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get('symbol');
  const resolution = searchParams.get('resolution') || '5';
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  console.log(`Finnhub candles API called with: symbol=${symbol}, resolution=${resolution}, from=${from}, to=${to}`);

  // Validate required parameters
  if (!symbol || !from || !to) {
    return NextResponse.json(
      { error: 'Missing required parameters: symbol, from, and to are required' },
      { status: 400 }
    );
  }

  try {
    // Make a direct API call to Finnhub instead of using the wrapper
    // This helps us debug the exact response from Finnhub
    const url = `https://finnhub.io/api/v1/stock/candle?symbol=${symbol}&resolution=${resolution}&from=${from}&to=${to}&token=${FINNHUB_API_KEY}`;
    console.log(`Calling Finnhub directly with URL: ${url}`);
    
    const response = await fetch(url);
    
    // Check for HTTP errors
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Finnhub returned non-OK status: ${response.status}, body: ${errorText}`);
      
      return NextResponse.json({
        error: `Finnhub API error: Status ${response.status}`,
        details: errorText
      }, { status: response.status });
    }
    
    // Parse the response as JSON
    const data = await response.json();
    console.log(`Finnhub response status: ${data.s || 'no status'}`);
    
    // Check for Finnhub-specific error status
    if (data.s === 'no_data') {
      console.log(`No data returned for symbol: ${symbol}, from: ${from}, to: ${to}`);
      return NextResponse.json({
        error: 'No data available for the specified parameters',
        data: data
      }, { status: 404 });
    }
    
    // Return the successful data
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching candle data from Finnhub:', error);
    console.error('Error details:', error.message, error.stack);
    
    // Return a more detailed error response
    return NextResponse.json({
      error: 'Failed to fetch candle data',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
} 