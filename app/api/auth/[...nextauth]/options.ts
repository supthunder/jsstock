import GithubProvider from "next-auth/providers/github"
import GoogleProvider from "next-auth/providers/google"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import { compare, hash } from "bcryptjs"
import type { NextAuthOptions } from "next-auth"
import type { Adapter } from "next-auth/adapters"

// Seed initial users (only in development)
const seedInitialUsers = async () => {
  // Only seed if the database is empty
  const userCount = await prisma.user.count();
  
  if (userCount === 0) {
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
      
      console.log("Created demo users");
    } catch (error) {
      console.error("Error seeding users:", error);
    }
  }
};

// Try to seed initial users (won't run in production)
if (process.env.NODE_ENV !== 'production') {
  seedInitialUsers();
}

// Determine if we're running in a Vercel deployment
const isVercelDeployment = process.env.VERCEL === '1' || Boolean(process.env.VERCEL_URL);
const forceProduction = isVercelDeployment || process.env.NODE_ENV === 'production';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as Adapter,
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        name: { label: "Name", type: "text" },
        action: { label: "Action", type: "text" } // 'signin' or 'signup'
      },
      async authorize(credentials, req) {
        try {
          if (!credentials) {
            return null
          }
          
          const { email, password, name, action } = credentials

          // Registration flow
          if (action === 'signup' && name) {
            // Check if user already exists
            const existingUser = await prisma.user.findUnique({
              where: { email }
            });
            
            if (existingUser) {
              throw new Error("User already exists")
            }
            
            // Create user in the database
            const hashedPassword = await hash(password, 10);
            
            const newUser = await prisma.user.create({
              data: {
                name,
                email,
                password: hashedPassword,
                image: `/avatars/0${Math.floor(Math.random() * 5) + 1}.png`,
                role: "user",
                watchlist: []
              }
            });
            
            // Return user without portfolio initially
            return {
              id: newUser.id,
              name: newUser.name,
              email: newUser.email,
              image: newUser.image,
              role: newUser.role,
              watchlist: newUser.watchlist
            }
          }
          
          // Regular sign in flow
          const user = await prisma.user.findUnique({
            where: { email },
            include: {
              portfolio: true
            }
          });
          
          if (!user) {
            return null;
          }
          
          // For demo accounts, allow simple password check
          if (email.endsWith('@example.com') && password === 'password123') {
            return user;
          }
          
          // For regular accounts, verify hashed password
          if (user.password) {
            const isValidPassword = await compare(password, user.password);
            if (isValidPassword) {
              return user;
            }
          }
          
          return null;
        } catch (error) {
          console.error("Auth error:", error)
          return null
        }
      }
    }),
    GithubProvider({
      clientId: process.env.GITHUB_ID || "",
      clientSecret: process.env.GITHUB_SECRET || "",
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
  ],
  pages: {
    signIn: '/auth/signin',
    signOut: '/auth/signout',
    error: '/auth/error',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role as string
        
        // Get user data from database
        if (user.id) {
          const userData = await prisma.user.findUnique({
            where: { id: user.id },
            include: {
              portfolio: true
            }
          });
          
          if (userData) {
            token.watchlist = userData.watchlist;
            token.portfolio = userData.portfolio;
          }
        }
      }
      return token
    },
    async session({ session, token }) {
      return {
        ...session,
        user: {
          ...session.user,
          id: token.id as string,
          role: token.role as string,
          watchlist: token.watchlist as string[],
          portfolio: token.portfolio as any[],
        },
      }
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "none",
        path: "/",
        secure: true
      }
    },
    callbackUrl: {
      name: `next-auth.callback-url`,
      options: {
        sameSite: "none",
        path: "/",
        secure: true
      }
    },
    csrfToken: {
      name: `next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: "none",
        path: "/",
        secure: true
      }
    }
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV !== 'production',
} 