import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Heart, MessageCircle, TrendingUp } from "lucide-react"

export function StockCard() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-xl">AAPL</CardTitle>
          <CardDescription>Apple Inc.</CardDescription>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold">$175.04</div>
          <div className="text-sm font-medium text-green-600">+2.34%</div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mt-2 space-y-4">
          <div className="flex items-center justify-between text-sm">
            <div>Volume: 52.3M</div>
            <div>Market Cap: 2.73T</div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm">
                <Heart className="mr-2 h-4 w-4" />
                <span>234</span>
              </Button>
              <Button variant="ghost" size="sm">
                <MessageCircle className="mr-2 h-4 w-4" />
                <span>45</span>
              </Button>
            </div>
            <Button variant="outline" size="sm">
              <TrendingUp className="mr-2 h-4 w-4" />
              View Details
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 