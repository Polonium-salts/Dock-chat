'use client'

import { useState } from 'react'
import { UserPlusIcon, UserGroupIcon, BellIcon } from '@heroicons/react/24/outline'
import Image from 'next/image'

export default function FriendsPage({ friends, following, onAddFriend, onShowRequests, onSelectUser }) {
  const [searchQuery, setSearchQuery] = useState('')

  const filteredFriends = friends.filter(friend => 
    friend.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    friend.login?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredFollowing = following.filter(user =>
    user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.login?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="h-full flex flex-col">
      {/* 顶部搜索和操作栏 */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">好友列表</h2>
          <div className="flex space-x-2">
            <button
              onClick={onAddFriend}
              className="flex items-center px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 dark:text-blue-400 dark:bg-blue-900/50 dark:hover:bg-blue-900 rounded-md transition-colors"
            >
              <UserPlusIcon className="w-4 h-4 mr-1" />
              添加好友
            </button>
            <button
              onClick={onShowRequests}
              className="flex items-center px-3 py-1.5 text-sm font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 dark:text-purple-400 dark:bg-purple-900/50 dark:hover:bg-purple-900 rounded-md transition-colors"
            >
              <BellIcon className="w-4 h-4 mr-1" />
              好友请求
            </button>
          </div>
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="搜索好友..."
          className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:text-white"
        />
      </div>

      {/* 好友列表 */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* 我的好友 */}
        <div className="mb-6">
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
            我的好友 ({filteredFriends.length})
          </h3>
          <div className="space-y-2">
            {filteredFriends.map((friend) => (
              <button
                key={friend.id}
                onClick={() => onSelectUser(friend)}
                className="w-full flex items-center p-3 bg-white dark:bg-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <Image
                  src={friend.image || '/default-avatar.png'}
                  alt={friend.name}
                  width={40}
                  height={40}
                  className="rounded-full"
                />
                <div className="ml-3 flex-1 text-left">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {friend.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    @{friend.login}
                  </p>
                </div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                  好友
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* 关注列表 */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
            正在关注 ({filteredFollowing.length})
          </h3>
          <div className="space-y-2">
            {filteredFollowing.map((user) => (
              <button
                key={user.id}
                onClick={() => onSelectUser(user)}
                className="w-full flex items-center p-3 bg-white dark:bg-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <Image
                  src={user.image || '/default-avatar.png'}
                  alt={user.name}
                  width={40}
                  height={40}
                  className="rounded-full"
                />
                <div className="ml-3 flex-1 text-left">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {user.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    @{user.login}
                  </p>
                </div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                  关注中
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
} 