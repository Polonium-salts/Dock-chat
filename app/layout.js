import { Providers } from './providers'
import './globals.css'

export const metadata = {
  title: 'Dock Chat',
  description: 'A modern chat application',
}

export default function RootLayout({ children }) {
  return (
    <html lang="zh" suppressHydrationWarning>
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
