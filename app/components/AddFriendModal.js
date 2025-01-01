'use client'

import { useState, useEffect } from 'react'
import { XMarkIcon, MagnifyingGlassIcon, UserIcon, MapPinIcon, BuildingIcon, LinkIcon } from '@heroicons/react/24/outline'
import Image from 'next/image'
import { useSession } from 'next-auth/react'

export default function AddFriendModal({ isOpen, onClose, onSendRequest }) {
  const { data: session } = useSession()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [selectedUser, setSelectedUser] = useState(null)
  const [userDetails, setUserDetails] = useState(null)
  const [note, setNote] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [isLoadingDetails, setIsLoadingDetails] = useState(false)

  if (!isOpen) return null

  // 搜索用户
  const handleSearch = async (query) => {
    if (!query.trim() || !session?.accessToken) return
    
    setIsSearching(true)
    try {
      const response = await fetch(`https://api.github.com/search/users?q=${encodeURIComponent(query)}+type:user`, {
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        // 过滤掉自己并限制结果数量
        const filteredResults = data.items
          .filter(user => user.login !== session.user.login)
          .slice(0, 5) // 限制显示前5个结果
        setSearchResults(filteredResults)
      }
    } catch (error) {
      console.error('Error searching users:', error)
    } finally {
      setIsSearching(false)
    }
  }

  // 加载用户详细信息
  const loadUserDetails = async (username) => {
    if (!session?.accessToken) return
    
    setIsLoadingDetails(true)
    try {
      const response = await fetch(`https://api.github.com/users/${username}`, {
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      })

      if (response.ok) {
        const details = await response.json()
        setUserDetails(details)
      }
    } catch (error) {
      console.error('Error loading user details:', error)
    } finally {
      setIsLoadingDetails(false)
    }
  }

  // 处理搜索输入
  const handleSearchInput = (e) => {
    const query = e.target.value
    setSearchQuery(query)
    setSelectedUser(null)
    setUserDetails(null)
    
    if (query.length >= 2) {
      const timeoutId = setTimeout(() => handleSearch(query), 500)
      return () => clearTimeout(timeoutId)
    } else {
      setSearchResults([])
    }
  }

  // 处理选择用户
  const handleSelectUser = async (user) => {
    setSelectedUser(user)
    setSearchResults([])
    setSearchQuery(user.login)
    await loadUserDetails(user.login)
  }

  // 处理发送请求
  const handleSubmit = (e) => {
    e.preventDefault()
    if (!selectedUser) return
    
    onSendRequest({
      friendId: selectedUser.login,
      note: note
    })
    
    // 重置表单
    setSelectedUser(null)
    setSearchQuery('')
    setNote('')
    setUserDetails(null)
    onClose()
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

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              搜索用户
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchInput}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="输入 GitHub 用户名搜索..."
              />
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              {isSearching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-500 border-t-transparent"></div>
                </div>
              )}
            </div>

            {/* 搜索结果 */}
            {searchResults.length > 0 && !selectedUser && (
              <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 max-h-60 overflow-y-auto">
                {searchResults.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => handleSelectUser(user)}
                    className="w-full flex items-center px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-0"
                  >
                    <Image
                      src={user.avatar_url}
                      alt={user.login}
                      width={40}
                      height={40}
                      className="rounded-full"
                    />
                    <div className="ml-3 text-left flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {user.login}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {user.type}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 用户详情卡片 */}
          {selectedUser && userDetails && (
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-4">
              <div className="flex items-start space-x-4">
                <Image
                  src={userDetails.avatar_url}
                  alt={userDetails.login}
                  width={64}
                  height={64}
                  className="rounded-full"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    {userDetails.name || userDetails.login}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    @{userDetails.login}
                  </p>
                  {userDetails.bio && (
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                      {userDetails.bio}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                {userDetails.location && (
                  <div className="flex items-center text-gray-600 dark:text-gray-300">
                    <MapPinIcon className="w-4 h-4 mr-2" />
                    {userDetails.location}
                  </div>
                )}
                {userDetails.company && (
                  <div className="flex items-center text-gray-600 dark:text-gray-300">
                    <BuildingIcon className="w-4 h-4 mr-2" />
                    {userDetails.company}
                  </div>
                )}
                {userDetails.blog && (
                  <div className="flex items-center text-gray-600 dark:text-gray-300">
                    <LinkIcon className="w-4 h-4 mr-2" />
                    <a href={userDetails.blog} target="_blank" rel="noopener noreferrer" className="hover:text-blue-500">
                      个人网站
                    </a>
                  </div>
                )}
                <div className="flex items-center text-gray-600 dark:text-gray-300">
                  <UserIcon className="w-4 h-4 mr-2" />
                  {userDetails.followers} 关注者
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              验证消息
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="请输入验证消息..."
              required
            />
          </div>

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
              disabled={!selectedUser || !note.trim() || isLoadingDetails}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50"
            >
              发送请求
            </button>
          </div>
        </form>
      </div>
    </div>
  )
} 