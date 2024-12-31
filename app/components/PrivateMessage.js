'use client'

import { useState, useEffect, useRef } from 'react'
import { PaperAirplaneIcon, PhotoIcon } from '@heroicons/react/24/outline'
import Image from 'next/image'

export default function PrivateMessage({ friend, onSendMessage, messages = [], config }) {
  const [newMessage, setNewMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)

  // 自动滚动到最新消息
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // 处理消息发送
  const handleSendMessage = (e) => {
    e.preventDefault()
    if (!newMessage.trim()) return

    onSendMessage({
      type: 'text',
      content: newMessage,
      timestamp: new Date().toISOString(),
      status: 'sending'
    })

    setNewMessage('')
    setIsTyping(false)
  }

  // 处理图片发送
  const handleImageUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      onSendMessage({
        type: 'image',
        content: event.target.result,
        filename: file.name,
        timestamp: new Date().toISOString(),
        status: 'sending'
      })
    }
    reader.readAsDataURL(file)
  }

  // 处理输入状态
  const handleTyping = (e) => {
    setNewMessage(e.target.value)
    if (!isTyping && e.target.value) {
      setIsTyping(true)
    } else if (isTyping && !e.target.value) {
      setIsTyping(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* 聊天头部 */}
      <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Image
              src={friend.avatar || '/default-avatar.png'}
              alt={friend.name}
              width={40}
              height={40}
              className="rounded-full"
            />
            <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full ${
              friend.online ? 'bg-green-500' : 'bg-gray-500'
            }`}></span>
          </div>
          <div>
            <h2 className="font-medium text-gray-900 dark:text-white">{friend.name}</h2>
            <p className="text-sm text-gray-500">
              {friend.online ? '在线' : '离线'}
            </p>
          </div>
        </div>
      </div>

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.fromSelf ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[70%] ${message.fromSelf ? 'order-2' : 'order-1'}`}>
              {message.type === 'text' ? (
                <div className={`rounded-lg p-3 ${
                  message.fromSelf
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                }`}>
                  <p>{message.content}</p>
                </div>
              ) : (
                <div className="rounded-lg overflow-hidden">
                  <Image
                    src={message.content}
                    alt={message.filename || '图片'}
                    width={300}
                    height={200}
                    className="object-contain"
                  />
                </div>
              )}
              <div className="flex items-center mt-1 space-x-2">
                <span className="text-xs text-gray-500">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </span>
                {message.fromSelf && (
                  <span className="text-xs text-gray-500">
                    {message.status === 'sending' ? '发送中...' :
                     message.status === 'sent' ? '已发送' :
                     message.status === 'delivered' ? '已送达' :
                     message.status === 'read' ? '已读' : ''}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* 输入区域 */}
      <div className="p-4 border-t dark:border-gray-700">
        <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <PhotoIcon className="w-6 h-6" />
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageUpload}
            accept="image/*"
            className="hidden"
          />
          <input
            type="text"
            value={newMessage}
            onChange={handleTyping}
            placeholder="输入消息..."
            className="flex-1 p-2 border rounded-lg dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="p-2 text-blue-500 hover:text-blue-700 disabled:text-gray-400"
          >
            <PaperAirplaneIcon className="w-6 h-6" />
          </button>
        </form>
        {isTyping && (
          <p className="text-xs text-gray-500 mt-1">正在输入...</p>
        )}
      </div>
    </div>
  )
} 