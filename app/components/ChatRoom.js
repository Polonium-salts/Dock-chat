'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { 
  PaperAirplaneIcon,
  EllipsisHorizontalIcon,
  UserGroupIcon,
  Cog6ToothIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'
import { useMessages } from '@/lib/hooks'

export default function ChatRoom({ room, session }) {
  const router = useRouter()
  const messagesEndRef = useRef(null)
  const [newMessage, setNewMessage] = useState('')
  const [showMenu, setShowMenu] = useState(false)
  const [error, setError] = useState('')

  // 使用自定义hook获取聊天记录
  const { messages, isLoading, mutate } = useMessages(room.id)

  // 自动滚动到最新消息
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // 发送消息
  const handleSendMessage = async (e) => {
    e.preventDefault()
    
    if (!newMessage.trim()) return

    try {
      const response = await fetch(`/api/rooms/${room.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: newMessage.trim(),
          type: 'text'
        }),
      })

      if (!response.ok) {
        throw new Error('发送消息失败')
      }

      // 清空输入框
      setNewMessage('')
      
      // 更新消息列表
      mutate()
    } catch (err) {
      console.error('Failed to send message:', err)
      setError(err.message)
    }
  }

  // 离开聊天室
  const handleLeaveRoom = async () => {
    try {
      const response = await fetch(`/api/rooms/${room.id}/leave`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('离开聊天室失败')
      }

      router.push('/')
    } catch (err) {
      console.error('Failed to leave room:', err)
      setError(err.message)
    }
  }

  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-gray-800">
      {/* 聊天室标题栏 */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {room.name}
          </h2>
          {room.isPrivate && (
            <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-700 rounded-full">
              私密
            </span>
          )}
        </div>
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 rounded-lg transition-colors"
          >
            <EllipsisHorizontalIcon className="w-6 h-6" />
          </button>
          {showMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="py-1">
                <button
                  onClick={() => {
                    // 显示成员列表
                    setShowMenu(false)
                  }}
                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <UserGroupIcon className="w-5 h-5" />
                  成员管理
                </button>
                <button
                  onClick={() => {
                    // 显示设置
                    setShowMenu(false)
                  }}
                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <Cog6ToothIcon className="w-5 h-5" />
                  聊天室设置
                </button>
                <button
                  onClick={() => {
                    // 显示信息
                    setShowMenu(false)
                  }}
                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <InformationCircleIcon className="w-5 h-5" />
                  聊天室信息
                </button>
                <button
                  onClick={handleLeaveRoom}
                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  离开聊天室
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="text-center text-gray-500 dark:text-gray-400">
            加载中...
          </div>
        ) : messages?.length > 0 ? (
          <div className="space-y-4">
            {messages.map(message => (
              <div
                key={message.id}
                className={`flex items-start gap-4 ${
                  message.user.login === session.user.login ? 'flex-row-reverse' : ''
                }`}
              >
                <Image
                  src={message.user.image}
                  alt={message.user.name}
                  width={40}
                  height={40}
                  className="rounded-full"
                />
                <div className={`flex flex-col ${
                  message.user.login === session.user.login ? 'items-end' : ''
                }`}>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {message.user.name}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(message.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div className={`mt-1 px-4 py-2 rounded-lg ${
                    message.user.login === session.user.login
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                  }`}>
                    {message.content}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        ) : (
          <div className="text-center text-gray-500 dark:text-gray-400">
            暂无消息
          </div>
        )}
      </div>

      {/* 输入框 */}
      <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
        <form onSubmit={handleSendMessage} className="flex gap-4">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            placeholder="输入消息..."
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <PaperAirplaneIcon className="w-5 h-5" />
            发送
          </button>
        </form>
      </div>

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