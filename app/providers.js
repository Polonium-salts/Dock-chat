'use client'

import { SessionProvider } from 'next-auth/react'
import { NotificationProvider } from './contexts/NotificationContext'

export default function Providers({ children }) {
  return (
    <SessionProvider>
      <NotificationProvider>{children}</NotificationProvider>
    </SessionProvider>
  )
} 