import { useState, useEffect } from 'react'
import { UserPlusIcon, XMarkIcon } from '@heroicons/react/24/solid'
import Image from 'next/image'

export default function FriendList({ session, onStartPrivateChat }) {
  const [friends, setFriends] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSearching, setIsSearching] = useState(false)

  // 加载好友列表
  useEffect(() => {
    const loadFriends = async () => {
      if (!session?.accessToken) return
      
      try {
        setIsLoading(true)
        const response = await fetch('/api/friends')
        const data = await response.json()
        if (data.friends) {
          setFriends(data.friends)
        }
      } catch (error) {
        console.error('Error loading friends:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadFriends()
  }, [session])

  // 搜索用户
  const searchUsers = async () => {
    if (!searchTerm.trim() || !session?.accessToken) return
    
    try {
      setIsSearching(true)
      const response = await fetch(
        `https://api.github.com/search/users?q=${encodeURIComponent(searchTerm)}`,
        {
          headers: {
            'Authorization': `Bearer ${session.accessToken}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      )
      const data = await response.json()
      setSearchResults(data.items || [])
    } catch (error) {
      console.error('Error searching users:', error)
    } finally {
      setIsSearching(false)
    }
  }

  // 添加好友
  const addFriend = async (user) => {
    if (!session?.accessToken) return
    
    try {
      const response = await fetch('/api/friends', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          friendId: user.id,
          friendName: user.login,
          friendAvatar: user.avatar_url
        })
      })

      const data = await response.json()
      if (data.success) {
        setFriends(prev => [...prev, data.friend])
        setSearchResults([])
        setSearchTerm('')
      } else {
        alert(data.error || '添加好友失败')
      }
    } catch (error) {
      console.error('Error adding friend:', error)
      alert('添加好友失败')
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">好友列表</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="搜索用户..."
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          />
          <button
            onClick={searchUsers}
            disabled={isSearching || !searchTerm.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
          >
            {isSearching ? '搜索中...' : '搜索'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {searchResults.length > 0 ? (
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">搜索结果</h3>
            {searchResults.map(user => (
              <div
                key={user.id}
                className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <Image
                    src={user.avatar_url}
                    alt={user.login}
                    width={40}
                    height={40}
                    className="rounded-full"
                  />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{user.login}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">GitHub ID: {user.id}</p>
                  </div>
                </div>
                <button
                  onClick={() => addFriend(user)}
                  className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/50 rounded-full"
                >
                  <UserPlusIcon className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">我的好友</h3>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : friends.length > 0 ? (
              friends.map(friend => (
                <div
                  key={friend.id}
                  className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                  onClick={() => onStartPrivateChat(friend)}
                >
                  <div className="flex items-center gap-3">
                    <Image
                      src={friend.avatar}
                      alt={friend.name}
                      width={40}
                      height={40}
                      className="rounded-full"
                    />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{friend.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        添加时间: {new Date(friend.addedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                暂无好友
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
} 