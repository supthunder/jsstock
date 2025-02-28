import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getStockQuote } from "@/lib/stockApi";

// GET /api/leaderboard - Get users and their portfolio performance for leaderboard
export async function GET(request: NextRequest) {
  try {
    // Get all users with portfolios
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        portfolio: true
      }
    });

    const leaderboardData = await Promise.all(users
      .filter(user => user.portfolio && user.portfolio.length > 0)
      .map(async (user) => {
        // Calculate portfolio metrics
        let totalValue = 0;
        let totalCost = 0;
        let topHolding = '';
        let topHoldingValue = 0;
        
        // Process each position
        const portfolioWithPrices = await Promise.all(
          user.portfolio.map(async (position) => {
            try {
              // Get current price
              const quote = await getStockQuote(position.symbol);
              const currentPrice = quote.price;
              const positionValue = currentPrice * position.quantity;
              const positionCost = position.avgCost * position.quantity;
              
              // Track top holding
              if (positionValue > topHoldingValue) {
                topHolding = position.symbol;
                topHoldingValue = positionValue;
              }
              
              // Add to totals
              totalValue += positionValue;
              totalCost += positionCost;
              
              return {
                ...position,
                currentPrice,
                value: positionValue,
                pnl: positionValue - positionCost,
                pnlPercent: ((currentPrice - position.avgCost) / position.avgCost) * 100
              };
            } catch (error) {
              console.error(`Error getting price for ${position.symbol}:`, error);
              return position;
            }
          })
        );
        
        // Calculate overall performance metrics
        const totalPnl = totalValue - totalCost;
        const totalPnlPercent = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;
        
        // Mock some time-based metrics (would require historical data in a real app)
        // In a real implementation, you would fetch historical performance data
        const pnl1d = Math.random() * 10 - 5; // Random between -5% and 5%
        const pnl7d = Math.random() * 15 - 7.5; // Random between -7.5% and 7.5%
        const pnl30d = Math.random() * 20 - 10; // Random between -10% and 10%
        
        return {
          id: user.id,
          name: user.name || "Anonymous User",
          email: user.email || "",
          image: user.image || "/avatars/default.png",
          totalValue,
          pnl1d,
          pnl1dValue: (pnl1d / 100) * totalValue,
          pnl7d,
          pnl7dValue: (pnl7d / 100) * totalValue,
          pnl30d,
          pnl30dValue: (pnl30d / 100) * totalValue,
          performanceData: [100, 100 + (pnl30d / 2), 100 + pnl30d], // Simplified chart data
          portfolioSize: user.portfolio.length,
          topHolding,
          positions: portfolioWithPrices
        };
      }));

    return NextResponse.json(leaderboardData);
  } catch (error) {
    console.error("Error fetching leaderboard data:", error);
    return NextResponse.json(
      { error: "Failed to fetch leaderboard data" },
      { status: 500 }
    );
  }
} 