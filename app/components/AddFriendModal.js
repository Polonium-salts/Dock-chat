'use client'

import { useState, useEffect } from 'react'
import { XMarkIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import Image from 'next/image'
import { useSession } from 'next-auth/react'

export default function AddFriendModal({ isOpen, onClose, onSendRequest }) {
  const { data: session } = useSession()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [selectedUser, setSelectedUser] = useState(null)
  const [note, setNote] = useState('')

  useEffect(() => {
    const searchUsers = async () => {
      if (!searchQuery.trim() || !session?.accessToken) return
      
      setIsLoading(true)
      setError(null)
      
      try {
        const response = await fetch(`https://api.github.com/search/users?q=${encodeURIComponent(searchQuery)}`, {
          headers: {
            'Authorization': `Bearer ${session.accessToken}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        })

        if (!response.ok) {
          throw new Error('搜索失败，请重试')
        }

        const data = await response.json()
        // 过滤掉当前用户
        const filteredResults = data.items.filter(user => user.login !== session.user.login)
        setSearchResults(filteredResults)
      } catch (error) {
        console.error('Search error:', error)
        setError(error.message)
        setSearchResults([])
      } finally {
        setIsLoading(false)
      }
    }

    // 使用防抖进行搜索
    const timeoutId = setTimeout(searchUsers, 500)
    return () => clearTimeout(timeoutId)
  }, [searchQuery, session])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selectedUser) return

    try {
      await onSendRequest({
        friendId: selectedUser.login,
        note: note.trim()
      })
      onClose()
    } catch (error) {
      console.error('Error sending friend request:', error)
      setError('发送好友请求失败，请重试')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">添加好友</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          {/* 搜索框 */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索用户..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* 加载状态 */}
          {isLoading && (
            <div className="flex justify-center items-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            </div>
          )}

          {/* 错误提示 */}
          {error && (
            <div className="mt-2 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {/* 搜索结果 */}
          {!isLoading && searchResults.length > 0 && (
            <div className="mt-4 space-y-2 max-h-60 overflow-y-auto">
              {searchResults.map((user) => (
                <button
                  key={user.id}
                  onClick={() => setSelectedUser(user)}
                  className={`w-full flex items-center p-2 rounded-lg ${
                    selectedUser?.id === user.id
                      ? 'bg-blue-50 dark:bg-blue-900/50'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <Image
                    src={user.avatar_url}
                    alt={user.login}
                    width={40}
                    height={40}
                    className="rounded-full"
                  />
                  <div className="ml-3 text-left">
                    <div className="font-medium text-gray-900 dark:text-white">{user.login}</div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* 没有搜索结果 */}
          {!isLoading && searchQuery && searchResults.length === 0 && !error && (
            <div className="mt-4 text-center text-gray-500 dark:text-gray-400">
              未找到匹配的用户
            </div>
          )}

          {/* 选中用户后的表单 */}
          {selectedUser && (
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  添加备注（可选）
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  rows="3"
                  placeholder="写一句话介绍自己..."
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md"
                >
                  取消选择
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
                >
                  发送请求
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
} 