import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MainNav } from "@/components/MainNav"
import { Search } from "@/components/Search"
import { UserNav } from "@/components/UserNav"
import { StockTable } from "@/components/StockTable"

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center px-4">
          <MainNav className="mx-6" />
          <div className="ml-auto flex items-center space-x-4">
            <Search />
            <UserNav />
          </div>
        </div>
      </div>
      <div className="flex-1 space-y-4 p-4 pt-6">
        <div className="flex flex-col space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Stock Portfolio Leaderboard</h1>
          <p className="text-muted-foreground">
            Track top performing investors and their portfolio performance.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Tabs defaultValue="all" className="w-full">
            <div className="flex items-center justify-between">
              <TabsList className="bg-muted/50">
                <TabsTrigger value="all">All Traders</TabsTrigger>
                <TabsTrigger value="watchlist">My Watchlist</TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="all" className="border-none p-0 outline-none">
              <StockTable />
            </TabsContent>
            <TabsContent value="watchlist" className="border-none p-0 outline-none">
              <StockTable type="watchlist" />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
} 