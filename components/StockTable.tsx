"use client"

import { useEffect, useState, useCallback } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Sparklines, SparklinesLine } from 'react-sparklines'
import { getMultipleStockQuotes, getStockPerformance, popularStocks, mockPerformanceData, filterStocksByType, stockTypes, mockSocialMetrics } from '@/lib/api'
import { ArrowUpDown } from 'lucide-react'
import { StockDetailDialog } from "./StockDetailDialog"
import { stockWebSocket } from '@/lib/websocket'
import { useSession } from 'next-auth/react'

interface StockTableProps {
  type?: 'all' | 'stocks' | 'crypto' | 'watchlist'
}

type SortField = 'rank' | 'totalValue' | 'pnl1d' | 'pnl7d' | 'pnl30d' | 'performance'
type SortDirection = 'asc' | 'desc'

// Define the extended user session type
interface ExtendedUser {
  name?: string;
  email?: string;
  image?: string;
  id?: string;
  role?: string;
  watchlist?: string[];
  portfolio?: Array<{
    symbol: string;
    quantity: number;
    avgCost: number;
  }>;
}

// Mock user portfolio performance data
const mockUserPerformance = [
  {
    id: "1",
    name: "John Smith",
    email: "john@example.com",
    image: "/avatars/01.png",
    totalValue: 245780.50,
    pnl1d: 3.2,
    pnl1dValue: 7624.25,
    pnl7d: 5.7,
    pnl7dValue: 13250.48,
    pnl30d: 12.4,
    pnl30dValue: 27120.65,
    performanceData: [120, 132, 101, 134, 90, 170, 180, 160, 150, 185],
    portfolioSize: 8,
    topHolding: "AAPL"
  },
  {
    id: "2",
    name: "Alice Johnson",
    email: "alice@example.com",
    image: "/avatars/02.png",
    totalValue: 189452.75,
    pnl1d: 2.8,
    pnl1dValue: 5176.32,
    pnl7d: 4.2,
    pnl7dValue: 7636.24,
    pnl30d: 9.8,
    pnl30dValue: 16915.78,
    performanceData: [100, 110, 105, 115, 108, 120, 125, 122, 130, 135],
    portfolioSize: 5,
    topHolding: "TSLA"
  },
  {
    id: "3",
    name: "Bob Williams",
    email: "bob@example.com",
    image: "/avatars/03.png",
    totalValue: 321564.80,
    pnl1d: -1.2,
    pnl1dValue: -3890.42,
    pnl7d: 3.5,
    pnl7dValue: 10869.21,
    pnl30d: 8.1,
    pnl30dValue: 24111.47,
    performanceData: [150, 145, 160, 155, 140, 160, 175, 170, 185, 180],
    portfolioSize: 12,
    topHolding: "META"
  },
  {
    id: "4",
    name: "Emma Davis",
    email: "emma@example.com",
    image: "/avatars/04.png",
    totalValue: 178925.60,
    pnl1d: 4.1,
    pnl1dValue: 7035.56,
    pnl7d: 6.8,
    pnl7dValue: 11364.42,
    pnl30d: 15.2,
    pnl30dValue: 23627.58,
    performanceData: [90, 110, 105, 120, 115, 130, 125, 140, 135, 150],
    portfolioSize: 7,
    topHolding: "NVDA"
  },
  {
    id: "5",
    name: "Michael Brown",
    email: "michael@example.com",
    image: "/avatars/05.png",
    totalValue: 432780.25,
    pnl1d: 1.5,
    pnl1dValue: 6405.62,
    pnl7d: 2.9,
    pnl7dValue: 12179.75,
    pnl30d: 7.4,
    pnl30dValue: 29864.04,
    performanceData: [200, 195, 210, 205, 220, 215, 225, 220, 230, 235],
    portfolioSize: 15,
    topHolding: "GOOGL"
  }
];

