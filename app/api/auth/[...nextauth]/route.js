import NextAuth from 'next-auth'
import GithubProvider from 'next-auth/providers/github'

const handler = NextAuth({
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET,
      authorization: {
        params: {
          scope: 'read:user user:email repo'
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account) {
        token.accessToken = account.access_token
        if (profile) {
          token.login = profile.login
          token.id = profile.id
        }
      }
      return token
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken
      if (token.login) {
        session.user.login = token.login
      }
      if (token.id) {
        session.user.id = token.id
      }
      return session
    }
  },
  pages: {
    signIn: '/',
    error: '/'
  },
  debug: process.env.NODE_ENV === 'development'
})

export { handler as GET, handler as POST } 