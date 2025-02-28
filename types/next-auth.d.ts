import NextAuth, { DefaultSession } from "next-auth"
import { JWT } from "next-auth/jwt"

type Portfolio = {
  symbol: string;
  quantity: number;
  avgCost: number;
}

declare module "next-auth" {
  /**
   * Extending the built-in User type
   */
  interface User {
    id: string;
    role: string;
    watchlist: string[];
    portfolio: Portfolio[];
  }

  /**
   * Extending the built-in session
   */
  interface Session {
    user: {
      id: string;
      role: string;
      watchlist: string[];
      portfolio: Portfolio[];
    } & DefaultSession["user"]
  }
}

declare module "next-auth/jwt" {
  /**
   * Extending the built-in JWT type
   */
  interface JWT {
    id: string;
    role: string;
    watchlist: string[];
    portfolio: Portfolio[];
  }
} 