'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import { ChatBubbleLeftRightIcon, UserPlusIcon } from '@heroicons/react/24/outline'
import CreateRoomModal from './components/CreateRoomModal'
import AddFriendModal from './components/AddFriendModal'
import FriendsPage from './components/FriendsPage'
import ChatRoom from './components/ChatRoom'
import { useRooms } from '@/lib/hooks'

export default function Home() {
  const { data: session } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showFriendsModal, setShowFriendsModal] = useState(false)
  const [showAddFriendModal, setShowAddFriendModal] = useState(false)
  const [currentRoom, setCurrentRoom] = useState(null)
  const [error, setError] = useState('')
  
  // 使用自定义hook获取聊天室列表
  const { rooms, isLoading, mutate } = useRooms(session)

  // 从URL中获取当前聊天室信息
  useEffect(() => {
    if (pathname && rooms) {
      const [username, roomId] = pathname.split('/').filter(Boolean)
      if (username && roomId) {
        const room = rooms.find(r => r.id === roomId)
        if (room) {
          setCurrentRoom(room)
        }
      }
    }
  }, [pathname, rooms])

  // 创建聊天室
  const handleCreateRoom = async (roomData) => {
    try {
      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(roomData),
      })

      if (!response.ok) {
        throw new Error('创建聊天室失败')
      }

      const room = await response.json()
      
      // 更新聊天室列表
      mutate()
      
      // 跳转到新创建的聊天室
      router.push(`/${session.user.login}/${room.id}`)
      
      setShowCreateModal(false)
    } catch (err) {
      console.error('Failed to create room:', err)
      setError(err.message)
    }
  }

  // 加入聊天室
  const handleJoinRoom = async (roomId) => {
    try {
      const response = await fetch(`/api/rooms/${roomId}/join`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('加入聊天室失败')
      }

      // 更新聊天室列表
      mutate()
      
      // 跳转到加入的聊天室
      router.push(`/${session.user.login}/${roomId}`)
    } catch (err) {
      console.error('Failed to join room:', err)
      setError(err.message)
    }
  }

  // 发送好友请求
  const handleSendFriendRequest = async (userId, note) => {
    try {
      const response = await fetch('/api/friends/requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, note }),
      })

      if (!response.ok) {
        throw new Error('发送好友请求失败')
      }

      setShowAddFriendModal(false)
    } catch (err) {
      console.error('Failed to send friend request:', err)
      setError(err.message)
    }
  }

  // 处理好友请求
  const handleFriendRequest = async (requestId, action) => {
    try {
      const response = await fetch(`/api/friends/requests/${requestId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      })

      if (!response.ok) {
        throw new Error('处理好友请求失败')
      }

      // 更新好友列表
      mutate()
    } catch (err) {
      console.error('Failed to handle friend request:', err)
      setError(err.message)
    }
  }

  if (!session) {
    return null
  }

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      {/* 左侧栏 */}
      <div className="w-64 flex flex-col bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
        {/* 用户信息 */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <img
              src={session.user.image}
              alt={session.user.name}
              className="w-10 h-10 rounded-full"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {session.user.name}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                @{session.user.login}
              </p>
            </div>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="p-4 space-y-2">
          <button
            onClick={() => setShowCreateModal(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            <ChatBubbleLeftRightIcon className="w-5 h-5" />
            创建聊天室
          </button>
          <button
            onClick={() => setShowFriendsModal(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
          >
            <UserPlusIcon className="w-5 h-5" />
            好友管理
          </button>
        </div>

        {/* 聊天室列表 */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            {isLoading ? (
              <div className="text-center text-gray-500 dark:text-gray-400">
                加载中...
              </div>
            ) : rooms?.length > 0 ? (
              rooms.map(room => (
                <button
                  key={room.id}
                  onClick={() => router.push(`/${session.user.login}/${room.id}`)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                    currentRoom?.id === room.id
                      ? 'bg-blue-50 dark:bg-blue-900/20'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <div className="flex-1 min-w-0 text-left">
                    <p className={`font-medium truncate ${
                      currentRoom?.id === room.id
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-gray-900 dark:text-white'
                    }`}>
                      {room.name}
                    </p>
                    {room.description && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {room.description}
                      </p>
                    )}
                  </div>
                </button>
              ))
            ) : (
              <div className="text-center text-gray-500 dark:text-gray-400">
                暂无聊天室
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col">
        {currentRoom ? (
          <ChatRoom
            room={currentRoom}
            session={session}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-xl font-medium text-gray-900 dark:text-white">
                欢迎使用 Dock Chat
              </h2>
              <p className="mt-2 text-gray-500 dark:text-gray-400">
                选择一个聊天室开始聊天，或者创建一个新的聊天室
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                <ChatBubbleLeftRightIcon className="w-5 h-5" />
                创建聊天室
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 模态框 */}
      {showCreateModal && (
        <CreateRoomModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateRoom}
          session={session}
        />
      )}

      {showFriendsModal && (
        <FriendsPage
          session={session}
          onClose={() => setShowFriendsModal(false)}
          onAddFriend={() => {
            setShowFriendsModal(false)
            setShowAddFriendModal(true)
          }}
        />
      )}

      {showAddFriendModal && (
        <AddFriendModal
          isOpen={showAddFriendModal}
          onClose={() => setShowAddFriendModal(false)}
          onSubmit={handleSendFriendRequest}
          session={session}
        />
      )}

      {/* 错误提示 */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
          <button
            onClick={() => setError('')}
            className="ml-2 font-bold"
          >
            ×
          </button>
        </div>
      )}
    </div>
  )
}

