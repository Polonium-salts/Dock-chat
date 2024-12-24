'use client'

import { useState, useEffect } from 'react'
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

  useEffect(() => {
    if (session) {
      const socket = io(getBaseUrl(), {
        path: '/api/socket',
      })
      setSocket(socket)

      socket.on('connect', () => {
        setIsConnected(true)
      })

      socket.on('message', (message) => {
        setMessages((prev) => [...prev, message])
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
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <div className="w-full max-w-md space-y-4">
          <h1 className="text-2xl font-bold text-center">Welcome to Telegraph Chat</h1>
          <button
            onClick={() => signIn('github')}
            className="w-full flex items-center justify-center gap-2 p-2 bg-gray-900 text-white rounded hover:bg-gray-800"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            Sign in with GitHub
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-4xl mx-auto p-4 flex justify-between items-center">
          <h1 className="text-xl font-semibold">Telegraph Chat</h1>
          <div className="flex items-center gap-4">
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
              className="px-4 py-2 text-sm bg-gray-100 rounded hover:bg-gray-200"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto p-4">
        <div className="bg-white rounded-lg shadow-lg h-[calc(100vh-200px)] flex flex-col">
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
                        : 'bg-gray-200'
                    }`}
                  >
                    <p className="text-sm font-semibold">{message.user.name}</p>
                    <p>{message.content}</p>
                    <p className="text-xs opacity-75">
                      {new Date(message.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={sendMessage} className="p-4 border-t">
            <div className="flex space-x-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="flex-1 p-2 border rounded-lg"
                placeholder="Type a message..."
              />
              <button
                type="submit"
                className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                <PaperAirplaneIcon className="h-5 w-5" />
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
