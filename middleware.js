import { withAuth } from 'next-auth/middleware'

export default withAuth({
  callbacks: {
    authorized: ({ token }) => !!token
  },
})

export const config = {
  matcher: [
    /*
     * 匹配所有路径除了:
     * /api/auth/signin
     * /api/auth/callback
     * /api/auth/signout
     * /_next
     * /favicon.ico
     */
    '/((?!api/auth|_next|favicon.ico).*)',
  ],
} 