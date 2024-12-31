'use client'

import { useState } from 'react'
import { XMarkIcon, UserPlusIcon, UserGroupIcon } from '@heroicons/react/24/outline'
import Image from 'next/image'

export default function FriendManageModal({ isOpen, onClose, onAddFriend, onAcceptRequest, onRejectRequest, friendRequests = [], config }) {
  const [username, setUsername] = useState('')
  const [activeTab, setActiveTab] = useState('add') // 'add' | 'requests'
  const [isLoading, setIsLoading] = useState(false)

  // 处理添加好友
  const handleAddFriend = async (e) => {
    e.preventDefault()
    if (!username.trim() || isLoading) return

    setIsLoading(true)
    try {
      await onAddFriend(username)
      setUsername('')
    } catch (error) {
      console.error('Error adding friend:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-md p-6">
        {/* 头部 */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            好友管理
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* 标签页 */}
        <div className="flex space-x-4 mb-6">
          <button
            onClick={() => setActiveTab('add')}
            className={`flex items-center px-4 py-2 rounded-lg ${
              activeTab === 'add'
                ? 'bg-blue-500 text-white'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <UserPlusIcon className="w-5 h-5 mr-2" />
            添加好友
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`flex items-center px-4 py-2 rounded-lg ${
              activeTab === 'requests'
                ? 'bg-blue-500 text-white'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <UserGroupIcon className="w-5 h-5 mr-2" />
            好友请求
            {friendRequests.length > 0 && (
              <span className="ml-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                {friendRequests.length}
              </span>
            )}
          </button>
        </div>

        {/* 添加好友表单 */}
        {activeTab === 'add' && (
          <form onSubmit={handleAddFriend} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                用户名
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="输入用户名"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <button
              type="submit"
              disabled={!username.trim() || isLoading}
              className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400"
            >
              {isLoading ? '处理中...' : '发送好友请求'}
            </button>
          </form>
        )}

        {/* 好友请求列表 */}
        {activeTab === 'requests' && (
          <div className="space-y-4">
            {friendRequests.length === 0 ? (
              <p className="text-center text-gray-500 dark:text-gray-400">
                暂无好友请求
              </p>
            ) : (
              <ul className="space-y-4">
                {friendRequests.map(request => (
                  <li
                    key={request.id}
                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <Image
                        src={request.avatar || '/default-avatar.png'}
                        alt={request.username}
                        width={40}
                        height={40}
                        className="rounded-full"
                      />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {request.username}
                        </p>
                        <p className="text-sm text-gray-500">
                          {new Date(request.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => onAcceptRequest(request.id)}
                        className="px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                      >
                        接受
                      </button>
                      <button
                        onClick={() => onRejectRequest(request.id)}
                        className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500"
                      >
                        拒绝
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  )
} 