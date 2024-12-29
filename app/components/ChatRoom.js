'use client'

import { useState, useEffect, useRef } from 'react'
import { UserCircleIcon, PaperAirplaneIcon, Cog6ToothIcon } from '@heroicons/react/24/solid'
import Image from 'next/image'

export default function ChatRoom({ room, messages, onSendMessage, onLoadMore, hasMore, onOpenSettings }) {
  const [messageInput, setMessageInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef(null)
  const containerRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleScroll = (e) => {
    const container = e.target
    if (container.scrollTop === 0 && hasMore && !isLoading) {
      loadMoreMessages()
    }
  }

  const loadMoreMessages = async () => {
    if (isLoading || !hasMore) return
    setIsLoading(true)
    try {
      const scrollHeight = containerRef.current.scrollHeight
      await onLoadMore()
      // 保持滚动位置
      const newScrollHeight = containerRef.current.scrollHeight
      containerRef.current.scrollTop = newScrollHeight - scrollHeight
    } catch (error) {
      console.error('Error loading messages:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!messageInput.trim() || isLoading) return

    setIsLoading(true)
    try {
      await onSendMessage(messageInput.trim())
      setMessageInput('')
    } catch (error) {
      console.error('Error sending message:', error)
      alert('发送消息失败，请重试')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div>
          <h2 className="font-medium text-gray-900 dark:text-white">{room.name}</h2>
          {room.description && (
            <p className="text-sm text-gray-500 dark:text-gray-400">{room.description}</p>
          )}
        </div>
        {onOpenSettings && (
          <button
            onClick={onOpenSettings}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <Cog6ToothIcon className="w-5 h-5" />
          </button>
        )}
      </div>

      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
        onScroll={handleScroll}
      >
        {isLoading && hasMore && (
          <div className="text-center py-2">
            <span className="text-gray-500 dark:text-gray-400">加载更多消息...</span>
          </div>
        )}
        
        {messages.map((message, index) => (
          <div
            key={message.id}
            className={`flex ${
              message.isSelf ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[70%] flex ${
                message.isSelf ? 'flex-row-reverse' : 'flex-row'
              } items-start gap-2`}
            >
              {message.isSelf ? null : (
                <div className="flex-shrink-0">
                  {message.sender.avatar ? (
                    <Image
                      src={message.sender.avatar}
                      alt={message.sender.name}
                      width={32}
                      height={32}
                      className="rounded-full"
                    />
                  ) : (
                    <UserCircleIcon className="w-8 h-8 text-gray-400" />
                  )}
                </div>
              )}
              <div
                className={`px-4 py-2 rounded-lg ${
                  message.isSelf
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                }`}
              >
                {!message.isSelf && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                    {message.sender.name}
                  </p>
                )}
                <p className="whitespace-pre-wrap break-words">{message.content}</p>
                <span className="text-xs opacity-70 mt-1 block">
                  {new Date(message.timestamp).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex gap-2">
          <input
            type="text"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            placeholder="输入消息..."
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !messageInput.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <PaperAirplaneIcon className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  )
} 