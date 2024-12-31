'use client'

import { useState, useEffect } from 'react'
import { XMarkIcon, MagnifyingGlassIcon } from '@heroicons/react/24/solid'
import Image from 'next/image'
import { useSession } from 'next-auth/react'
import { useDebounce } from '@/lib/hooks'

export default function AddFriendModal({ onClose, onSubmit }) {
  const { data: session } = useSession()
  const [searchQuery, setSearchQuery] = useState('')
  const [note, setNote] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [searchResults, setSearchResults] = useState([])
  const [selectedUser, setSelectedUser] = useState(null)
  const debouncedSearch = useDebounce(searchQuery, 500)

  // 搜索用户
  useEffect(() => {
    const searchUsers = async () => {
      if (!debouncedSearch.trim() || !session?.accessToken) return
      setIsLoading(true)
      try {
        const response = await fetch(`https://api.github.com/search/users?q=${debouncedSearch}+type:user`, {
          headers: {
            'Authorization': `Bearer ${session.accessToken}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        })
        const data = await response.json()
        
        // 获取每个用户的详细信息
        const detailedUsers = await Promise.all(
          data.items.slice(0, 5).map(async user => {
            const detailResponse = await fetch(`https://api.github.com/users/${user.login}`, {
              headers: {
                'Authorization': `Bearer ${session.accessToken}`,
                'Accept': 'application/vnd.github.v3+json'
              }
            })
            return detailResponse.json()
          })
        )
        
        setSearchResults(detailedUsers)
      } catch (error) {
        console.error('Error searching users:', error)
      } finally {
        setIsLoading(false)
      }
    }

    searchUsers()
  }, [debouncedSearch, session])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selectedUser) return

    setIsLoading(true)
    try {
      await onSubmit({
        friendId: selectedUser.login,
        note: note.trim()
      })
      onClose()
    } catch (error) {
      console.error('Error sending friend request:', error)
      alert('发送好友申请失败，请重试')
    } finally {
      setIsLoading(false)
    }
  }

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

        <div className="p-4 space-y-4">
          {/* 搜索框 */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="搜索用户..."
            />
          </div>

          {/* 搜索结果列表 */}
          <div className="max-h-60 overflow-y-auto space-y-2">
            {isLoading ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
              </div>
            ) : searchResults.length > 0 ? (
              searchResults.map(user => (
                <div
                  key={user.id}
                  onClick={() => setSelectedUser(user)}
                  className={`flex items-center p-3 rounded-lg cursor-pointer transition-colors ${
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
                  <div className="ml-3">
                    <p className="font-medium text-gray-900 dark:text-white">{user.name || user.login}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">@{user.login}</p>
                  </div>
                </div>
              ))
            ) : searchQuery && !isLoading ? (
              <p className="text-center text-gray-500 dark:text-gray-400 py-4">未找到用户</p>
            ) : null}
          </div>

          {/* 验证消息 */}
          {selectedUser && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                验证消息
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="请输入验证消息"
                rows={3}
              />
            </div>
          )}

          {/* 按钮 */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md"
            >
              取消
            </button>
            <button
              onClick={handleSubmit}
              disabled={isLoading || !selectedUser}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? '发送中...' : '发送申请'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
} 