export function StockTable({ type = 'all' }: StockTableProps) {
  const { data: session } = useSession()
  // Type assertion for the session user
  const user = session?.user as ExtendedUser | undefined
  const [stocks, setStocks] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [sortField, setSortField] = useState<SortField>('totalValue')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [loading, setLoading] = useState(true)
  const [selectedStock, setSelectedStock] = useState<any>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [apiErrors, setApiErrors] = useState<{ [key: string]: string }>({})

  const handleStockUpdate = useCallback((symbol: string, data: any) => {
    setStocks(prevStocks => prevStocks.map(stock => {
      if (stock.symbol === symbol) {
        return {
          ...stock,
          price: data.p,
          todaysChange: data.p - stock.o,
          todaysChangePerc: ((data.p - stock.o) / stock.o) * 100
        }
      }
      return stock
    }))
  }, [])

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log("Fetching stock data...");
        const errors: { [key: string]: string } = {};
        const stocksWithPerformance: any[] = [];
        
        // Get popular stocks data through our server-side API endpoints
        // instead of direct API calls to Finnhub/Polygon
        try {
          // Fetch quotes through server API
          console.log("Fetching quotes for popular stocks...");
          
          // Process stocks in batches to avoid overwhelming the server
          const batchSize = 5;
          
          for (let i = 0; i < popularStocks.length; i += batchSize) {
            const batch = popularStocks.slice(i, i + batchSize);
            console.log(`Processing quotes batch ${Math.floor(i/batchSize) + 1} of ${Math.ceil(popularStocks.length/batchSize)}...`);
            
            // Process this batch in parallel
            await Promise.all(batch.map(async (symbol) => {
              try {
                console.log(`Fetching data for ${symbol}...`);
                
                // Get quote data
                const quoteResponse = await fetch(`/api/stocks/price?symbol=${symbol}`);
                if (!quoteResponse.ok) {
                  errors['Quotes API'] = `Error fetching price for ${symbol}: ${quoteResponse.status}`;
                  console.error(`Error fetching quote for ${symbol}:`, await quoteResponse.text());
                  return;
                }
                
                const quoteData = await quoteResponse.json();
                console.log(`Got quote for ${symbol}:`, quoteData);
                
                // Get performance data
                let performanceData = [];
                let isMockPerformance = false;
                let warningMessage = '';
                
                try {
                  console.log(`Fetching performance for ${symbol}...`);
                  const perfResponse = await fetch(`/api/stocks/performance?symbol=${symbol}&period=1m`);
                  
                  const perfData = await perfResponse.json();
                  
                  // Check if the response contains a warning or has mock source
                  if (perfData.warning || perfData.source === 'mock' || perfData.source === 'fallback') {
                    console.log(`Using approximate data for ${symbol} performance: ${perfData.warning || 'Mock data'}`);
                    isMockPerformance = true;
                    warningMessage = perfData.warning || 'Using approximate data';
                    if (!errors['Performance']) {
                      errors['Performance'] = 'Using approximate data due to API limitations';
                    }
                  }
                  
                  if (perfData.candles && perfData.candles.length > 0) {
                    performanceData = perfData.candles.map((c: any) => c.close);
                    console.log(`Got ${performanceData.length} performance points for ${symbol}`);
                  } 
                  else if (perfData.performance !== undefined) {
                    // Handle single performance value (mock data case)
                    const basePrice = quoteData.price || 100;
                    // Generate a realistic looking sparkline based on the performance percentage
                    performanceData = generateMockPerformanceFromPercent(basePrice, perfData.performance);
                    console.log(`Generated mock performance data for ${symbol} based on ${perfData.performance}% change`);
                  }
                  else {
                    console.warn(`No performance data found for ${symbol}, generating mock data`);
                    performanceData = generateMockPerformance(quoteData.price);
                    isMockPerformance = true;
                  }
                } catch (perfError) {
                  console.error(`Error fetching performance for ${symbol}:`, perfError);
                  performanceData = generateMockPerformance(quoteData.price);
                  isMockPerformance = true;
                  errors['Performance'] = errors['Performance'] || 'API error for some stocks. Using approximate data.';
                }
                
                // Add to stocks array
                const mockIndex = popularStocks.indexOf(symbol) % mockPerformanceData.wins.length;
                stocksWithPerformance.push({
                  symbol,
                  price: quoteData.price,
                  change: quoteData.change,
                  changePercent: quoteData.changePercent,
                  high: quoteData.high,
                  low: quoteData.low,
                  volume: quoteData.volume,
                  performance: performanceData,
                  wins: mockPerformanceData.wins[mockIndex] || 0,
                  losses: mockPerformanceData.losses[mockIndex] || 0,
                  draws: mockPerformanceData.draws[mockIndex] || 0,
                  winRate: (mockPerformanceData.wins[mockIndex] / 
                    (mockPerformanceData.wins[mockIndex] + mockPerformanceData.losses[mockIndex])) * 100,
                  socialMetrics: mockSocialMetrics[symbol] || {
                    followers: Math.floor(Math.random() * 1000),
                    comments: Math.floor(Math.random() * 500),
                    mentions: Math.floor(Math.random() * 300)
                  },
                  isMockData: isMockPerformance,
                  warning: warningMessage
                });
                
              } catch (symbolError) {
                console.error(`Error processing ${symbol}:`, symbolError);
              }
            }));
            
            // Add small delay between batches
            if (i + batchSize < popularStocks.length) {
              await new Promise(resolve => setTimeout(resolve, 500));
            }
          }
          
          console.log(`Processed ${stocksWithPerformance.length} stocks with performance data`);
          setStocks(stocksWithPerformance);
        } catch (stocksError) {
          console.error("Error fetching stocks:", stocksError);
          errors['Stocks API'] = 'Failed to fetch stock data';
          setStocks([]);
        }
        
        // Fetch leaderboard data
        try {
          console.log("Fetching leaderboard data...");
          const leaderboardResponse = await fetch('/api/leaderboard');
          
          if (leaderboardResponse.ok) {
            const leaderboardData = await leaderboardResponse.json();
            console.log("Leaderboard data:", leaderboardData);
            
            // Only use real data if we got some users
            if (Array.isArray(leaderboardData) && leaderboardData.length > 0) {
              setUsers(leaderboardData);
            } else {
              console.log("No real users found, using mock data");
              errors['Leaderboard'] = 'No real user data found. Using mock data.';
              setUsers(mockUserPerformance);
            }
          } else {
            console.error("Failed to fetch leaderboard data:", await leaderboardResponse.text());
            errors['Leaderboard'] = `API error (${leaderboardResponse.status}). Using mock data.`;
            setUsers(mockUserPerformance);
          }
        } catch (leaderboardError) {
          console.error("Error fetching leaderboard data:", leaderboardError);
          errors['Leaderboard'] = 'Failed to fetch data. Using mock data.';
          // Fallback to mock data on error
          setUsers(mockUserPerformance);
        }
        
        // Update API errors state
        setApiErrors(errors);
        setLoading(false);

        // Set up WebSocket subscriptions
        const subscriptions = stocksWithPerformance.map(stock => 
          stockWebSocket.addSymbolSubscriber(stock.symbol, (data) => 
            handleStockUpdate(stock.symbol, data)
          )
        )

        return () => {
          subscriptions.forEach(sub => sub.unsubscribe())
        }
      } catch (error) {
        console.error('Error fetching stock data:', error)
        setLoading(false)
      }
    }

    if (session) {
      fetchData()
    } else {
      // Load mock data even without session for demo purposes
      setUsers(mockUserPerformance);
      setLoading(false)
    }
  }, [type, session, handleStockUpdate])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc') // Default to descending for most financial metrics
    }
  }

  const sortedUsers = [...users].sort((a, b) => {
    const modifier = sortDirection === 'asc' ? 1 : -1
    switch (sortField) {
      case 'totalValue':
        return (a.totalValue - b.totalValue) * modifier
      case 'pnl1d':
        return (a.pnl1d - b.pnl1d) * modifier
      case 'pnl7d':
        return (a.pnl7d - b.pnl7d) * modifier
      case 'pnl30d':
        return (a.pnl30d - b.pnl30d) * modifier
      case 'performance':
        // Calculate performance based on the last value compared to first value in performance data
        const aPerf = a.performanceData[a.performanceData.length - 1] - a.performanceData[0];
        const bPerf = b.performanceData[b.performanceData.length - 1] - b.performanceData[0];
        return (aPerf - bPerf) * modifier;
      default:
        return 0
    }
  });

  // Helper function to get rank badges
  const getRankBadge = (index: number) => {
    if (index === 0) return <Badge className="bg-yellow-500">🏆 1st</Badge>
    if (index === 1) return <Badge className="bg-gray-400">🥈 2nd</Badge>
    if (index === 2) return <Badge className="bg-amber-700">🥉 3rd</Badge>
    return <Badge variant="outline">{index + 1}th</Badge>
  }

  const handleUserClick = (user: any) => {
    // Could handle user profile viewing in future
    console.log("User clicked:", user)
  }

  // Apply additional filters based on the type prop
  let displayedStocks = stocks;
  
  // Filter to only show watchlist stocks if type is 'watchlist'
  if (type === 'watchlist' && user?.watchlist) {
    displayedStocks = displayedStocks.filter(stock => 
      user.watchlist!.includes(stock.symbol)
    );
  }

  // Helper function to generate mock performance data
  function generateMockPerformance(basePrice: number) {
    return Array(10).fill(0).map((_, i) => 
      basePrice * (1 + (Math.random() * 0.2 - 0.1) * (i/10))
    );
  }
  
  // Generate mock performance data based on a known percentage change
  function generateMockPerformanceFromPercent(basePrice: number, percentChange: number) {
    const endPrice = basePrice;
    const startPrice = basePrice / (1 + percentChange / 100);
    const points = 10;
    
    // Create a somewhat realistic curve between start and end price
    return Array(points).fill(0).map((_, i) => {
      const progress = i / (points - 1);
      // Add some randomness to make the line more realistic
      const randomFactor = 1 + (Math.random() * 0.04 - 0.02);
      // Calculate price at this point with a slight curve
      const price = startPrice + (endPrice - startPrice) * Math.pow(progress, 0.8) * randomFactor;
      return price;
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center pb-4">
        <h2 className="text-2xl font-bold">Portfolio Leaderboard</h2>
      </div>
      
      {/* Display API errors if any exist */}
      {Object.keys(apiErrors).length > 0 && (
        <div className="p-4 mb-4 bg-amber-50 border border-amber-200 rounded-md">
          <h3 className="text-amber-800 font-medium mb-2">API Connection Issues</h3>
          <ul className="text-sm text-amber-700 space-y-1 list-disc list-inside">
            {Object.entries(apiErrors).map(([api, error]) => (
              <li key={api}>
                <span className="font-medium">{api}:</span> {error}
              </li>
            ))}
          </ul>
          <p className="text-xs text-amber-600 mt-2">
            The application is continuing with cached or mock data. Some information may not be current.
          </p>
        </div>
      )}
      
      {loading ? (
        <div className="text-center p-8 border rounded-md">
          <h3 className="text-lg font-medium">Loading...</h3>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[80px]">Rank</TableHead>
                <TableHead>Investor</TableHead>
                <TableHead>
                  <Button variant="ghost" size="sm" onClick={() => handleSort('totalValue')}>
                    Portfolio Value
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" size="sm" onClick={() => handleSort('pnl1d')}>
                    1D PNL
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" size="sm" onClick={() => handleSort('pnl7d')}>
                    7D PNL
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" size="sm" onClick={() => handleSort('pnl30d')}>
                    30D PNL
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" size="sm" onClick={() => handleSort('performance')}>
                    Performance
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>Holdings</TableHead>
                <TableHead>Top Position</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedUsers.map((user, index) => (
                <TableRow 
                  key={user.id} 
                  className="hover:bg-muted/50 cursor-pointer"
                  onClick={() => handleUserClick(user)}
                >
                  <TableCell>
                    {getRankBadge(index)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <Avatar className="h-10 w-10 mr-2">
                        <AvatarImage src={user.image} alt={user.name} />
                        <AvatarFallback>{user.name.slice(0, 2)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{user.name}</div>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">${user.totalValue.toLocaleString()}</div>
                  </TableCell>
                  <TableCell>
                    <div className={user.pnl1d >= 0 ? "text-green-500" : "text-red-500"}>
                      {user.pnl1d >= 0 ? "+" : ""}{user.pnl1d}%
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {user.pnl1dValue >= 0 ? "+" : ""}${Math.abs(user.pnl1dValue).toLocaleString()}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className={user.pnl7d >= 0 ? "text-green-500" : "text-red-500"}>
                      {user.pnl7d >= 0 ? "+" : ""}{user.pnl7d}%
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {user.pnl7dValue >= 0 ? "+" : ""}${Math.abs(user.pnl7dValue).toLocaleString()}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className={user.pnl30d >= 0 ? "text-green-500" : "text-red-500"}>
                      {user.pnl30d >= 0 ? "+" : ""}{user.pnl30d}%
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {user.pnl30dValue >= 0 ? "+" : ""}${Math.abs(user.pnl30dValue).toLocaleString()}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="w-[80px] h-[30px]">
                      <Sparklines data={user.performanceData}>
                        <SparklinesLine color={user.performanceData[user.performanceData.length - 1] >= user.performanceData[0] ? "#22c55e" : "#ef4444"} />
                      </Sparklines>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{user.portfolioSize}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{user.topHolding}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <StockDetailDialog 
        stock={selectedStock} 
        open={detailOpen} 
        onOpenChange={setDetailOpen} 
      />
    </div>
  )
} 