'use client'

import { useState } from 'react'
import { UserCircleIcon, PlusCircleIcon, XMarkIcon } from '@heroicons/react/24/solid'
import Image from 'next/image'

export default function FriendsList({ friends, onAddFriend, onStartChat, onRemoveFriend }) {
  const [showAddFriend, setShowAddFriend] = useState(false)
  const [friendInput, setFriendInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleAddFriend = async (e) => {
    e.preventDefault()
    if (!friendInput.trim() || isLoading) return

    setIsLoading(true)
    try {
      // 处理输入的用户名或链接
      let username = friendInput.trim()
      if (username.includes('/')) {
        // 如果是完整链接，提取用户名
        const parts = username.split('/')
        username = parts[parts.length - 1]
      }

      await onAddFriend(username)
      setFriendInput('')
      setShowAddFriend(false)
    } catch (error) {
      console.error('Error adding friend:', error)
      alert('添加好友失败，请检查用户名是否正确')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">好友列表</h2>
        <button
          onClick={() => setShowAddFriend(true)}
          className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
        >
          <PlusCircleIcon className="w-6 h-6" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {friends.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
            <p>还没有好友</p>
            <button
              onClick={() => setShowAddFriend(true)}
              className="mt-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              添加好友
            </button>
          </div>
        ) : (
          friends.map(friend => (
            <div
              key={friend.username}
              className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <div className="flex items-center gap-3">
                {friend.avatar ? (
                  <Image
                    src={friend.avatar}
                    alt={friend.name}
                    width={40}
                    height={40}
                    className="rounded-full"
                  />
                ) : (
                  <UserCircleIcon className="w-10 h-10 text-gray-400" />
                )}
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">{friend.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">@{friend.username}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onStartChat(friend.username)}
                  className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/50 rounded"
                >
                  发起聊天
                </button>
                <button
                  onClick={() => onRemoveFriend(friend.username)}
                  className="p-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showAddFriend && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">添加好友</h3>
              <button
                onClick={() => setShowAddFriend(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddFriend} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  用户名或链接
                </label>
                <input
                  type="text"
                  value={friendInput}
                  onChange={(e) => setFriendInput(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="输入用户名或完整链接"
                  required
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddFriend(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !friendInput.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? '添加中...' : '添加'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
} 