import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Telegraph Chat - 实时聊天应用',
  description: '一个基于 Next.js 和 GitHub 认证的实时聊天应用',
}

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN" className="h-full">
      <body className={`${inter.className} h-full antialiased`}>
        <Providers>
          <div className="min-h-full">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  )
}
