import { NextRequest, NextResponse } from 'next/server';
import { finnhubServerOnlyAPIs } from '@/lib/api';
import { API_RATE_LIMITS } from '@/lib/utils';

export async function GET(request: NextRequest) {
  // Get parameters from the URL
  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get('symbol');
  const resolution = searchParams.get('resolution') || '5';
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  // Validate required parameters
  if (!symbol || !from || !to) {
    return NextResponse.json(
      { error: 'Missing required parameters: symbol, from, and to are required' },
      { status: 400 }
    );
  }

  try {
    // Call the server-only function to get candle data
    const data = await finnhubServerOnlyAPIs.getCandles(
      symbol,
      resolution,
      parseInt(from),
      parseInt(to)
    );
    
    // Return the data
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching candle data from Finnhub:', error);
    
    // Handle rate limit errors specifically
    if (error.message && error.message.includes('rate limit')) {
      return NextResponse.json(
        { error: 'Finnhub rate limit exceeded. Try again later.' },
        { status: 429 }
      );
    }
    
    // Handle other errors
    return NextResponse.json(
      { error: 'Failed to fetch candle data' },
      { status: 500 }
    );
  }
} 