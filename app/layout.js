'use client'

import { Inter } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import './globals.css'
import { AuthProvider } from './providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Dock Chat',
  description: '实时聊天，随时交流',
}

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className={`${inter.className} h-full antialiased`}>
        <AuthProvider>
          <div className="min-h-full">
            {children}
            <Toaster position="top-right" />
          </div>
        </AuthProvider>
      </body>
    </html>
  )
}
