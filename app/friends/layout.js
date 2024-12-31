'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function FriendsLayout({ children }) {
  const { data: session, status } = useSession()
  const router = useRouter()

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-pulse flex items-center justify-center space-x-2">
            <div className="h-3 w-3 bg-blue-500 rounded-full"></div>
            <div className="h-3 w-3 bg-blue-500 rounded-full"></div>
            <div className="h-3 w-3 bg-blue-500 rounded-full"></div>
          </div>
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">正在加载...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    router.push('/')
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </div>
    </div>
  )
} 