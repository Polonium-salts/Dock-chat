'use client'

import { SessionProvider } from 'next-auth/react'
import { Toaster } from 'react-hot-toast'
import { ThemeProvider } from 'next-themes'

export function Providers({ children }) {
  return (
    <SessionProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <div className="min-h-full">
          {children}
          <Toaster position="top-right" />
        </div>
      </ThemeProvider>
    </SessionProvider>
  )
} 