import NextAuth from "next-auth"
import GithubProvider from "next-auth/providers/github"
import GoogleProvider from "next-auth/providers/google"
import CredentialsProvider from "next-auth/providers/credentials"

// Mock users for development and demonstration
let mockUsers = [
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
      { symbol: "TSLA", quantity: 3, avgCost: 210.76 },
      { symbol: "NVDA", quantity: 8, avgCost: 425.50 },
      { symbol: "AMZN", quantity: 1, avgCost: 178.23 },
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
        password: { label: "Password", type: "password" },
        name: { label: "Name", type: "text" },
        action: { label: "Action", type: "text" } // 'signin' or 'signup'
      },
      async authorize(credentials) {
        try {
          if (!credentials) {
            return null
          }
          
          const { email, password, name, action } = credentials

          // Registration flow
          if (action === 'signup' && name) {
            // Check if user already exists
            const existingUser = mockUsers.find(user => user.email === email)
            if (existingUser) {
              throw new Error("User already exists")
            }
            
            // In a real application, you would create a user in the database
            // For this demo, we'll add to our mockUsers array
            const newUser = {
              id: String(mockUsers.length + 1),
              name,
              email,
              password,
              image: `https://i.pravatar.cc/150?u=${name.split(' ')[0].toLowerCase()}`,
              role: "user",
              watchlist: [],
              portfolio: []
            }
            
            mockUsers.push(newUser)
            return newUser
          }
          
          // Regular sign in flow
          const user = mockUsers.find(user => user.email === email)
          
          if (user && user.password === password) {
            return user
          }
          
          return null
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