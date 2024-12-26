'use client'

import { signOut } from 'next-auth/react'

export default function LogoutButton() {
  return (
    <div className="p-4 border-t border-gray-200 dark:border-gray-700">
      <button
        onClick={() => signOut({ callbackUrl: '/' })}
        className="w-full px-4 py-3 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
      >
        退出登录
      </button>
      <p className="mt-2 text-xs text-center text-gray-500 dark:text-gray-400">
        退出后需要重新登录才能继续使用
      </p>
    </div>
  )
} 