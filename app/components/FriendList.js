'use client'

import { useState, useEffect } from 'react'
import { Octokit } from '@octokit/rest'
import { UserPlusIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import Image from 'next/image'

export default function FriendList({ session, onStartPrivateChat }) {
  const [friends, setFriends] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSearching, setIsSearching] = useState(false)

  // 加载好友列表
  const loadFriends = async () => {
    if (!session?.accessToken) return

    try {
      setIsLoading(true)
      const octokit = new Octokit({ auth: session.accessToken })

      // 从 GitHub 仓库加载好友列表
      try {
        const response = await octokit.repos.getContent({
          owner: session.user.login,
          repo: 'dock-chat-data',
          path: 'friends.json',
          ref: 'main'
        })

        const content = Buffer.from(response.data.content, 'base64').toString()
        const data = JSON.parse(content)
        setFriends(data.friends || [])
      } catch (error) {
        if (error.status !== 404) {
          console.error('Error loading friends:', error)
        }
        setFriends([])
      }
    } catch (error) {
      console.error('Error loading friends:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // 搜索用户
  const searchUsers = async () => {
    if (!searchQuery.trim() || !session?.accessToken) return

    try {
      setIsSearching(true)
      const octokit = new Octokit({ auth: session.accessToken })
      const { data } = await octokit.search.users({
        q: searchQuery,
        per_page: 10
      })

      // 过滤掉已经是好友的用户
      const filteredResults = data.items.filter(user => 
        !friends.some(friend => friend.id === user.id)
      )

      setSearchResults(filteredResults)
    } catch (error) {
      console.error('Error searching users:', error)
      alert('搜索用户失败，请重试')
    } finally {
      setIsSearching(false)
    }
  }

  // 添加好友
  const addFriend = async (user) => {
    if (!session?.accessToken) return

    try {
      const octokit = new Octokit({ auth: session.accessToken })

      // 获取完整的用户信息
      const { data: userDetails } = await octokit.users.getByUsername({
        username: user.login
      })

      // 创建新好友对象
      const newFriend = {
        id: userDetails.id,
        login: userDetails.login,
        name: userDetails.name || userDetails.login,
        avatar_url: userDetails.avatar_url,
        added_at: new Date().toISOString()
      }

      // 更新好友列表
      const updatedFriends = [...friends, newFriend]

      // 保存到 GitHub
      const content = Buffer.from(JSON.stringify({ friends: updatedFriends }, null, 2)).toString('base64')

      try {
        const currentFile = await octokit.repos.getContent({
          owner: session.user.login,
          repo: 'dock-chat-data',
          path: 'friends.json',
          ref: 'main'
        })

        await octokit.repos.createOrUpdateFileContents({
          owner: session.user.login,
          repo: 'dock-chat-data',
          path: 'friends.json',
          message: '添加新好友',
          content,
          sha: currentFile.data.sha,
          branch: 'main'
        })
      } catch (error) {
        if (error.status === 404) {
          await octokit.repos.createOrUpdateFileContents({
            owner: session.user.login,
            repo: 'dock-chat-data',
            path: 'friends.json',
            message: '创建好友列表',
            content,
            branch: 'main'
          })
        } else {
          throw error
        }
      }

      // 更新本地状态
      setFriends(updatedFriends)
      setSearchResults(prev => prev.filter(u => u.id !== user.id))

      // 创建私聊聊天室
      const chatRoomId = `private-${session.user.id}-${userDetails.id}`
      const chatRoom = {
        id: chatRoomId,
        name: `与 ${userDetails.name || userDetails.login} 的私聊`,
        type: 'private',
        participants: [session.user.id, userDetails.id],
        created_at: new Date().toISOString(),
        messages: []
      }

      // 保存聊天室信息
      const chatRoomContent = Buffer.from(JSON.stringify(chatRoom, null, 2)).toString('base64')
      await octokit.repos.createOrUpdateFileContents({
        owner: session.user.login,
        repo: 'dock-chat-data',
        path: `chats/${chatRoomId}.json`,
        message: `创建与 ${userDetails.login} 的私聊聊天室`,
        content: chatRoomContent,
        branch: 'main'
      })

      // 通知父组件创建了新的私聊
      if (onStartPrivateChat) {
        onStartPrivateChat(newFriend)
      }

      alert('添加好友成功！')
    } catch (error) {
      console.error('Error adding friend:', error)
      alert('添加好友失败，请重试')
    }
  }

  // 在组件加载时加载好友列表
  useEffect(() => {
    loadFriends()
  }, [session])

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">好友列表</h2>
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索用户..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          </div>
          <button
            onClick={searchUsers}
            disabled={!searchQuery.trim() || isSearching}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
          >
            {isSearching ? '搜索中...' : '搜索'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {searchResults.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">搜索结果</h3>
            <div className="space-y-2">
              {searchResults.map(user => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
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
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{user.login}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">GitHub 用户</p>
                    </div>
                  </div>
                  <button
                    onClick={() => addFriend(user)}
                    className="p-2 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/50 rounded-lg"
                  >
                    <UserPlusIcon className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">我的好友</h3>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : friends.length > 0 ? (
            <div className="space-y-2">
              {friends.map(friend => (
                <div
                  key={friend.id}
                  className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-center gap-3">
                    <Image
                      src={friend.avatar_url}
                      alt={friend.name}
                      width={40}
                      height={40}
                      className="rounded-full"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{friend.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">@{friend.login}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => onStartPrivateChat(friend)}
                    className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/50 rounded-lg"
                  >
                    发起私聊
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">暂无好友</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 