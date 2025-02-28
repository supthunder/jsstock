import { prisma } from "./prisma";
import { hash } from "bcryptjs";

export async function seedDemoUsers() {
  // Check if we already have users
  const userCount = await prisma.user.count();
  
  if (userCount > 0) {
    console.log("Database already has users, skipping seed");
    return;
  }
  
  console.log("Seeding demo users...");
  
  try {
    // Create sample users
    const hashedPassword = await hash("password123", 10);
    
    await prisma.user.create({
      data: {
        name: "John Smith",
        email: "john@example.com",
        image: "/avatars/01.png",
        password: hashedPassword,
        role: "admin",
        watchlist: ["AAPL", "MSFT", "GOOGL"],
        portfolio: {
          create: [
            { symbol: "AAPL", quantity: 10, avgCost: 155.85 },
            { symbol: "MSFT", quantity: 5, avgCost: 325.72 },
            { symbol: "GOOGL", quantity: 2, avgCost: 140.21 },
          ]
        }
      }
    });
    
    await prisma.user.create({
      data: {
        name: "Alice Johnson",
        email: "alice@example.com",
        image: "/avatars/02.png",
        password: hashedPassword,
        role: "user",
        watchlist: ["TSLA", "NVDA", "AMZN"],
        portfolio: {
          create: [
            { symbol: "TSLA", quantity: 3, avgCost: 210.76 },
            { symbol: "NVDA", quantity: 8, avgCost: 425.50 },
            { symbol: "AMZN", quantity: 1, avgCost: 178.23 },
          ]
        }
      }
    });
    
    console.log("Demo users created successfully!");
  } catch (error) {
    console.error("Error seeding users:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// If this file is run directly (not imported)
if (require.main === module) {
  seedDemoUsers()
    .then(() => console.log("Seed complete"))
    .catch((e) => console.error(e));
} 