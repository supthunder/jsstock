import { NextRequest, NextResponse } from 'next/server';
import { FINNHUB_API_KEY } from '@/lib/utils';

// Helper function to format dates for logging
function formatDate(timestamp: number) {
  return new Date(timestamp * 1000).toISOString();
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get('symbol') || 'AAPL';
  const endpoint = searchParams.get('endpoint') || 'quote';

  console.log(`Test Finnhub API: ${endpoint} for ${symbol}`);

  try {
    let url = '';
    let data: any = null;

    // Test different Finnhub endpoints
    switch (endpoint) {
      case 'quote':
        url = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`;
        break;
        
      case 'candles':
        const to = Math.floor(Date.now() / 1000);
        const from = to - 86400; // 24 hours ago
        const resolution = searchParams.get('resolution') || '5';
        
        console.log(`Candle params: from=${formatDate(from)} to=${formatDate(to)} resolution=${resolution}`);
        url = `https://finnhub.io/api/v1/stock/candle?symbol=${symbol}&resolution=${resolution}&from=${from}&to=${to}&token=${FINNHUB_API_KEY}`;
        break;
        
      case 'search':
        const query = searchParams.get('q') || symbol;
        url = `https://finnhub.io/api/v1/search?q=${query}&token=${FINNHUB_API_KEY}`;
        break;
        
      default:
        return NextResponse.json({ error: 'Invalid endpoint specified' }, { status: 400 });
    }
    
    console.log(`Calling Finnhub API: ${url}`);
    const startTime = Date.now();
    const response = await fetch(url);
    const endTime = Date.now();
    
    console.log(`Finnhub response time: ${endTime - startTime}ms, status: ${response.status}`);
    
    if (!response.ok) {
      const errorBody = await response.text();
      return NextResponse.json({
        error: `Finnhub API returned error ${response.status}`,
        url: url.replace(FINNHUB_API_KEY, 'API_KEY_REDACTED'),
        responseText: errorBody,
        headers: Object.fromEntries(response.headers.entries())
      }, { status: response.status });
    }
    
    data = await response.json();
    
    // Process and log the data based on endpoint
    if (endpoint === 'candles') {
      if (data.s === 'ok') {
        console.log(`Retrieved ${data.t.length} candles for ${symbol}`);
        // Add a sample of the data for easier debugging
        const sampleSize = Math.min(3, data.t.length);
        const sampleData = [];
        
        for (let i = 0; i < sampleSize; i++) {
          sampleData.push({
            timestamp: formatDate(data.t[i]),
            open: data.o[i],
            high: data.h[i],
            low: data.l[i],
            close: data.c[i],
            volume: data.v[i]
          });
        }
        
        return NextResponse.json({
          status: 'success',
          dataStatus: data.s,
          message: `Retrieved ${data.t.length} candles for ${symbol}`,
          sampleData,
          fullData: data
        });
      } else {
        return NextResponse.json({
          status: 'error',
          dataStatus: data.s,
          message: 'Finnhub returned no data or an error',
          data
        });
      }
    } else {
      return NextResponse.json({
        status: 'success',
        message: `Retrieved ${endpoint} data for ${symbol}`,
        data
      });
    }
  } catch (error: any) {
    console.error('Error testing Finnhub API:', error);
    
    return NextResponse.json({
      status: 'error',
      message: 'Exception occurred while testing Finnhub API',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
} 