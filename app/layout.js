import { Inter } from 'next/font/google'
import { SessionProvider } from 'next-auth/react'
import { NotificationProvider } from './contexts/NotificationContext'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Dock Chat',
  description: '实时聊天，随时交流',
}

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className={inter.className}>
        <SessionProvider>
          <NotificationProvider>
            {children}
          </NotificationProvider>
        </SessionProvider>
      </body>
    </html>
  )
}
