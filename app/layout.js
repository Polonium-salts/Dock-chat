import { Inter } from 'next/font/google';
import './globals.css';
import { getServerSession } from 'next-auth';
import SessionProvider from './components/SessionProvider';
import LanguageProvider from './components/LanguageProvider';
import { authOptions } from './auth/config';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  adjustFontFallback: false,
  preload: true,
  weight: ['400', '500', '600', '700'],
});

export const metadata = {
  title: 'DockChat - Chat & RSS Platform',
  description: 'A modern chat platform with RSS integration',
};

export default async function RootLayout({ children }) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en" data-theme="light" className={inter.className}>
      <body>
        <SessionProvider session={session}>
          <LanguageProvider>
            {children}
          </LanguageProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
