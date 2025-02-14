import GithubProvider from 'next-auth/providers/github';
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions = {
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_ID || '',
      clientSecret: process.env.GITHUB_SECRET || '',
    }),
    CredentialsProvider({
      name: 'Test Account',
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (credentials.username === 'test' && credentials.password === 'test') {
          return {
            id: '1',
            name: 'Test User',
            email: 'test@example.com',
            image: '/default-avatar.png'
          }
        }
        
        if (credentials.username === 'test2' && credentials.password === 'test2') {
          return {
            id: '2',
            name: 'Test User 2',
            email: 'test2@example.com',
            image: '/default-avatar.png'
          }
        }
        
        return null
      }
    })
  ],
  pages: {
    signIn: '/auth/signin',
  },
  callbacks: {
    async session({ session, token }) {
      return session;
    },
    async jwt({ token, account, profile }) {
      return token;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || 'your-default-secret-key'
}; 