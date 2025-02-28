import NextAuth from "next-auth"
import GithubProvider from "next-auth/providers/github"
import GoogleProvider from "next-auth/providers/google"
import CredentialsProvider from "next-auth/providers/credentials"

// Mock users for development and demonstration
const mockUsers = [
  {
    id: "1",
    name: "John Smith",
    email: "john@example.com",
    image: "https://i.pravatar.cc/150?u=john",
    password: "password123",
    role: "admin",
    watchlist: ["AAPL", "MSFT", "GOOGL"],
    portfolio: [
      { symbol: "AAPL", quantity: 10, avgCost: 155.85 },
      { symbol: "MSFT", quantity: 5, avgCost: 325.72 },
      { symbol: "GOOGL", quantity: 2, avgCost: 140.21 },
    ]
  },
  {
    id: "2",
    name: "Alice Johnson",
    email: "alice@example.com",
    image: "https://i.pravatar.cc/150?u=alice",
    password: "password123",
    role: "user",
    watchlist: ["TSLA", "NVDA", "AMZN"],
    portfolio: [
      { symbol: "TSLA", quantity: 3, avgCost: 242.56 },
      { symbol: "AMZN", quantity: 2, avgCost: 178.21 },
    ]
  },
  {
    id: "3",
    name: "Bob Williams",
    email: "bob@example.com",
    image: "https://i.pravatar.cc/150?u=bob",
    password: "password123",
    role: "user",
    watchlist: ["NFLX", "META", "DIS"],
    portfolio: [
      { symbol: "NFLX", quantity: 4, avgCost: 586.75 },
      { symbol: "META", quantity: 8, avgCost: 342.32 },
      { symbol: "DIS", quantity: 12, avgCost: 109.48 },
    ]
  }
]

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        // In a real app, you would look this up in a database
        const user = mockUsers.find(user => user.email === credentials.email)
        
        if (user && user.password === credentials.password) {
          // Any user object returned here will be saved in the JSON Web Token
          const { password, ...userWithoutPassword } = user
          return userWithoutPassword
        }
        
        return null
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
        token.role = user.role
        token.watchlist = user.watchlist
        token.portfolio = user.portfolio
      }
      return token
    },
    async session({ session, token }) {
      return {
        ...session,
        user: {
          ...session.user,
          id: token.id,
          role: token.role,
          watchlist: token.watchlist,
          portfolio: token.portfolio,
        },
      }
    },
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
})

export { handler as GET, handler as POST } 