'use client'

import { useState } from 'react'
import { UserPlusIcon, UserGroupIcon } from '@heroicons/react/24/outline'
import Image from 'next/image'

export default function FriendsPage({ friends = [], onAddFriend, onShowRequests, onSelectUser }) {
  const [activeTab, setActiveTab] = useState('online') // 'online', 'all'
  
  // 模拟在线状态，实际应用中应该从服务器获取
  const onlineFriends = friends.filter(friend => friend.isOnline)
  const displayFriends = activeTab === 'online' ? onlineFriends : friends

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-800">
      {/* 顶部标签栏 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex space-x-4">
          <button
            onClick={() => setActiveTab('online')}
            className={`px-4 py-2 text-sm font-medium rounded-lg ${
              activeTab === 'online'
                ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400'
                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
            }`}
          >
            在线好友 ({onlineFriends.length})
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 text-sm font-medium rounded-lg ${
              activeTab === 'all'
                ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400'
                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
            }`}
          >
            全部好友 ({friends.length})
          </button>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={onShowRequests}
            className="p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 rounded-lg"
          >
            <UserGroupIcon className="w-5 h-5" />
          </button>
          <button
            onClick={onAddFriend}
            className="p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 rounded-lg"
          >
            <UserPlusIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 好友列表 */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-2">
          {displayFriends.length > 0 ? (
            displayFriends.map((friend) => (
              <button
                key={friend.id}
                onClick={() => onSelectUser(friend)}
                className="w-full flex items-center p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <div className="relative">
                  <Image
                    src={friend.image || '/default-avatar.png'}
                    alt={friend.name}
                    width={40}
                    height={40}
                    className="rounded-full"
                  />
                  {friend.isOnline && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></span>
                  )}
                </div>
                <div className="ml-3 flex-1 text-left">
                  <div className="font-medium text-gray-900 dark:text-white">
                    {friend.name}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    @{friend.login}
                  </div>
                </div>
                {friend.unreadCount > 0 && (
                  <span className="ml-2 px-2 py-1 text-xs bg-blue-500 text-white rounded-full">
                    {friend.unreadCount}
                  </span>
                )}
              </button>
            ))
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">
                {activeTab === 'online' ? '暂无在线好友' : '暂无好友'}
              </p>
              <button
                onClick={onAddFriend}
                className="mt-4 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg inline-flex items-center"
              >
                <UserPlusIcon className="w-5 h-5 mr-2" />
                添加好友
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 