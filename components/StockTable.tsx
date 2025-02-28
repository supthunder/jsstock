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

type SortField = 'rank' | 'pnl1d' | 'pnl7d' | 'pnl30d' | 'winRate'
type SortDirection = 'asc' | 'desc'

export function StockTable({ type = 'all' }: StockTableProps) {
  const { data: session } = useSession()
  const [stocks, setStocks] = useState<any[]>([])
  const [sortField, setSortField] = useState<SortField>('rank')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [selectedStock, setSelectedStock] = useState<any>(null)
  const [detailOpen, setDetailOpen] = useState(false)

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
        const quotesData = await getMultipleStockQuotes(popularStocks)
        const stocksWithPerformance = await Promise.all(
          quotesData.map(async (quote: any, index: number) => {
            const performanceData = await getStockPerformance(popularStocks[index])
            return {
              ...quote,
              performance: performanceData.results?.map((r: any) => r.c) || [],
              wins: mockPerformanceData.wins[index] || 0,
              losses: mockPerformanceData.losses[index] || 0,
              draws: mockPerformanceData.draws[index] || 0,
              winRate: (mockPerformanceData.wins[index] / 
                (mockPerformanceData.wins[index] + mockPerformanceData.losses[index])) * 100,
              socialMetrics: mockSocialMetrics[popularStocks[index]] || {
                followers: 0,
                comments: 0,
                mentions: 0
              }
            }
          })
        )
        setStocks(stocksWithPerformance)
        setLoading(false)

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
    }
  }, [type, session, handleStockUpdate])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const sortedStocks = [...stocks].sort((a, b) => {
    const modifier = sortDirection === 'asc' ? 1 : -1
    switch (sortField) {
      case 'pnl1d':
        return (a.todaysChange - b.todaysChange) * modifier
      case 'winRate':
        return (a.winRate - b.winRate) * modifier
      default:
        return 0
    }
  })

  const filterButtons = [
    { label: 'All', value: 'all' },
    { label: 'Smart Money', value: 'smart' },
    { label: 'Fresh Wallet', value: 'fresh' },
    { label: 'KOL/VC', value: 'kol' },
    { label: 'Sniper', value: 'sniper' },
  ]

  const handleRowClick = (stock: any) => {
    setSelectedStock(stock)
    setDetailOpen(true)
  }

  const filteredStocks = filterStocksByType(sortedStocks, filter)

  // Apply additional filters based on the type prop
  let displayedStocks = filteredStocks;
  
  // Filter to only show watchlist stocks if type is 'watchlist'
  if (type === 'watchlist' && session?.user?.watchlist) {
    displayedStocks = displayedStocks.filter(stock => 
      session.user.watchlist.includes(stock.symbol)
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex space-x-2 pb-4">
        {filterButtons.map((btn) => (
          <Button
            key={btn.value}
            variant={filter === btn.value ? "default" : "outline"}
            onClick={() => setFilter(btn.value)}
            size="sm"
          >
            {btn.label}
          </Button>
        ))}
      </div>
      {session && type === 'watchlist' && displayedStocks.length === 0 ? (
        <div className="text-center p-8 border rounded-md">
          <h3 className="text-lg font-medium">Your watchlist is empty</h3>
          <p className="text-muted-foreground">
            Add stocks to your watchlist to track them here.
          </p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[100px]">
                  <Button variant="ghost" size="sm" onClick={() => handleSort('rank')}>
                    Rank
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>Symbol</TableHead>
                <TableHead>
                  <Button variant="ghost" size="sm" onClick={() => handleSort('pnl1d')}>
                    1D PNL
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>7D PNL</TableHead>
                <TableHead>30D PNL</TableHead>
                <TableHead>
                  <Button variant="ghost" size="sm" onClick={() => handleSort('winRate')}>
                    Win Rate
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>Distribution</TableHead>
                <TableHead>Performance</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Avg Cost</TableHead>
                <TableHead>Last Trade</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center">Loading...</TableCell>
                </TableRow>
              ) : (
                displayedStocks.map((stock, index) => (
                  <TableRow 
                    key={stock.symbol} 
                    className="hover:bg-muted/50 cursor-pointer"
                    onClick={() => handleRowClick(stock)}
                  >
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Avatar className="h-8 w-8 mr-2">
                          <AvatarFallback>{stock.symbol.slice(0, 2)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{stock.symbol}</div>
                          <div className="text-sm text-muted-foreground">{stock.name}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className={stock.todaysChange >= 0 ? "text-green-500" : "text-red-500"}>
                        {stock.todaysChange >= 0 ? "+" : ""}{stock.todaysChangePerc.toFixed(1)}%
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {stock.todaysChange >= 0 ? "+" : ""}${stock.todaysChange.toFixed(2)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-green-500">+5.2%</div>
                      <div className="text-sm text-muted-foreground">+$8,120.8</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-green-500">+6.1%</div>
                      <div className="text-sm text-muted-foreground">+$23.6K</div>
                    </TableCell>
                    <TableCell>{stock.winRate.toFixed(1)}%</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Badge variant="secondary">{stock.wins}</Badge>
                        <Badge variant="destructive">{stock.losses}</Badge>
                        <Badge variant="destructive">{stock.draws}</Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="w-[80px] h-[30px]">
                        <Sparklines data={stock.performance || [5,10,5,20,8,15,12,8,20]}>
                          <SparklinesLine color={stock.todaysChange >= 0 ? "#22c55e" : "#ef4444"} />
                        </Sparklines>
                      </div>
                    </TableCell>
                    <TableCell>2d</TableCell>
                    <TableCell>${(stock.c || 0).toFixed(2)}</TableCell>
                    <TableCell>1h ago</TableCell>
                  </TableRow>
                ))
              )}
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