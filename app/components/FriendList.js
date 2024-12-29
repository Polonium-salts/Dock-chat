import { useState, useEffect } from 'react'
import { UserPlusIcon, ChatBubbleLeftIcon } from '@heroicons/react/24/solid'

export default function FriendList({ session, onStartPrivateChat }) {
  const [friends, setFriends] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)

  // 加载好友列表
  const loadFriends = async () => {
    try {
      const response = await fetch('/api/friends', {
        headers: {
          'Authorization': `Bearer ${session.accessToken}`
        }
      })
      const data = await response.json()
      setFriends(data.friends)
    } catch (error) {
      console.error('Error loading friends:', error)
    }
  }

  // 搜索用户
  const searchUsers = async (query) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    try {
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`, {
        headers: {
          'Authorization': `Bearer ${session.accessToken}`
        }
      })
      const data = await response.json()
      setSearchResults(data.users)
    } catch (error) {
      console.error('Error searching users:', error)
    } finally {
      setIsSearching(false)
    }
  }

  // 添加好友
  const addFriend = async (userId) => {
    try {
      const response = await fetch('/api/friends', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ friendId: userId })
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          // 添加新好友到列表
          setFriends(prev => [...prev, data.friend])
          // 清空搜索
          setSearchQuery('')
          setSearchResults([])
          // 如果提供了回调函数，创建私聊
          if (data.chatRoom && onStartPrivateChat) {
            onStartPrivateChat(data.friend)
          }
        } else {
          alert(data.error || '添加好友失败')
        }
      } else {
        const error = await response.json()
        alert(error.error || '添加好友失败')
      }
    } catch (error) {
      console.error('Error adding friend:', error)
      alert('添加好友失败，请重试')
    }
  }

  // 开始私聊
  const handleStartPrivateChat = (friend) => {
    onStartPrivateChat(friend)
  }

  useEffect(() => {
    if (session?.accessToken) {
      loadFriends()
    }
  }, [session])

  useEffect(() => {
    const debounceTimeout = setTimeout(() => {
      if (searchQuery) {
        searchUsers(searchQuery)
      }
    }, 300)

    return () => clearTimeout(debounceTimeout)
  }, [searchQuery])

  return (
    <div className="p-4 space-y-4">
      <div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="搜索用户..."
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
        />
      </div>

      {searchQuery && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            搜索结果
          </h3>
          {isSearching ? (
            <div className="text-sm text-gray-500 dark:text-gray-400">
              搜索中...
            </div>
          ) : searchResults.length > 0 ? (
            <ul className="space-y-2">
              {searchResults.map(user => (
                <li
                  key={user.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={user.avatar_url}
                      alt={user.name}
                      className="w-8 h-8 rounded-full"
                    />
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {user.name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        @{user.login}
                      </div>
                      {user.bio && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                          {user.bio}
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => addFriend(user.id)}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/50 rounded-md transition-colors"
                  >
                    <UserPlusIcon className="w-4 h-4" />
                    添加好友
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-sm text-gray-500 dark:text-gray-400">
              未找到用户
            </div>
          )}
        </div>
      )}

      <div className="space-y-2">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          我的好友
        </h3>
        {friends.length > 0 ? (
          <ul className="space-y-2">
            {friends.map(friend => (
              <li
                key={friend.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={friend.avatar_url}
                    alt={friend.name}
                    className="w-8 h-8 rounded-full"
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {friend.name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      @{friend.login}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleStartPrivateChat(friend)}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/50 rounded-md transition-colors"
                >
                  <ChatBubbleLeftIcon className="w-4 h-4" />
                  发起私聊
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-sm text-gray-500 dark:text-gray-400">
            暂无好友
          </div>
        )}
      </div>
    </div>
  )
} 