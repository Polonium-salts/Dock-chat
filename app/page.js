'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession, signIn, signOut } from 'next-auth/react'
import { io } from 'socket.io-client'
import { PaperAirplaneIcon, UserGroupIcon } from '@heroicons/react/24/solid'
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
  const [onlineUsers, setOnlineUsers] = useState([])
  const [showUserList, setShowUserList] = useState(false)
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

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
        // 发送用户信息到服务器
        socket.emit('user:join', {
          id: session.user.id,
          name: session.user.name,
          image: session.user.image
        })
      })

      socket.on('message', (message) => {
        setMessages((prev) => [...prev, message])
      })

      socket.on('users:update', (users) => {
        setOnlineUsers(users)
      })

      // 加载历史消息
      socket.on('messages:history', (history) => {
        setMessages(history)
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

    socket?.emit('message', message)
    setNewMessage('')
  }

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-50">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Telegraph Chat</h1>
            <p className="text-gray-600">使用 GitHub 账号登录开始聊天</p>
          </div>
          <button
            onClick={() => signIn('github')}
            className="w-full flex items-center justify-center gap-3 p-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
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
      <header className="bg-white shadow">
        <div className="max-w-5xl mx-auto p-4 flex justify-between items-center">
          <h1 className="text-xl font-semibold">Telegraph Chat</h1>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowUserList(!showUserList)}
              className="p-2 hover:bg-gray-100 rounded-full relative"
            >
              <UserGroupIcon className="h-6 w-6 text-gray-600" />
              <span className="absolute -top-1 -right-1 bg-green-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {onlineUsers.length}
              </span>
            </button>
            <div className="flex items-center gap-2">
              <Image
                src={session.user.image}
                alt={session.user.name}
                width={32}
                height={32}
                className="rounded-full"
              />
              <span>{session.user.name}</span>
            </div>
            <button
              onClick={() => signOut()}
              className="px-4 py-2 text-sm bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              退出登录
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 flex">
        {/* 聊天区域 */}
        <div className="flex-1 bg-white rounded-lg shadow-lg flex flex-col">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${
                  message.user.id === session.user.id ? 'justify-end' : 'justify-start'
                }`}
              >
                <div className="flex items-start gap-2 max-w-[70%]">
                  <Image
                    src={message.user.image}
                    alt={message.user.name}
                    width={32}
                    height={32}
                    className="rounded-full"
                  />
                  <div
                    className={`rounded-lg p-3 ${
                      message.user.id === session.user.id
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100'
                    }`}
                  >
                    <p className="text-sm font-semibold">{message.user.name}</p>
                    <p className="break-words">{message.content}</p>
                    <p className="text-xs opacity-75 mt-1">
                      {new Date(message.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={sendMessage} className="p-4 border-t">
            <div className="flex space-x-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="输入消息..."
              />
              <button
                type="submit"
                className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                disabled={!newMessage.trim()}
              >
                <PaperAirplaneIcon className="h-5 w-5" />
              </button>
            </div>
          </form>
        </div>

        {/* 在线用户列表 */}
        {showUserList && (
          <div className="w-64 ml-4 bg-white rounded-lg shadow-lg p-4">
            <h2 className="text-lg font-semibold mb-4">在线用户 ({onlineUsers.length})</h2>
            <div className="space-y-3">
              {onlineUsers.map((user) => (
                <div key={user.id} className="flex items-center gap-2">
                  <Image
                    src={user.image}
                    alt={user.name}
                    width={24}
                    height={24}
                    className="rounded-full"
                  />
                  <span className="text-sm">{user.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
