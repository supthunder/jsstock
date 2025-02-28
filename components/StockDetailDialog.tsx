import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Sparklines, SparklinesLine, SparklinesBars } from 'react-sparklines'

interface StockDetailDialogProps {
  stock: any
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function StockDetailDialog({ stock, open, onOpenChange }: StockDetailDialogProps) {
  if (!stock) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <div className="flex items-center gap-4">
            <Avatar className="h-10 w-10">
              <AvatarFallback>{stock.symbol?.slice(0, 2)}</AvatarFallback>
            </Avatar>
            <div>
              <DialogTitle className="text-2xl">{stock.symbol}</DialogTitle>
              <DialogDescription>{stock.name}</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        <Tabs defaultValue="overview" className="w-full">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="social">Social</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview">
            <div className="grid gap-4 grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Today's Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    <span className={stock.todaysChange >= 0 ? "text-green-500" : "text-red-500"}>
                      {stock.todaysChange >= 0 ? "+" : ""}{stock.todaysChangePerc?.toFixed(2)}%
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    ${stock.c?.toFixed(2)}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Trading Stats</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Win Rate</span>
                      <span className="font-bold">{stock.winRate?.toFixed(1)}%</span>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="secondary">{stock.wins} Wins</Badge>
                      <Badge variant="destructive">{stock.losses} Losses</Badge>
                      <Badge>{stock.draws} Draws</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="mt-4">
              <CardHeader>
                <CardTitle>Price History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[200px]">
                  <Sparklines data={stock.performance || []}>
                    <SparklinesLine color="#22c55e" />
                  </Sparklines>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance">
            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid gap-4 grid-cols-3">
                    <div>
                      <div className="text-sm text-muted-foreground">1D PNL</div>
                      <div className="text-2xl font-bold text-green-500">+${stock.todaysChange?.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">7D PNL</div>
                      <div className="text-2xl font-bold text-green-500">+$8,120.8</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">30D PNL</div>
                      <div className="text-2xl font-bold text-green-500">+$23.6K</div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium mb-2">Volume Distribution</h4>
                    <div className="h-[100px]">
                      <Sparklines data={stock.performance?.slice(-30) || []}>
                        <SparklinesBars style={{ fill: "#22c55e" }} />
                      </Sparklines>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="social">
            <Card>
              <CardHeader>
                <CardTitle>Social Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid gap-4 grid-cols-3">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Following</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">1,234</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Comments</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">45</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Mentions</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">89</div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
} 