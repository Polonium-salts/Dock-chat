'use client'

import { SessionProvider } from 'next-auth/react'
import { ThemeProvider } from './providers/ThemeProvider'

export function Providers({ children }) {
  return (
    <SessionProvider>
      <ThemeProvider>
        {children}
      </ThemeProvider>
    </SessionProvider>
  )
} 