"use client"

import { useState, useEffect, useRef } from "react"
import { useSession } from "next-auth/react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Calendar as CalendarIcon, Plus, X, Search } from "lucide-react"
import { format } from "date-fns"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { 
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Calendar } from "@/components/ui/calendar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"

interface PortfolioDialogProps {
  children?: React.ReactNode
  trigger?: React.ReactNode
}

type StockItem = {
  symbol: string
  name: string
  type: string
  market?: string
  currencySymbol?: string
}

type PortfolioItem = {
  id: string
  symbol: string
  quantity: number
  avgCost: number
  currentPrice?: number
  currentValue?: number
  profitLoss?: number
  profitLossPercent?: number
}

export function PortfolioDialog({ children, trigger }: PortfolioDialogProps) {
  const { data: session } = useSession()
  const router = useRouter()
  
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState("holdings")
  
  // New position state
  const [symbol, setSymbol] = useState("")
  const [stockName, setStockName] = useState("")
  const [quantity, setQuantity] = useState("")
  const [avgCost, setAvgCost] = useState("")
  const [date, setDate] = useState<Date>()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  
  // Search state
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<StockItem[]>([])
  const [searchOpen, setSearchOpen] = useState(false)
  const [currentPrice, setCurrentPrice] = useState<number | null>(null)
  
  // Portfolio state
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([])
  const [portfolioLoading, setPortfolioLoading] = useState(true)
  
  // Load portfolio data when dialog opens
  useEffect(() => {
    if (open && session?.user) {
      fetchPortfolio()
    }
  }, [open, session])
  
  // Search for stocks as user types
  useEffect(() => {
    const searchStocks = async () => {
      if (searchQuery.length < 2) {
        setSearchResults([])
        return
      }
      
      try {
        const response = await fetch(`/api/stocks/search?q=${encodeURIComponent(searchQuery)}`)
        const data = await response.json()
        setSearchResults(data)
      } catch (error) {
        console.error("Error searching stocks:", error)
      }
    }
    
    const timer = setTimeout(searchStocks, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])
  
  // Fetch portfolio data
  const fetchPortfolio = async () => {
    try {
      setPortfolioLoading(true)
      const response = await fetch('/api/portfolio')
      const data = await response.json()
      
      // Get current prices for each symbol
      const portfolioWithPrices = await Promise.all(
        data.map(async (item: PortfolioItem) => {
          try {
            const priceResponse = await fetch(`/api/stocks/price?symbol=${item.symbol}`)
            const priceData = await priceResponse.json()
            
            const currentPrice = priceData.close || 0
            const currentValue = currentPrice * item.quantity
            const profitLoss = currentValue - (item.avgCost * item.quantity)
            const profitLossPercent = item.avgCost > 0 
              ? ((currentPrice - item.avgCost) / item.avgCost) * 100 
              : 0
            
            return {
              ...item,
              currentPrice,
              currentValue,
              profitLoss,
              profitLossPercent
            }
          } catch (error) {
            console.error(`Error fetching price for ${item.symbol}:`, error)
            return item
          }
        })
      )
      
      setPortfolio(portfolioWithPrices)
    } catch (error) {
      console.error("Error fetching portfolio:", error)
    } finally {
      setPortfolioLoading(false)
    }
  }
  
  // Handle selecting a stock from search results
  const handleSelectStock = async (stock: StockItem) => {
    setSymbol(stock.symbol)
    setStockName(stock.name)
    setSearchOpen(false)
    
    // Get current price
    try {
      const response = await fetch(`/api/stocks/price?symbol=${stock.symbol}`)
      const data = await response.json()
      setCurrentPrice(data.close)
      
      // If no purchase price set yet, use current price
      if (!avgCost) {
        setAvgCost(data.close.toString())
      }
    } catch (error) {
      console.error("Error fetching stock price:", error)
    }
  }
  
  // Update price based on selected date
  const handleDateChange = async (date: Date | undefined) => {
    setDate(date)
    
    if (!date || !symbol) return
    
    try {
      const formattedDate = format(date, "yyyy-MM-dd")
      const response = await fetch(`/api/stocks/price?symbol=${symbol}&date=${formattedDate}`)
      const data = await response.json()
      
      if (data.close) {
        setAvgCost(data.close.toString())
      }
    } catch (error) {
      console.error("Error fetching historical price:", error)
    }
  }
  
  // Add position to portfolio
  const handleAddPosition = async () => {
    if (!symbol || !quantity || !avgCost) {
      setError("Please fill in all fields")
      return
    }
    
    try {
      setLoading(true)
      setError("")
      
      const response = await fetch('/api/portfolio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          symbol,
          quantity: parseFloat(quantity),
          avgCost: parseFloat(avgCost),
          purchaseDate: date ? format(date, "yyyy-MM-dd") : undefined
        })
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to add position")
      }
      
      // Reset form and refresh portfolio
      setSymbol("")
      setStockName("")
      setQuantity("")
      setAvgCost("")
      setDate(undefined)
      setCurrentPrice(null)
      
      await fetchPortfolio()
      setTab("holdings")
    } catch (error: any) {
      setError(error.message || "An error occurred")
    } finally {
      setLoading(false)
    }
  }
  
  // Remove position from portfolio
  const handleRemovePosition = async (symbol: string) => {
    try {
      const response = await fetch('/api/portfolio', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ symbol })
      })
      
      if (!response.ok) {
        throw new Error("Failed to remove position")
      }
      
      await fetchPortfolio()
    } catch (error) {
      console.error("Error removing position:", error)
    }
  }
  
  // Calculate total portfolio value
  const calculateTotalValue = () => {
    return portfolio.reduce((total, item) => {
      return total + (item.currentValue || 0)
    }, 0)
  }
  
  // Calculate total profit/loss
  const calculateTotalProfitLoss = () => {
    return portfolio.reduce((total, item) => {
      return total + (item.profitLoss || 0)
    }, 0)
  }
  
  if (!session) {
    return null
  }
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button variant="ghost">Profile</Button>
        </DialogTrigger>
      )}
      
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Portfolio Management</DialogTitle>
          <DialogDescription>
            Manage your stock portfolio and track your investments
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={tab} onValueChange={setTab} className="mt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="holdings">My Holdings</TabsTrigger>
            <TabsTrigger value="add">Add Position</TabsTrigger>
          </TabsList>
          
          <TabsContent value="holdings" className="space-y-4 pt-4">
            {portfolioLoading ? (
              <div className="text-center p-6">Loading portfolio data...</div>
            ) : portfolio.length === 0 ? (
              <div className="text-center p-6">
                <p className="text-muted-foreground">You don't have any positions yet.</p>
                <Button onClick={() => setTab("add")} className="mt-4">
                  Add your first position
                </Button>
              </div>
            ) : (
              <>
                <div className="flex justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">Total Value</h3>
                    <p className="text-2xl">${calculateTotalValue().toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Total P/L</h3>
                    <p className={cn(
                      "text-2xl",
                      calculateTotalProfitLoss() >= 0 ? "text-green-600" : "text-red-600"
                    )}>
                      {calculateTotalProfitLoss() >= 0 ? "+" : ""}
                      ${Math.abs(calculateTotalProfitLoss()).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
                
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Symbol</TableHead>
                      <TableHead>Shares</TableHead>
                      <TableHead>Avg Cost</TableHead>
                      <TableHead>Current</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>P/L</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {portfolio.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.symbol}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>${item.avgCost.toFixed(2)}</TableCell>
                        <TableCell>${item.currentPrice?.toFixed(2) || "N/A"}</TableCell>
                        <TableCell>${item.currentValue?.toFixed(2) || "N/A"}</TableCell>
                        <TableCell className={cn(
                          (item.profitLoss || 0) >= 0 ? "text-green-600" : "text-red-600"
                        )}>
                          {(item.profitLoss || 0) >= 0 ? "+" : ""}
                          ${Math.abs(item.profitLoss || 0).toFixed(2)} 
                          ({(item.profitLossPercent || 0) >= 0 ? "+" : ""}
                          {(item.profitLossPercent || 0).toFixed(2)}%)
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleRemovePosition(item.symbol)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </>
            )}
          </TabsContent>
          
          <TabsContent value="add" className="space-y-4 pt-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="symbol">Stock Symbol</Label>
                <Popover open={searchOpen} onOpenChange={setSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={searchOpen}
                      className="w-full justify-between"
                    >
                      {symbol ? `${symbol} - ${stockName}` : "Search for a stock..."}
                      <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0">
                    <Command>
                      <CommandInput 
                        placeholder="Search for a stock..." 
                        value={searchQuery}
                        onValueChange={setSearchQuery}
                      />
                      <CommandList>
                        <CommandEmpty>No results found.</CommandEmpty>
                        <CommandGroup>
                          {searchResults.map((stock) => (
                            <CommandItem
                              key={stock.symbol}
                              onSelect={() => handleSelectStock(stock)}
                            >
                              <span className="font-medium">{stock.symbol}</span>
                              <span className="ml-2 text-muted-foreground">{stock.name}</span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    placeholder="Number of shares"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    type="number"
                    min="0"
                    step="0.01"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="avgCost">Average Cost Per Share</Label>
                  <Input
                    id="avgCost"
                    placeholder="Price per share"
                    value={avgCost}
                    onChange={(e) => setAvgCost(e.target.value)}
                    type="number"
                    min="0"
                    step="0.01"
                    prefix="$"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Purchase Date (Optional)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-between"
                    >
                      {date ? format(date, "PPP") : "Select purchase date"}
                      <CalendarIcon className="ml-2 h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={handleDateChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              {currentPrice && (
                <div className="text-sm text-muted-foreground">
                  Current price: ${currentPrice.toFixed(2)}
                </div>
              )}
              
              {error && (
                <div className="text-sm text-red-500">{error}</div>
              )}
            </div>
          </TabsContent>
        </Tabs>
        
        <DialogFooter>
          {tab === "add" && (
            <Button onClick={handleAddPosition} disabled={loading}>
              {loading ? "Adding..." : "Add to Portfolio"}
            </Button>
          )}
          
          {tab === "holdings" && (
            <Button onClick={() => setTab("add")}>
              <Plus className="mr-2 h-4 w-4" />
              Add Position
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 