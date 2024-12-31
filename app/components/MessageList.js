'use client'

import { useEffect, useRef } from 'react'
import Image from 'next/image'

export default function MessageList({ messages, currentUser, isLoading, isSending }) {
  const messagesEndRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.length === 0 ? (
        <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
          暂无消息
        </div>
      ) : (
        <>
          {messages.map((message, index) => (
            <div
              key={message.id || index}
              className={`flex items-start space-x-3 ${
                message.sender === currentUser ? 'flex-row-reverse space-x-reverse' : ''
              }`}
            >
              <Image
                src={message.avatar || '/default-avatar.png'}
                alt={message.sender}
                width={40}
                height={40}
                className="rounded-full"
              />
              <div
                className={`flex flex-col ${
                  message.sender === currentUser ? 'items-end' : 'items-start'
                }`}
              >
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {message.sender}
                </span>
                <div
                  className={`mt-1 px-4 py-2 rounded-lg ${
                    message.type === 'error'
                      ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                      : message.sender === currentUser
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 dark:text-white'
                  }`}
                >
                  {message.content}
                </div>
                <span className="text-xs text-gray-400 mt-1">
                  {new Date(message.createdAt).toLocaleTimeString()}
                </span>
              </div>
            </div>
          ))}
          {isSending && (
            <div className="flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span className="ml-2 text-sm text-gray-500">正在发送...</span>
            </div>
          )}
        </>
      )}
      <div ref={messagesEndRef} />
    </div>
  )
}