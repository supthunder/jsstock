"use client"

import { SessionProvider } from "next-auth/react"
import { useEffect } from "react"

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Log authentication-related errors in development
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      const originalError = console.error;
      console.error = (...args) => {
        // Log NextAuth-related errors more prominently
        if (args[0] && typeof args[0] === 'string' && args[0].includes('next-auth')) {
          console.log('%c NextAuth Error:', 'background: #ff0000; color: white; padding: 2px 5px; border-radius: 2px;', ...args);
        }
        return originalError(...args);
      };
      
      return () => {
        console.error = originalError;
      };
    }
  }, []);

  return <SessionProvider>{children}</SessionProvider>
} 