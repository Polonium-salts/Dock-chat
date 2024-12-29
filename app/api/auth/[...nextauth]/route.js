import NextAuth from 'next-auth'
import GithubProvider from 'next-auth/providers/github'

export const authOptions = {
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET,
      authorization: {
        params: {
          scope: 'read:user user:email repo',
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account) {
        token.accessToken = account.access_token
        token.id = profile.id
        token.login = profile.login
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
    },
  },
  pages: {
    signIn: '/',
  },
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST } 