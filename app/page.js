'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession, signIn, signOut } from 'next-auth/react'
import { io } from 'socket.io-client'
import { PaperAirplaneIcon } from '@heroicons/react/24/solid'
import Image from 'next/image'

// 获取当前环境的 URL
const getBaseUrl = () => {
  if (typeof window !== 'undefined') return '' // 浏览器端使用相对路径
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}` // Vercel 环境
  return 'http://localhost:3000' // 开发环境
}

export default function Home() {
  const { data: session, status } = useSession()
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [socket, setSocket] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // 加载历史消息
  useEffect(() => {
    const loadMessages = async () => {
      if (session) {
        try {
          const response = await fetch('/api/messages')
          if (response.ok) {
            const data = await response.json()
            setMessages(data)
          }
        } catch (error) {
          console.error('Failed to load messages:', error)
        } finally {
          setIsLoading(false)
        }
      }
    }

    loadMessages()
  }, [session])

  // 自动滚动到底部
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (session) {
      const socket = io(getBaseUrl(), {
        path: '/api/socket',
      })
      setSocket(socket)

      socket.on('connect', () => {
        setIsConnected(true)
        console.log('Socket connected')
      })

      socket.on('message', (message) => {
        setMessages((prev) => [...prev, message])
      })

      socket.on('error', (error) => {
        console.error('Socket error:', error)
      })

      return () => {
        socket.disconnect()
      }
    }
  }, [session])

  const sendMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() || !session) return

    const message = {
      content: newMessage,
      user: {
        name: session.user.name,
        image: session.user.image,
        id: session.user.id
      },
      createdAt: new Date().toISOString(),
    }

    try {
      socket?.emit('message', message)
      setNewMessage('')
    } catch (error) {
      console.error('Failed to send message:', error)
    }
  }

  if (status === 'loading' || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-xl font-semibold text-gray-600">
          <div className="animate-pulse flex items-center gap-2">
            <div className="h-2 w-2 bg-blue-500 rounded-full animate-bounce"></div>
            <div className="h-2 w-2 bg-blue-500 rounded-full animate-bounce delay-75"></div>
            <div className="h-2 w-2 bg-blue-500 rounded-full animate-bounce delay-150"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50 p-4">
        <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-2xl shadow-lg">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Telegraph Chat</h1>
            <p className="text-gray-500">实时聊天，随时交流</p>
          </div>
          <button
            onClick={() => signIn('github')}
            className="w-full flex items-center justify-center gap-3 p-3 bg-[#24292F] text-white rounded-lg hover:bg-[#24292F]/90 transition-colors duration-200"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            使用 GitHub 登录
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <header className="bg-white shadow-sm fixed w-full top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">Telegraph Chat</h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 bg-gray-50 px-3 py-1.5 rounded-full">
              <Image
                src={session.user.image}
                alt={session.user.name}
                width={32}
                height={32}
                className="rounded-full ring-2 ring-white"
              />
              <span className="text-sm font-medium text-gray-700">{session.user.name}</span>
            </div>
            <button
              onClick={() => signOut()}
              className="px-4 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors duration-200"
            >
              退出登录
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 mt-16 mb-4">
        <div className="bg-white rounded-2xl shadow-sm h-[calc(100vh-8rem)] flex flex-col">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {messages.map((message, index) => (
              <div
                key={message.id || index}
                className={`flex ${
                  message.user.id === session.user.id ? 'justify-end' : 'justify-start'
                }`}
              >
                <div className={`flex items-start gap-3 max-w-[70%] ${
                  message.user.id === session.user.id ? 'flex-row-reverse' : ''
                }`}>
                  <Image
                    src={message.user.image}
                    alt={message.user.name}
                    width={40}
                    height={40}
                    className="rounded-full ring-2 ring-white"
                  />
                  <div className={`flex flex-col ${
                    message.user.id === session.user.id ? 'items-end' : 'items-start'
                  }`}>
                    <div className={`rounded-2xl p-4 ${
                      message.user.id === session.user.id
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}>
                      <p className="text-sm font-medium mb-1">{message.user.name}</p>
                      <p className="text-base">{message.content}</p>
                    </div>
                    <span className="text-xs text-gray-500 mt-1">
                      {new Date(message.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={sendMessage} className="p-4 border-t border-gray-100">
            <div className="flex items-center gap-4">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="flex-1 px-4 py-3 text-gray-700 bg-gray-50 rounded-xl border-0 focus:ring-2 focus:ring-blue-500 transition-shadow duration-200"
                placeholder="输入消息..."
              />
              <button
                type="submit"
                disabled={!isConnected}
                className="p-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                <PaperAirplaneIcon className="h-6 w-6" />
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
