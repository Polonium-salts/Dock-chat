'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useNotification } from '../contexts/NotificationContext'
import Image from 'next/image'
import { UserPlusIcon, UserMinusIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline'

export default function FriendsPage() {
  const { data: session } = useSession()
  const { showNotification } = useNotification()
  const [friends, setFriends] = useState([])
  const [requests, setRequests] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  // 加载好友列表和好友请求
  useEffect(() => {
    if (session) {
      loadFriends()
      loadFriendRequests()
    }
  }, [session])

  // 加载好友列表
  const loadFriends = async () => {
    try {
      const response = await fetch('/api/friends')
      if (!response.ok) {
        throw new Error('加载好友列表失败')
      }
      const data = await response.json()
      setFriends(data)
    } catch (err) {
      console.error('Failed to load friends:', err)
      showNotification('error', '加载失败', err.message)
    }
  }

  // 加载好友请求
  const loadFriendRequests = async () => {
    try {
      const response = await fetch('/api/friends/requests')
      if (!response.ok) {
        throw new Error('加载好友请求失败')
      }
      const data = await response.json()
      setRequests(data)
    } catch (err) {
      console.error('Failed to load friend requests:', err)
      showNotification('error', '加载失败', err.message)
    } finally {
      setIsLoading(false)
    }
  }

  // 接受好友请求
  const acceptRequest = async (requestId) => {
    try {
      const response = await fetch(`/api/friends/requests/${requestId}/accept`, {
        method: 'POST',
      })
      if (!response.ok) {
        throw new Error('接受好友请求失败')
      }
      showNotification('success', '已接受', '已成功添加好友')
      loadFriends()
      loadFriendRequests()
    } catch (err) {
      console.error('Failed to accept friend request:', err)
      showNotification('error', '操作失败', err.message)
    }
  }

  // 拒绝好友请求
  const rejectRequest = async (requestId) => {
    try {
      const response = await fetch(`/api/friends/requests/${requestId}/reject`, {
        method: 'POST',
      })
      if (!response.ok) {
        throw new Error('拒绝好友请求失败')
      }
      showNotification('success', '已拒绝', '已拒绝好友请求')
      loadFriendRequests()
    } catch (err) {
      console.error('Failed to reject friend request:', err)
      showNotification('error', '操作失败', err.message)
    }
  }

  // 删除好友
  const removeFriend = async (friendId) => {
    try {
      const response = await fetch(`/api/friends/${friendId}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        throw new Error('删除好友失败')
      }
      showNotification('success', '已删除', '已成功删除好友')
      loadFriends()
    } catch (err) {
      console.error('Failed to remove friend:', err)
      showNotification('error', '操作失败', err.message)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* 好友请求列表 */}
      {requests.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            好友请求
          </h2>
          <div className="space-y-3">
            {requests.map(request => (
              <div
                key={request.id}
                className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg shadow"
              >
                <div className="flex items-center space-x-4">
                  <Image
                    src={request.sender.image}
                    alt={request.sender.name}
                    width={48}
                    height={48}
                    className="rounded-full"
                  />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {request.sender.name}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      @{request.sender.login}
                    </p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => acceptRequest(request.id)}
                    className="p-2 text-green-600 hover:bg-green-100 dark:hover:bg-green-900 rounded-full"
                    title="接受"
                  >
                    <CheckIcon className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => rejectRequest(request.id)}
                    className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900 rounded-full"
                    title="拒绝"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 好友列表 */}
      <div>
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
          我的好友
        </h2>
        {friends.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {friends.map(friend => (
              <div
                key={friend.id}
                className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg shadow"
              >
                <div className="flex items-center space-x-4">
                  <Image
                    src={friend.image}
                    alt={friend.name}
                    width={48}
                    height={48}
                    className="rounded-full"
                  />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {friend.name}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      @{friend.login}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => removeFriend(friend.login)}
                  className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900 rounded-full"
                  title="删除好友"
                >
                  <UserMinusIcon className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            暂无好友
          </div>
        )}
      </div>
    </div>
  )
} 