import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Log auth-related requests in development to help debug issues
  if (process.env.NODE_ENV !== 'production' && request.nextUrl.pathname.startsWith('/api/auth')) {
    console.log('Auth request:', {
      url: request.nextUrl.toString(),
      method: request.method,
      headers: Object.fromEntries(request.headers),
    })
  }
  
  return NextResponse.next()
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: ['/api/auth/:path*'],
} 