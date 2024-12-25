'use client'

import { Inter } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import './globals.css'
import { AuthProvider } from './providers'

const inter = Inter({ subsets: ['latin'] })

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <title>Dock Chat - 实时聊天，随时交流</title>
        <meta name="description" content="实时聊天，随时交流" />
      </head>
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
