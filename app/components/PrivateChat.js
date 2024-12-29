'use client'

import { useState, useEffect, useRef } from 'react'
import { UserCircleIcon, PaperAirplaneIcon } from '@heroicons/react/24/solid'
import Image from 'next/image'

export default function PrivateChat({ friend, messages, onSendMessage, onLoadMore, hasMore }) {
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
      <div className="flex items-center p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          {friend.avatar ? (
            <Image
              src={friend.avatar}
              alt={friend.name}
              width={40}
              height={40}
              className="rounded-full"
            />
          ) : (
            <UserCircleIcon className="w-10 h-10 text-gray-400" />
          )}
          <div>
            <h2 className="font-medium text-gray-900 dark:text-white">{friend.name}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">@{friend.username}</p>
          </div>
        </div>
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
                  {friend.avatar ? (
                    <Image
                      src={friend.avatar}
                      alt={friend.name}
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