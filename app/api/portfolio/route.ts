import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";

// GET /api/portfolio - Get user's portfolio
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const portfolio = await prisma.portfolio.findMany({
      where: {
        userId: session.user.id,
      },
    });

    return NextResponse.json(portfolio);
  } catch (error) {
    console.error("Error fetching portfolio:", error);
    return NextResponse.json(
      { error: "Failed to fetch portfolio" },
      { status: 500 }
    );
  }
}

// POST /api/portfolio - Add item to portfolio
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { symbol, quantity, avgCost, purchaseDate } = await request.json();

    if (!symbol || !quantity || !avgCost) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if portfolio item already exists
    const existingItem = await prisma.portfolio.findUnique({
      where: {
        userId_symbol: {
          userId: session.user.id,
          symbol,
        },
      },
    });

    let portfolio;

    if (existingItem) {
      // Update existing position
      portfolio = await prisma.portfolio.update({
        where: {
          id: existingItem.id,
        },
        data: {
          quantity: Number(quantity),
          avgCost: Number(avgCost),
        },
      });
    } else {
      // Create new position
      portfolio = await prisma.portfolio.create({
        data: {
          symbol,
          quantity: Number(quantity),
          avgCost: Number(avgCost),
          userId: session.user.id,
        },
      });
    }

    return NextResponse.json(portfolio);
  } catch (error) {
    console.error("Error adding to portfolio:", error);
    return NextResponse.json(
      { error: "Failed to update portfolio" },
      { status: 500 }
    );
  }
}

// DELETE /api/portfolio - Remove item from portfolio
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { symbol } = await request.json();

    if (!symbol) {
      return NextResponse.json(
        { error: "Symbol is required" },
        { status: 400 }
      );
    }

    await prisma.portfolio.delete({
      where: {
        userId_symbol: {
          userId: session.user.id,
          symbol,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing from portfolio:", error);
    return NextResponse.json(
      { error: "Failed to update portfolio" },
      { status: 500 }
    );
  }
} 