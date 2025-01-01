'use client'

import { useState, useEffect } from 'react'
import { XMarkIcon, MagnifyingGlassIcon, UserPlusIcon, CheckIcon } from '@heroicons/react/24/outline'
import Image from 'next/image'
import { useSession } from 'next-auth/react'

export default function AddFriendModal({ isOpen, onClose, onSendRequest, friends = [] }) {
  const { data: session } = useSession()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [selectedUser, setSelectedUser] = useState(null)
  const [note, setNote] = useState('')
  const [requestSent, setRequestSent] = useState({})

  useEffect(() => {
    const searchUsers = async () => {
      if (!searchQuery.trim() || searchQuery.length < 2 || !session?.accessToken) {
        setSearchResults([])
        setIsLoading(false)
        return
      }
      
      if (isLoading) return
      
      setIsLoading(true)
      setError(null)
      
      try {
        // 首先搜索用户
        const response = await fetch(`https://api.github.com/search/users?q=${encodeURIComponent(searchQuery)}+in:login+in:name&per_page=5`, {
          headers: {
            'Authorization': `Bearer ${session.accessToken}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        })

        if (!response.ok) {
          throw new Error('搜索失败，请重试')
        }

        const data = await response.json()
        if (data.items.length === 0) {
          setSearchResults([])
          setIsLoading(false)
          return
        }
        
        // 获取每个用户的详细信息
        const detailedUsers = await Promise.all(
          data.items
            .filter(user => user.login !== session.user.login)
            .slice(0, 3) // 限制只获取前3个用户的详细信息
            .map(async user => {
              try {
                const detailResponse = await fetch(`https://api.github.com/users/${user.login}`, {
                  headers: {
                    'Authorization': `Bearer ${session.accessToken}`,
                    'Accept': 'application/vnd.github.v3+json'
                  }
                })
                if (!detailResponse.ok) return null
                const detailData = await detailResponse.json()
                return {
                  id: detailData.id,
                  login: detailData.login,
                  name: detailData.name || detailData.login,
                  avatar_url: detailData.avatar_url,
                  bio: detailData.bio,
                  location: detailData.location,
                  followers: detailData.followers,
                  following: detailData.following,
                  isFriend: friends.some(f => f.login === detailData.login)
                }
              } catch (error) {
                console.error('Error fetching user details:', error)
                return null
              }
            })
        )

        const validUsers = detailedUsers.filter(Boolean)
        setSearchResults(validUsers)
      } catch (error) {
        console.error('Search error:', error)
        setError(error.message)
        setSearchResults([])
      } finally {
        setIsLoading(false)
      }
    }

    // 使用防抖进行搜索，增加延迟时间到1.5秒
    const timeoutId = setTimeout(searchUsers, 1500)
    return () => clearTimeout(timeoutId)
  }, [searchQuery, session, friends])

  const handleSendRequest = async (user) => {
    if (requestSent[user.id]) return
    
    try {
      await onSendRequest({
        friendId: user.login,
        note: note.trim() || '你好，我想加你为好友'
      })
      
      setRequestSent(prev => ({
        ...prev,
        [user.id]: true
      }))
      
      setNote('')
      setTimeout(() => {
        setSelectedUser(null)
      }, 1500)
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
          {/* 搜索框 */}
          <div className="relative mb-6">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="输入用户名或 GitHub ID 搜索..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-lg"
            />
          </div>

          {/* 加载状态 */}
          {isLoading && (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-blue-500"></div>
              <span className="ml-3 text-gray-600 dark:text-gray-400">搜索中...</span>
            </div>
          )}

          {/* 错误提示 */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/50 text-red-600 dark:text-red-400 rounded-lg">
              {error}
            </div>
          )}

          {/* 搜索结果 */}
          {!isLoading && searchResults.length > 0 && (
            <div className="space-y-4">
              {searchResults.map((user) => (
                <div
                  key={user.id}
                  className={`p-4 rounded-lg border ${
                    selectedUser?.id === user.id
                      ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/50'
                      : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600'
                  } transition-colors`}
                >
                  <div className="flex items-start">
                    <Image
                      src={user.avatar_url}
                      alt={user.name}
                      width={64}
                      height={64}
                      className="rounded-full"
                    />
                    <div className="ml-4 flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {user.name}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            @{user.login}
                          </p>
                        </div>
                        {user.isFriend ? (
                          <span className="px-3 py-1 text-sm text-green-600 bg-green-100 dark:bg-green-900/50 dark:text-green-400 rounded-full">
                            已是好友
                          </span>
                        ) : requestSent[user.id] ? (
                          <span className="px-3 py-1 text-sm text-blue-600 bg-blue-100 dark:bg-blue-900/50 dark:text-blue-400 rounded-full flex items-center">
                            <CheckIcon className="w-4 h-4 mr-1" />
                            已发送请求
                          </span>
                        ) : (
                          <button
                            onClick={() => handleSendRequest(user)}
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center"
                          >
                            <UserPlusIcon className="w-5 h-5 mr-2" />
                            加为好友
                          </button>
                        )}
                      </div>
                      {user.bio && (
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                          {user.bio}
                        </p>
                      )}
                      <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                        {user.location && (
                          <span className="flex items-center">
                            <span className="mr-1">📍</span>
                            {user.location}
                          </span>
                        )}
                        <span>{user.followers} 关注者</span>
                        <span>关注 {user.following} 人</span>
                      </div>
                    </div>
                  </div>
                  
                  {selectedUser?.id === user.id && !requestSent[user.id] && (
                    <div className="mt-4 pl-[76px]">
                      <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="写一句话介绍自己..."
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                        rows="2"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* 没有搜索结果 */}
          {!isLoading && searchQuery && searchResults.length === 0 && !error && (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">未找到匹配的用户</p>
            </div>
          )}

          {/* 初始状态提示 */}
          {!searchQuery && !isLoading && searchResults.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">
                输入用户名或 GitHub ID 开始搜索
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 