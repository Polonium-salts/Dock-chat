'use client'

import { useState, useEffect } from 'react'
import { XMarkIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import Image from 'next/image'

export default function AddFriendModal({ isOpen, onClose, onSendRequest }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [note, setNote] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)

  // 搜索用户
  useEffect(() => {
    const searchUsers = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([])
        return
      }

      setIsSearching(true)
      try {
        const response = await fetch(`https://api.github.com/search/users?q=${searchQuery}+in:login&per_page=5`)
        const data = await response.json()
        
        // 格式化搜索结果
        const formattedResults = data.items.map(user => ({
          id: user.id,
          login: user.login,
          name: user.login,
          image: user.avatar_url
        }))
        
        setSearchResults(formattedResults)
      } catch (error) {
        console.error('Error searching users:', error)
      } finally {
        setIsSearching(false)
      }
    }

    // 使用防抖进行搜索
    const timeoutId = setTimeout(searchUsers, 500)
    return () => clearTimeout(timeoutId)
  }, [searchQuery])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!selectedUser) return

    onSendRequest({
      friendId: selectedUser.login,
      note: note.trim()
    })
    
    // 重置表单
    setSearchQuery('')
    setNote('')
    setSelectedUser(null)
    onClose()
  }

  const handleSelectUser = (user) => {
    setSelectedUser(user)
    setSearchQuery(user.login)
    setSearchResults([])
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

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* 搜索输入框 */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索用户..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:text-white"
            />
          </div>

          {/* 搜索结果列表 */}
          {searchQuery && searchResults.length > 0 && !selectedUser && (
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {searchResults.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => handleSelectUser(user)}
                    className="w-full flex items-center p-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
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
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 选中的用户 */}
          {selectedUser && (
            <div className="flex items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <Image
                src={selectedUser.image || '/default-avatar.png'}
                alt={selectedUser.name}
                width={40}
                height={40}
                className="rounded-full"
              />
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {selectedUser.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  @{selectedUser.login}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedUser(null)
                  setSearchQuery('')
                }}
                className="p-1 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* 添加备注 */}
          <div>
            <label htmlFor="note" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              添加备注
            </label>
            <textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="写一句话介绍自己..."
            />
          </div>

          {/* 提交按钮 */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={!selectedUser}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              发送请求
            </button>
          </div>
        </form>
      </div>
    </div>
  )
} 