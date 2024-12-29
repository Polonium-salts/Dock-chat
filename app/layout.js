import { Providers } from './providers'
import './globals.css'

export const metadata = {
  title: 'Dock Chat',
  description: '基于 GitHub 的聊天应用',
}

export default function RootLayout({ children }) {
  return (
    <html lang="zh" suppressHydrationWarning>
      <body className="font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
