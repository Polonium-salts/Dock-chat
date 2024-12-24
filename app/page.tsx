'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession, signIn, signOut } from 'next-auth/react'
import { io, Socket } from 'socket.io-client'
import { PaperAirplaneIcon, UserGroupIcon } from '@heroicons/react/24/solid'
import Image from 'next/image'
import ChatMessage from '@/components/ChatMessage'
import { Message, User, ChatState } from '@/types/chat'

const getBaseUrl = () => {
  if (typeof window !== 'undefined') return ''
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'http://localhost:3000'
}

export default function Home() {
  const { data: session, status } = useSession()
  const [chatState, setChatState] = useState<ChatState>({
    messages: [],
    onlineUsers: [],
    isConnected: false,
    showUserList: false
  })
  const [newMessage, setNewMessage] = useState('')
  const [socket, setSocket] = useState<Socket | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [chatState.messages])

  useEffect(() => {
    if (session?.user) {
      const socket = io(getBaseUrl(), {
        path: '/api/socket',
      })
      setSocket(socket)

      socket.on('connect', () => {
        setChatState(prev => ({ ...prev, isConnected: true }))
        socket.emit('user:join', {
          id: session.user.id,
          name: session.user.name,
          image: session.user.image
        })
      })

      socket.on('message', (message: Message) => {
        setChatState(prev => ({
          ...prev,
          messages: [...prev.messages, message]
        }))
      })

      socket.on('users:update', (users: User[]) => {
        setChatState(prev => ({ ...prev, onlineUsers: users }))
      })

      socket.on('messages:history', (history: Message[]) => {
        setChatState(prev => ({ ...prev, messages: history }))
      })

      return () => {
        socket.disconnect()
      }
    }
  }, [session])

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !session?.user) return

    const message: Message = {
      id: Date.now().toString(),
      content: newMessage,
      user: {
        id: session.user.id,
        name: session.user.name,
        image: session.user.image as string
      },
      createdAt: new Date().toISOString(),
      type: 'text'
    }

    socket?.emit('message', message)
    setNewMessage('')
  }

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-xl text-gray-600">加载中...</div>
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
      <header className="bg-white shadow-sm">
        <div className="max-w-5xl mx-auto p-4 flex justify-between items-center">
          <h1 className="text-xl font-semibold text-gray-900">Telegraph Chat</h1>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setChatState(prev => ({ ...prev, showUserList: !prev.showUserList }))}
              className="p-2 hover:bg-gray-100 rounded-full relative transition-colors"
            >
              <UserGroupIcon className="h-6 w-6 text-gray-600" />
              <span className="absolute -top-1 -right-1 bg-green-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {chatState.onlineUsers.length}
              </span>
            </button>
            <div className="flex items-center gap-2">
              <Image
                src={session.user.image!}
                alt={session.user.name!}
                width={32}
                height={32}
                className="rounded-full ring-2 ring-white"
              />
              <span className="text-gray-700">{session.user.name}</span>
            </div>
            <button
              onClick={() => signOut()}
              className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              退出登录
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 flex">
        <div className="flex-1 bg-white rounded-lg shadow-sm flex flex-col">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {chatState.messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                isOwnMessage={message.user.id === session.user.id}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={sendMessage} className="p-4 border-t border-gray-100">
            <div className="flex space-x-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="flex-1 p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="输入消息..."
              />
              <button
                type="submit"
                className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!newMessage.trim() || !chatState.isConnected}
              >
                <PaperAirplaneIcon className="h-5 w-5" />
              </button>
            </div>
          </form>
        </div>

        {chatState.showUserList && (
          <div className="w-64 ml-4 bg-white rounded-lg shadow-sm p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              在线用户 ({chatState.onlineUsers.length})
            </h2>
            <div className="space-y-3">
              {chatState.onlineUsers.map((user) => (
                <div key={user.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50">
                  <Image
                    src={user.image}
                    alt={user.name}
                    width={24}
                    height={24}
                    className="rounded-full"
                  />
                  <span className="text-sm text-gray-700">{user.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
} 