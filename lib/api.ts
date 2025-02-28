import { POLYGON_API_KEY, ALPHA_VANTAGE_API_KEY } from './utils'

export interface StockData {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
  volume: number
  marketCap: number
  performance: number[]
  winRate: number
  trades: {
    wins: number
    losses: number
    draws: number
  }
  type: 'smart' | 'fresh' | 'kol' | 'sniper' | 'regular'
  socialMetrics: {
    followers: number
    comments: number
    mentions: number
  }
}

export async function getStockQuote(symbol: string): Promise<any> {
  const response = await fetch(
    `https://api.polygon.io/v2/aggs/ticker/${symbol}/prev?adjusted=true&apiKey=${POLYGON_API_KEY}`
  )
  return response.json()
}

export async function getMultipleStockQuotes(symbols: string[]): Promise<any> {
  const promises = symbols.map(symbol => getStockQuote(symbol))
  return Promise.all(promises)
}

export async function searchSymbols(query: string): Promise<any> {
  const response = await fetch(
    `https://www.alphavantage.co/query?function=SYMBOL_SEARCH&keywords=${query}&apiKey=${ALPHA_VANTAGE_API_KEY}`
  )
  return response.json()
}

export async function getStockPerformance(symbol: string, interval: string = '1d'): Promise<any> {
  const response = await fetch(
    `https://api.polygon.io/v2/aggs/ticker/${symbol}/range/1/minute/2024-01-01/2024-12-31?adjusted=true&sort=asc&limit=120&apiKey=${POLYGON_API_KEY}`
  )
  return response.json()
}

// Mock data for initial development
export const popularStocks = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'TSLA', 'JPM', 'V', 'WMT',
  'NFLX', 'DIS', 'PYPL', 'ADBE', 'INTC', 'CMCSA', 'PEP', 'CSCO', 'AVGO', 'ABT',
  'ACN', 'TXN', 'QCOM', 'COST', 'NKE', 'AMD', 'CHTR', 'TMUS', 'SBUX', 'GILD'
]

export const mockPerformanceData = {
  wins: [193, 128, 71, 158, 67],
  losses: [96, 150, 71, 43, 54],
  draws: [2, 4, 12, 0, 5]
}

// New functions for filtering and detailed data
export function getStockDetails(symbol: string): Promise<any> {
  return Promise.all([
    getStockQuote(symbol),
    getStockPerformance(symbol),
    getStockNews(symbol)
  ])
}

export async function getStockNews(symbol: string): Promise<any> {
  const response = await fetch(
    `https://www.alphavantage.co/query?function=NEWS_SENTIMENT&tickers=${symbol}&apikey=${ALPHA_VANTAGE_API_KEY}`
  )
  return response.json()
}

// Mock data for filtering
export const stockTypes = {
  AAPL: 'smart',
  MSFT: 'kol',
  GOOGL: 'smart',
  AMZN: 'sniper',
  META: 'fresh',
  NVDA: 'smart',
  TSLA: 'kol',
  JPM: 'regular',
  V: 'sniper',
  WMT: 'regular'
}

export const mockSocialMetrics = {
  AAPL: { followers: 1234, comments: 45, mentions: 89 },
  MSFT: { followers: 987, comments: 32, mentions: 67 },
  GOOGL: { followers: 1567, comments: 78, mentions: 123 },
  // ... add more mock data for other stocks
}

// Helper function to filter stocks by type
export function filterStocksByType(stocks: any[], type: string): any[] {
  if (type === 'all') return stocks
  return stocks.filter(stock => stockTypes[stock.symbol] === type)
}