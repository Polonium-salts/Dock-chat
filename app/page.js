'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession, signIn, signOut } from 'next-auth/react'
import { io } from 'socket.io-client'
import { 
  PaperAirplaneIcon,
  UserGroupIcon,
  UserCircleIcon,
  Cog6ToothIcon,
  PlusCircleIcon
} from '@heroicons/react/24/solid'
import Image from 'next/image'
import SettingsModal from './components/SettingsModal'
import ProfilePage from './components/ProfilePage'

export default function Home() {
  const { data: session, status } = useSession()
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [socket, setSocket] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [joinInput, setJoinInput] = useState('')
  const [activeChat, setActiveChat] = useState('public')
  const [contacts, setContacts] = useState([
    { id: 'public', name: '公共聊天室', type: 'room', unread: 0 },
  ])
  const messagesEndRef = useRef(null)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [currentView, setCurrentView] = useState('chat') // 'chat' 或 'profile'

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // WebSocket 连接
  useEffect(() => {
    if (session) {
      const socket = io('', {
        path: '/api/socket',
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        autoConnect: true,
        withCredentials: true,
      })

      socket.on('connect', () => {
        console.log('Socket connected')
        setIsConnected(true)
        // 加入当前聊天室
        socket.emit('join', { 
          room: activeChat,
          userId: session.user.id
        })
      })

      socket.on('connect_error', (error) => {
        console.error('Connection error:', error)
        setIsConnected(false)
      })

      socket.on('disconnect', () => {
        console.log('Socket disconnected')
        setIsConnected(false)
      })

      socket.on('error', (error) => {
        console.error('Socket error:', error)
      })

      socket.on('message', (message) => {
        setMessages((prev) => [...prev, message])
      })

      socket.on('userJoined', (data) => {
        console.log('User joined:', data)
      })

      socket.on('userLeft', (data) => {
        console.log('User left:', data)
      })

      setSocket(socket)

      // 加载历史消息
      loadMessages(activeChat)

      return () => {
        if (socket.connected) {
          socket.emit('leave', {
            room: activeChat,
            userId: session.user.id
          })
          socket.disconnect()
        }
      }
    }
  }, [session, activeChat])

  // 加载历史消息
  const loadMessages = async (roomId) => {
    try {
      const response = await fetch(`/api/messages?roomId=${roomId}`)
      const data = await response.json()
      if (response.ok) {
        setMessages(data.messages || [])
      } else {
        console.error('Failed to load messages:', data.error)
      }
    } catch (error) {
      console.error('Error loading messages:', error)
    }
  }

  const sendMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() || !session || !isConnected) return

    const message = {
      content: newMessage,
      user: {
        name: session.user.name,
        image: session.user.image,
        id: session.user.id
      },
      room: activeChat,
      createdAt: new Date().toISOString(),
    }

    try {
      socket?.emit('message', message)
      setNewMessage('')
    } catch (error) {
      console.error('Failed to send message:', error)
    }
  }

  const handleJoin = async (e) => {
    e.preventDefault()
    if (!joinInput.trim()) return

    const newContact = {
      id: joinInput,
      name: `聊天室 ${joinInput}`,
      type: 'room',
      unread: 0
    }

    try {
      // 创建新的聊天室
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomId: joinInput,
          name: `聊天室 ${joinInput}`
        })
      })

      if (response.ok) {
        setContacts(prev => [...prev, newContact])
        setJoinInput('')
        setShowJoinModal(false)
        // 切换到新的聊天室
        setActiveChat(joinInput)
      } else {
        console.error('Failed to create chat room')
      }
    } catch (error) {
      console.error('Error creating chat room:', error)
    }
  }

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-pulse flex items-center justify-center space-x-2">
            <div className="h-3 w-3 bg-blue-500 rounded-full"></div>
            <div className="h-3 w-3 bg-blue-500 rounded-full"></div>
            <div className="h-3 w-3 bg-blue-500 rounded-full"></div>
          </div>
          <p className="mt-4 text-sm text-gray-500">正在加载...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
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
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* 侧边栏 */}
      <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            {session.user.image && (
              <Image
                src={session.user.image}
                alt={session.user.name || '用户头像'}
                width={40}
                height={40}
                className="rounded-full"
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {session.user.name || '用户'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">在线</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {contacts.map(contact => (
            <button
              key={contact.id}
              onClick={() => setActiveChat(contact.id)}
              className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors ${
                activeChat === contact.id
                  ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200'
              }`}
            >
              <UserGroupIcon className="w-5 h-5" />
              <span className="flex-1 text-left text-sm font-medium truncate">
                {contact.name}
              </span>
              {contact.unread > 0 && (
                <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {contact.unread}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="p-3 border-t border-gray-200 dark:border-gray-700 space-y-2">
          <button
            onClick={() => setCurrentView(currentView === 'chat' ? 'profile' : 'chat')}
            className={`w-full flex items-center justify-center gap-2 p-2 text-sm font-medium ${
              currentView === 'profile'
                ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/50'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
            } rounded-lg transition-colors`}
          >
            {currentView === 'chat' ? (
              <UserCircleIcon className="w-5 h-5" />
            ) : (
              <UserGroupIcon className="w-5 h-5" />
            )}
            {currentView === 'chat' ? '个人主页' : '返回聊天'}
          </button>
          <button
            onClick={() => setShowJoinModal(true)}
            className="w-full flex items-center justify-center gap-2 p-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/50 rounded-lg transition-colors"
          >
            <PlusCircleIcon className="w-5 h-5" />
            加���聊天室
          </button>
          <button
            onClick={() => setShowSettingsModal(true)}
            className="w-full flex items-center justify-center gap-2 p-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <Cog6ToothIcon className="w-5 h-5" />
            设置
          </button>
        </div>
      </div>

      {/* 主聊天区域 */}
      <div className="flex-1 flex flex-col">
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
          <div className="px-4 py-3">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
              {currentView === 'chat' 
                ? (contacts.find(c => c.id === activeChat)?.name || '聊天室')
                : '个人主页'
              }
            </h1>
          </div>
        </header>

        <main className="flex-1 p-4 overflow-hidden">
          {currentView === 'chat' ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm h-full flex flex-col">
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${
                      message.user.id === session.user.id ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div className={`flex items-start gap-3 max-w-[70%] ${
                      message.user.id === session.user.id ? 'flex-row-reverse' : ''
                    }`}>
                      {message.user.image && (
                        <Image
                          src={message.user.image}
                          alt={message.user.name || '用户头像'}
                          width={40}
                          height={40}
                          className="rounded-full"
                        />
                      )}
                      <div className={`flex flex-col ${
                        message.user.id === session.user.id ? 'items-end' : 'items-start'
                      }`}>
                        <div className={`rounded-2xl p-4 ${
                          message.user.id === session.user.id
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                        }`}>
                          <p className="text-sm font-medium mb-1">{message.user.name}</p>
                          <p className="text-base">{message.content}</p>
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {new Date(message.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={sendMessage} className="p-4 border-t border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-4">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="flex-1 px-4 py-3 text-gray-700 dark:text-white bg-gray-50 dark:bg-gray-700 rounded-xl border-0 focus:ring-2 focus:ring-blue-500"
                    placeholder="输入消息..."
                  />
                  <button
                    type="submit"
                    disabled={!isConnected}
                    className="p-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <PaperAirplaneIcon className="h-6 w-6" />
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <ProfilePage session={session} />
          )}
        </main>
      </div>

      {/* 加入聊天室模态框 */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">加入聊天室</h2>
            <form onSubmit={handleJoin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  输入聊天室 ID 或 IP 地址
                </label>
                <input
                  type="text"
                  value={joinInput}
                  onChange={(e) => setJoinInput(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="例如：room-123 或 192.168.1.1"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowJoinModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-lg"
                >
                  加入
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showSettingsModal && (
        <SettingsModal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          session={session}
        />
      )}
    </div>
  )
}
