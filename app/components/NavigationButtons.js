'use client'

import { PlusCircleIcon, UserGroupIcon, UserIcon } from '@heroicons/react/24/outline'

export default function NavigationButtons({ onCreateRoom, onJoinRoom, onShowFriends }) {
  return (
    <div className="p-4 border-t border-gray-200 dark:border-gray-700">
      <div className="space-y-2">
        <button
          onClick={onCreateRoom}
          className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
        >
          <PlusCircleIcon className="h-5 w-5 mr-2" />
          新建聊天
        </button>
        <button
          onClick={onJoinRoom}
          className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 dark:text-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700"
        >
          <UserGroupIcon className="h-5 w-5 mr-2" />
          加入聊天室
        </button>
        <button
          onClick={onShowFriends}
          className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 dark:text-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700"
        >
          <UserIcon className="h-5 w-5 mr-2" />
          好友列表
        </button>
      </div>
    </div>
  )
}