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
    <html lang="zh-CN">
      <body className={inter.className}>
        <AuthProvider>
          {children}
          <Toaster position="top-right" />
        </AuthProvider>
      </body>
    </html>
  )
}
