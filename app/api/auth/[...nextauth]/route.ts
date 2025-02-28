import NextAuth from "next-auth"
import { authOptions } from "./options"

// Create NextAuth handler
const handler = NextAuth(authOptions)

// Export the GET and POST handlers only
export { handler as GET, handler as POST } 