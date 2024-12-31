import { NextAuthOptions } from 'next-auth'
import GithubProvider from 'next-auth/providers/github'

declare module 'next-auth' {
  interface Session {
    accessToken?: string
    user: {
      id: string
      login: string
      name?: string | null
      email?: string | null
      image?: string | null
    }
  }
}

export const options: NextAuthOptions = {
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_ID as string,
      clientSecret: process.env.GITHUB_SECRET as string,
      authorization: {
        params: {
          scope: 'read:user user:email repo'
        }
      }
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }: any) {
      if (account) {
        token.accessToken = account.access_token
        token.id = profile.id
        token.login = profile.login
      }
      return token
    },
    async session({ session, token }: any) {
      if (session?.user) {
        session.user.id = token.id
        session.user.login = token.login
        session.accessToken = token.accessToken
      }
      return session
    }
  },
  pages: {
    signIn: '/login',
    error: '/error'
  }
} 