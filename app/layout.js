import { Inter } from 'next/font/google'
import { SessionProvider } from 'next-auth/react'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Dock Chat',
  description: '实时聊天，随时交流',
}

export default function RootLayout({ children, session }) {
  return (
    <html lang="zh-CN">
      <body className={inter.className}>
        <SessionProvider session={session}>
          {children}
        </SessionProvider>
      </body>
    </html>
  )
}
