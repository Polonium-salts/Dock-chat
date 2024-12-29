import { PrismaAdapter } from '@auth/prisma-adapter'
import GithubProvider from 'next-auth/providers/github'
import prisma from '@/lib/prisma'

export const authOptions = {
  adapter: PrismaAdapter(prisma),
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
    async session({ session, user }) {
      // 从数据库获取用户的 GitHub 访问令牌
      const dbUser = await prisma.account.findFirst({
        where: {
          userId: user.id,
          provider: 'github'
        }
      })

      // 将访问令牌添加到会话中
      if (dbUser) {
        session.accessToken = dbUser.access_token
        session.user.id = user.id
      }

      return session
    }
  },
  pages: {
    signIn: '/auth/signin'
  }
} 