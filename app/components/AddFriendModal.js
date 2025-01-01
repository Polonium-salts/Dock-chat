'use client'

import { useState, useEffect } from 'react'
import { XMarkIcon, MagnifyingGlassIcon, UserPlusIcon } from '@heroicons/react/24/outline'
import Image from 'next/image'

export default function AddFriendModal({ isOpen, onClose, onSendRequest, currentUser, friends = [] }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [note, setNote] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState('')

  // 搜索用户
  useEffect(() => {
    const searchUsers = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([])
        setError('')
        return
      }

      setIsSearching(true)
      setError('')
      
      try {
        const response = await fetch(`https://api.github.com/search/users?q=${searchQuery}+in:login+in:name&per_page=10`)
        if (!response.ok) {
          throw new Error('搜索失败，请稍后重试')
        }
        
        const data = await response.json()
        
        if (data.items.length === 0) {
          setError('未找到相关用户')
          setSearchResults([])
          return
        }
        
        // 获取详细的用户信息
        const detailedUsers = await Promise.all(
          data.items.map(async (user) => {
            const detailResponse = await fetch(`https://api.github.com/users/${user.login}`)
            const detailData = await detailResponse.json()
            return {
              id: detailData.id,
              login: detailData.login,
              name: detailData.name || detailData.login,
              image: detailData.avatar_url,
              bio: detailData.bio,
              location: detailData.location,
              isFriend: friends.some(f => f.login === detailData.login),
              isCurrentUser: currentUser?.login === detailData.login
            }
          })
        )
        
        setSearchResults(detailedUsers)
      } catch (error) {
        console.error('Error searching users:', error)
        setError('搜索出错，请重试')
      } finally {
        setIsSearching(false)
      }
    }

    const timeoutId = setTimeout(searchUsers, 500)
    return () => clearTimeout(timeoutId)
  }, [searchQuery, friends, currentUser])

  const handleSendRequest = async (user) => {
    try {
      await onSendRequest({
        friendId: user.login,
        note: note.trim() || '你好，我想加你为好友'
      })
      
      // 更新用户状态为已发送请求
      setSearchResults(prev => 
        prev.map(u => 
          u.id === user.id 
            ? { ...u, requestSent: true }
            : u
        )
      )
    } catch (error) {
      console.error('Error sending friend request:', error)
      setError('发送好友请求失败，请重试')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4">
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
          {/* 搜索区域 */}
          <div className="mb-6">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索用户名或 GitHub ID..."
                className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:text-white text-lg"
              />
            </div>
            {error && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
            )}
          </div>

          {/* 搜索结果 */}
          <div className="space-y-4">
            {isSearching ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-blue-500"></div>
                <p className="mt-2 text-gray-500 dark:text-gray-400">搜索中...</p>
              </div>
            ) : searchResults.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {searchResults.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center p-4 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-400 transition-colors"
                  >
                    <Image
                      src={user.image || '/default-avatar.png'}
                      alt={user.name}
                      width={56}
                      height={56}
                      className="rounded-full"
                    />
                    <div className="ml-4 flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                            {user.name}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            @{user.login}
                          </p>
                        </div>
                        {user.isCurrentUser ? (
                          <span className="px-3 py-1 text-sm text-gray-500 dark:text-gray-400">
                            这是你自己
                          </span>
                        ) : user.isFriend ? (
                          <span className="px-3 py-1 text-sm text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-300 rounded-full">
                            已是好友
                          </span>
                        ) : user.requestSent ? (
                          <span className="px-3 py-1 text-sm text-blue-600 bg-blue-100 dark:bg-blue-900 dark:text-blue-300 rounded-full">
                            已发送请求
                          </span>
                        ) : (
                          <button
                            onClick={() => handleSendRequest(user)}
                            className="flex items-center px-3 py-1 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                          >
                            <UserPlusIcon className="w-5 h-5 mr-1" />
                            加好友
                          </button>
                        )}
                      </div>
                      {user.bio && (
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                          {user.bio}
                        </p>
                      )}
                      {user.location && (
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          📍 {user.location}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : searchQuery && !error && (
              <div className="text-center py-8">
                <p className="text-gray-500 dark:text-gray-400">
                  开始输入以搜索用户
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 