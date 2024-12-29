'use client'

import { useState } from 'react'
import { XMarkIcon, MagnifyingGlassIcon } from '@heroicons/react/24/solid'
import Image from 'next/image'

export default function AddFriendModal({ onClose, onAddFriend, session }) {
  const [username, setUsername] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [searchResult, setSearchResult] = useState(null)
  const [error, setError] = useState('')

  const handleSearch = async () => {
    if (!username.trim()) return
    setIsSearching(true)
    setError('')
    setSearchResult(null)

    try {
      // 通过用户名搜索用户
      const response = await fetch(`/api/users/search?username=${username}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || '搜索用户失败')
      }

      if (data.user) {
        // 不能添加自己为好友
        if (data.user.login === session.user.login) {
          setError('不能添加自己为好友')
          return
        }
        setSearchResult(data.user)
      } else {
        setError('未找到该用户')
      }
    } catch (error) {
      setError(error.message)
    } finally {
      setIsSearching(false)
    }
  }

  const handleAddFriend = async () => {
    if (!searchResult) return
    try {
      await onAddFriend(searchResult)
      onClose()
    } catch (error) {
      setError(error.message)
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
          <div className="flex gap-2">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="输入用户名搜索"
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            />
            <button
              onClick={handleSearch}
              disabled={isSearching || !username.trim()}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSearching ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <MagnifyingGlassIcon className="w-5 h-5" />
              )}
            </button>
          </div>

          {error && (
            <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
          )}

          {searchResult && (
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-center gap-4">
                {searchResult.image && (
                  <Image
                    src={searchResult.image}
                    alt={searchResult.name}
                    width={48}
                    height={48}
                    className="rounded-full"
                  />
                )}
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 dark:text-white">
                    {searchResult.name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    @{searchResult.login}
                  </p>
                </div>
                <button
                  onClick={handleAddFriend}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                >
                  添加
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 