import NextAuth from 'next-auth'
import GithubProvider from 'next-auth/providers/github'

export const authOptions = {
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET,
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account) {
        token.accessToken = account.access_token
      }
      return token
    },
    async session({ session, token }) {
      if (session?.user) {
        session.user.id = token.sub
        session.accessToken = token.accessToken
      }
      return session
    },
    async signIn({ user, account, profile, email, credentials }) {
      try {
        return true
      } catch (error) {
        console.error('SignIn error:', error)
        return false
      }
    },
  },
  debug: process.env.NODE_ENV !== 'production',
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: '/',
    error: '/',
  },
  logger: {
    error(code, metadata) {
      console.error('Auth error:', { code, metadata })
    },
    warn(code) {
      console.warn('Auth warning:', code)
    },
    debug(code, metadata) {
      console.debug('Auth debug:', { code, metadata })
    }
  }
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST } 