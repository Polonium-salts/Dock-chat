import NextAuth from 'next-auth';
import GithubProvider from 'next-auth/providers/github';
import CredentialsProvider from 'next-auth/providers/credentials';

export const authOptions = {
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET,
    }),
    CredentialsProvider({
      name: 'Test Account',
      credentials: {
        username: { label: "Username", type: "text", placeholder: "test" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        // 这里我们硬编码一个测试账户
        if (credentials.username === "test" && credentials.password === "test123") {
          return {
            id: "1",
            name: "Test User",
            email: "test@example.com",
            image: "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y",
            username: "testuser"
          };
        }
        return null;
      }
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, account, profile, user }) {
      if (account) {
        token.accessToken = account.access_token;
        token.provider = account.provider;
      }
      if (profile) {
        token.username = profile.login;
      }
      if (user) {
        token.username = user.username;
      }
      return token;
    },
    async session({ session, token }) {
      if (session?.user) {
        session.user.id = token.sub;
        session.user.username = token.username;
        session.accessToken = token.accessToken;
        session.provider = token.provider;
      }
      return session;
    },
  },
  pages: {
    signIn: '/',
    error: '/',
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST }; 