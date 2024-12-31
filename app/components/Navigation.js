'use client'

import Link from 'next/link'

export default function Navigation({ currentView, setCurrentView, setShowSettingsModal }) {
  return (
    <nav className="flex p-4 border-b border-gray-200 dark:border-gray-700">
      <div className="flex w-full space-x-2">
        <button
          onClick={() => setCurrentView('chat')}
          className={`flex-1 px-3 py-2 text-sm font-medium rounded-md ${
            currentView === 'chat'
              ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300'
              : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
          }`}
        >
          聊天
        </button>
        <Link
          href="/friends"
          className="flex-1 px-3 py-2 text-sm font-medium rounded-md text-center text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          好友
        </Link>
        <button
          onClick={() => setShowSettingsModal(true)}
          className="flex-1 px-3 py-2 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          设置
        </button>
      </div>
    </nav>
  )
}