import { NextRequest, NextResponse } from 'next/server';
import { finnhubServerOnlyAPIs } from '@/lib/api';
import { API_RATE_LIMITS, FINNHUB_API_KEY } from '@/lib/utils';
import { getStockCandles } from '@/lib/stockApi';

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
    // Try to use the normalized API first (which uses Alpaca with caching)
    console.log(`Trying to get candles from Alpaca for ${symbol}`);
    try {
      // Convert UNIX timestamps to ISO dates for Alpaca
      const fromDate = new Date(parseInt(from) * 1000).toISOString();
      const toDate = new Date(parseInt(to) * 1000).toISOString();
      
      // Convert resolution to Alpaca timeframe format
      let timeframe;
      switch(resolution) {
        case '1': timeframe = '1Min'; break;
        case '5': timeframe = '5Min'; break;
        case '15': timeframe = '15Min'; break;
        case '30': timeframe = '30Min'; break;
        case '60': timeframe = '1Hour'; break;
        case 'D': case 'd': timeframe = '1Day'; break;
        case 'W': case 'w': timeframe = '1Week'; break;
        case 'M': case 'm': timeframe = '1Month'; break;
        default: timeframe = '5Min';
      }
      
      console.log(`Fetching Alpaca candles for ${symbol} with timeframe=${timeframe}, from=${fromDate}, to=${toDate}`);
      
      // Get candles from Alpaca
      const candles = await getStockCandles(symbol, timeframe, fromDate, toDate, 1000);
      
      // Format to match Finnhub response structure
      const response = {
        s: 'ok',
        t: candles.map(c => new Date(c.timestamp).getTime()/1000), // Convert to UNIX timestamp
        o: candles.map(c => c.open),
        h: candles.map(c => c.high),
        l: candles.map(c => c.low),
        c: candles.map(c => c.close),
        v: candles.map(c => c.volume),
        source: 'alpaca' // Add source for debugging
      };
      
      console.log(`Successfully retrieved ${candles.length} candles for ${symbol} from Alpaca`);
      
      return NextResponse.json(response);
    } catch (alpacaError) {
      console.error('Error fetching from Alpaca:', alpacaError);
      console.log('Falling back to Finnhub...');
      // Fall back to Finnhub
    }
    
    // Make a direct API call to Finnhub as fallback
    const url = `https://finnhub.io/api/v1/stock/candle?symbol=${symbol}&resolution=${resolution}&from=${from}&to=${to}&token=${FINNHUB_API_KEY}`;
    console.log(`Calling Finnhub directly with URL: ${url}`);
    
    const response = await fetch(url);
    
    // Check for HTTP errors
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Finnhub returned non-OK status: ${response.status}, body: ${errorText}`);
      
      // If it's a 403 error, generate mock data
      if (response.status === 403) {
        console.log(`Finnhub returned 403, generating mock candle data for ${symbol}`);
        
        // Generate mock candle data
        const mockCandles = generateMockCandles(symbol, parseInt(from), parseInt(to), resolution);
        
        return NextResponse.json({
          s: 'ok',
          t: mockCandles.t,
          o: mockCandles.o,
          h: mockCandles.h,
          l: mockCandles.l,
          c: mockCandles.c,
          v: mockCandles.v,
          source: 'mock' // Add source for debugging
        });
      }
      
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
      
      // Generate mock candle data as fallback
      console.log(`Generating mock candle data for ${symbol}`);
      const mockCandles = generateMockCandles(symbol, parseInt(from), parseInt(to), resolution);
      
      return NextResponse.json({
        s: 'ok',
        t: mockCandles.t,
        o: mockCandles.o,
        h: mockCandles.h,
        l: mockCandles.l,
        c: mockCandles.c,
        v: mockCandles.v,
        source: 'mock' // Add source for debugging
      });
    }
    
    // Return the successful data
    data.source = 'finnhub'; // Add source for debugging
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching candle data:', error);
    console.error('Error details:', error.message, error.stack);
    
    // Generate mock data as a last resort
    console.log(`Generating mock candle data for ${symbol} as error fallback`);
    const mockCandles = generateMockCandles(symbol, parseInt(from), parseInt(to), resolution);
    
    return NextResponse.json({
      s: 'ok',
      t: mockCandles.t,
      o: mockCandles.o,
      h: mockCandles.h,
      l: mockCandles.l,
      c: mockCandles.c,
      v: mockCandles.v,
      source: 'mock-error', // Add source for debugging
      error_details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}

// Helper function to generate mock candle data
function generateMockCandles(symbol: string, from: number, to: number, resolution: string) {
  // Calculate number of candles based on time range and resolution
  let intervalInSeconds;
  switch(resolution) {
    case '1': intervalInSeconds = 60; break;
    case '5': intervalInSeconds = 5 * 60; break;
    case '15': intervalInSeconds = 15 * 60; break;
    case '30': intervalInSeconds = 30 * 60; break;
    case '60': intervalInSeconds = 60 * 60; break;
    case 'D': case 'd': intervalInSeconds = 24 * 60 * 60; break;
    case 'W': case 'w': intervalInSeconds = 7 * 24 * 60 * 60; break;
    case 'M': case 'm': intervalInSeconds = 30 * 24 * 60 * 60; break;
    default: intervalInSeconds = 5 * 60;
  }
  
  // Calculate expected number of candles (limit to reasonable amount)
  let expectedCandles = Math.min(1000, Math.floor((to - from) / intervalInSeconds));
  
  // Start with a reasonable price based on symbol
  // Use a deterministic method to ensure same symbol always gets same starting price
  const symbolSum = symbol.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  let basePrice = 50 + (symbolSum % 200); // Between $50 and $250
  
  // Create timestamps
  const timestamps = [];
  for (let i = 0; i < expectedCandles; i++) {
    timestamps.push(from + i * intervalInSeconds);
  }
  
  // Create price and volume data with some realistic variation
  const opens = [];
  const highs = [];
  const lows = [];
  const closes = [];
  const volumes = [];
  
  let currentPrice = basePrice;
  
  for (let i = 0; i < expectedCandles; i++) {
    // Add some random walk to the price with 0.5% - 2% variation
    const changePercent = (Math.random() * 1.5 + 0.5) * (Math.random() > 0.5 ? 1 : -1) / 100;
    const open = currentPrice;
    const close = currentPrice * (1 + changePercent);
    
    // Make highs and lows realistic around open/close
    const high = Math.max(open, close) * (1 + Math.random() * 0.01); // Up to 1% higher
    const low = Math.min(open, close) * (1 - Math.random() * 0.01);  // Up to 1% lower
    
    // Generate realistic volume
    const volume = Math.floor(100000 + Math.random() * 900000); // 100K to 1M
    
    opens.push(open);
    highs.push(high);
    lows.push(low);
    closes.push(close);
    volumes.push(volume);
    
    // Set up for next candle
    currentPrice = close;
  }
  
  return {
    t: timestamps,
    o: opens,
    h: highs,
    l: lows,
    c: closes,
    v: volumes
  };
} 