'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useTheme } from 'next-themes'
import { io } from 'socket.io-client'
import { 
  Cog6ToothIcon,
  PlusCircleIcon,
  UserGroupIcon,
  UserIcon,
  XMarkIcon,
  PaperAirplaneIcon
} from '@heroicons/react/24/outline'
import SettingsModal from './components/SettingsModal'
import CreateRoomModal from './components/CreateRoomModal'
import { 
  updateConfig, 
  saveChatHistory 
} from '@/lib/github'
import {
  updateChatRoomsCache,
  updateUserConfigCache,
  getChatRoomsCache,
  getUserConfigCache,
  clearUserCache
} from '@/lib/cache'
import Navigation from './components/Navigation'
import JoinRoomModal from './components/JoinRoomModal'
import MessageList from './components/MessageList'
import ChatInput from './components/ChatInput'
import PrivateMessage from './components/PrivateMessage'

export default function Home({ username, roomId }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [socket, setSocket] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [joinInput, setJoinInput] = useState('')
  const [activeChat, setActiveChat] = useState('')
  const [contacts, setContacts] = useState([])
  const [privateMessages, setPrivateMessages] = useState({})
  const [activePrivateChat, setActivePrivateChat] = useState(null)
  const messagesEndRef = useRef(null)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [showKimiModal, setShowKimiModal] = useState(false)
  const [kimiApiKey, setKimiApiKey] = useState('')
  const [isWaitingForKimi, setIsWaitingForKimi] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [userConfig, setUserConfig] = useState(null)
  const [isSending, setIsSending] = useState(false)
  const [showChatSettings, setShowChatSettings] = useState(false)
  const { theme, setTheme } = useTheme()
  const [showCreateRoomModal, setShowCreateRoomModal] = useState(false)
  const ws = useRef(null)

  // 动态滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // 保存配置到 GitHub
  const saveConfig = async (updatedConfig) => {
    if (!session?.user?.login || !session.accessToken) {
      alert('请先登录')
      return
    }

    try {
      // 更新配置
      await updateConfig(session.accessToken, session.user.login, updatedConfig)
      setUserConfig(updatedConfig)
      
      // 更新主题
      if (updatedConfig.settings?.theme) {
        setTheme(updatedConfig.settings.theme)
      }

      // 更新缓存
      updateUserConfigCache(session.user.login, updatedConfig)

      alert('设置已保存')
    } catch (error) {
      console.error('Error saving config:', error)
      alert('保存设置失败，请重试')
    }
  }

  // 在相关状态变化时保存配置
  useEffect(() => {
    if (userConfig) {
      saveConfig(userConfig)
    }
  }, [kimiApiKey])

  // 修改创建聊天室的逻辑
  const handleCreateRoom = async (roomData) => {
    if (!session?.user?.login || !session.accessToken) return

    try {
      const roomId = `room-${Date.now()}`
      const newRoom = {
        id: roomId,
        name: roomData.name,
        type: 'room',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        creator: session.user.login,
        unread: 0,
        lastMessage: null
      }

      // 更新联系人列表
      const updatedContacts = [...contacts, newRoom]
      setContacts(updatedContacts)
      updateChatRoomsCache(session.user.login, updatedContacts)

      // 更新用户配置
      if (userConfig) {
        const updatedConfig = {
          ...userConfig,
          contacts: updatedContacts,
          settings: {
            ...userConfig.settings,
            activeChat: roomId
          },
          last_updated: new Date().toISOString()
        }
        await updateConfig(session.accessToken, session.user.login, updatedConfig)
        setUserConfig(updatedConfig)
      }

      // 切换到新创建的聊天室
      setActiveChat(roomId)
      setShowCreateRoomModal(false)

      // 更新路由
      if (typeof window !== 'undefined') {
        router.push(`/${session.user.login}/${roomId}`)
      }
    } catch (error) {
      console.error('Error creating room:', error)
      alert('创建聊天室失败，请重试')
    }
  }

  // 处理聊天室切换
  const handleChatChange = (chatId) => {
    setActiveChat(chatId)
    if (session?.user?.login) {
      router.push(`/${session.user.login}/${chatId}`)
    }
  }

  // 检查用户访问权限和初始化聊天室
  useEffect(() => {
    if (status === 'loading') return

    if (!session) {
      router.push('/') // 未登录用户重定向到首页
      return
    }

    // 如果访问的是其他用户的页面，重定向到自己的页面
    if (username && session.user.login && username !== session.user.login) {
      router.push(`/${session.user.login}`)
      return
    }

    // 如果指定了聊天室 ID，设置为当前聊天室
    if (roomId) {
      setActiveChat(roomId)
    }
  }, [status, session, username, roomId, router])

  // 处理加入聊天室
  const handleJoin = async (e) => {
    e.preventDefault()
    if (!session?.user?.name || !session.accessToken || !joinInput.trim()) return

    try {
      // 检查聊天室是否已经在联系人列表中
      if (contacts.some(contact => contact.id === joinInput)) {
        setActiveChat(joinInput)
        setShowJoinModal(false)
        setJoinInput('')
        return
      }

      // 创建新的聊天室联系人
      const newContact = {
        id: joinInput,
        name: `聊天室 ${joinInput}`,
        type: 'room',
        unread: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        message_count: 0,
        last_message: null
      }

      // 更新联系人列表
      const updatedContacts = [...contacts, newContact]
      setContacts(updatedContacts)
      
      // 更新缓存
      updateChatRoomsCache(session.user.name, updatedContacts)

      // 更新用户配置
      if (userConfig) {
        const updatedConfig = {
          ...userConfig,
          contacts: updatedContacts,
          settings: {
            ...userConfig.settings,
            activeChat: joinInput
          }
        }
        await updateConfig(session.accessToken, session.user.name, updatedConfig)
        setUserConfig(updatedConfig)
      }

      // 切换到新加入的聊天室
      setActiveChat(joinInput)
      setShowJoinModal(false)
      setJoinInput('')

      // 更新路由
      router.push(`/${session.user.name}/${joinInput}`)
    } catch (error) {
      console.error('Error joining room:', error)
      alert('加入聊天室失败，请重试')
    }
  }

  // WebSocket 连接
  useEffect(() => {
    if (!session?.user?.name) return

    // 创建WebSocket连接
    const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL || 'wss://dock-chat.vercel.app'}/ws?username=${session.user.name}`
    ws.current = new WebSocket(wsUrl)

    const connectWebSocket = () => {
      ws.current.onopen = () => {
        console.log('WebSocket connected')
        setIsConnected(true)
      }

      ws.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          
          switch (message.type) {
            case 'private_message':
              handleReceivedPrivateMessage(message.data)
              break
            case 'message_status':
              updateMessageStatus(message.data)
              break
            case 'chat_message':
              // ... existing chat message handling ...
              break
            default:
              console.log('Unknown message type:', message.type)
          }
        } catch (error) {
          console.error('Error handling WebSocket message:', error)
        }
      }

      ws.current.onclose = () => {
        console.log('WebSocket disconnected')
        setIsConnected(false)
        // 尝试重新连接
        setTimeout(connectWebSocket, 3000)
      }

      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error)
        setIsConnected(false)
      }
    }

    connectWebSocket()

    // 清理函数
    return () => {
      if (ws.current) {
        ws.current.close()
      }
    }
  }, [session?.user?.name, activeChat])

  // 加载聊天记录
  const loadMessages = async (chatId) => {
    if (!session?.user?.name || !session.accessToken) return

    try {
      setIsLoading(true)
      const response = await fetch(`/api/messages/${chatId}`)
      if (response.ok) {
        const data = await response.json()
        setMessages(data.messages || [])
      }
    } catch (error) {
      console.error('Error loading messages:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // 切换聊天室时加载消息
  useEffect(() => {
    if (activeChat) {
      loadMessages(activeChat)
    }
  }, [activeChat])

  // 发送消息
  const handleSendMessage = async (message) => {
    if (!message.trim() || !activeChat || !session?.user?.name) return

    setIsSending(true)
    const newMessage = {
      id: Date.now().toString(),
      content: message,
      sender: session.user.name,
      createdAt: new Date().toISOString(),
      type: 'text'
    }

    try {
      // 更新本地消息列表
      setMessages(prev => [...prev, newMessage])

      // 通过WebSocket发送消息
      if (ws.current?.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify({
          type: 'message',
          roomId: activeChat,
          message: newMessage
        }))
      } else {
        throw new Error('WebSocket connection not open')
      }

      // 保存消息到服务器
      const response = await fetch('/api/messages/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomId: activeChat,
          message: newMessage
        })
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      // 更新联系人列表中的最后一条消息
      const updatedContacts = contacts.map(contact => {
        if (contact.id === activeChat) {
          return {
            ...contact,
            last_message: newMessage,
            message_count: (contact.message_count || 0) + 1,
            updated_at: new Date().toISOString()
          }
        }
        return contact
      })
      setContacts(updatedContacts)
      updateChatRoomsCache(session.user.name, updatedContacts)

    } catch (error) {
      console.error('Error sending message:', error)
      // 如果发送失败，添加一条错误消息
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        content: '消息发送失败，请重试',
        sender: 'system',
        createdAt: new Date().toISOString(),
        type: 'error'
      }])
    } finally {
      setIsSending(false)
    }
  }

  // 处理私信发送
  const handlePrivateMessage = async (message) => {
    if (!activePrivateChat || !session?.user?.name) return

    const newMessage = {
      ...message,
      fromSelf: true,
      to: activePrivateChat,
      from: session.user.name,
      id: Date.now().toString(),
      timestamp: new Date().toISOString()
    }

    // 更新本地消息列表
    setPrivateMessages(prev => ({
      ...prev,
      [activePrivateChat]: [...(prev[activePrivateChat] || []), newMessage]
    }))

    // 通过 WebSocket 发送消息
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        type: 'private_message',
        data: newMessage
      }))
    }

    // 保存消息到本地存储
    const savedMessages = JSON.parse(localStorage.getItem('privateMessages') || '{}')
    savedMessages[activePrivateChat] = [
      ...(savedMessages[activePrivateChat] || []),
      newMessage
    ]
    localStorage.setItem('privateMessages', JSON.stringify(savedMessages))
  }

  // 处理收到的私信
  const handleReceivedPrivateMessage = (message) => {
    const { from, content, type, timestamp } = message
    const newMessage = {
      type,
      content,
      timestamp,
      fromSelf: false,
      status: 'received',
      id: Date.now().toString()
    }

    setPrivateMessages(prev => ({
      ...prev,
      [from]: [...(prev[from] || []), newMessage]
    }))

    // 保存消息到本地存储
    const savedMessages = JSON.parse(localStorage.getItem('privateMessages') || '{}')
    savedMessages[from] = [...(savedMessages[from] || []), newMessage]
    localStorage.setItem('privateMessages', JSON.stringify(savedMessages))

    // 发送已读回执
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        type: 'message_status',
        data: {
          messageId: message.id,
          status: 'read',
          to: from
        }
      }))
    }
  }

  // 更新消息状态
  const updateMessageStatus = ({ messageId, status, from }) => {
    setPrivateMessages(prev => {
      const messages = prev[from] || []
      const updatedMessages = messages.map(msg =>
        msg.id === messageId ? { ...msg, status } : msg
      )
      return {
        ...prev,
        [from]: updatedMessages
      }
    })

    // 更新本地存储
    const savedMessages = JSON.parse(localStorage.getItem('privateMessages') || '{}')
    if (savedMessages[from]) {
      savedMessages[from] = savedMessages[from].map(msg =>
        msg.id === messageId ? { ...msg, status } : msg
      )
      localStorage.setItem('privateMessages', JSON.stringify(savedMessages))
    }
  }

  return (
    <main className="flex min-h-screen">
      {/* 导航栏 */}
      <Navigation
        contacts={contacts}
        activeChat={activeChat}
        activePrivateChat={activePrivateChat}
        onChatChange={handleChatChange}
        onPrivateChatChange={setActivePrivateChat}
        onShowJoinModal={() => setShowJoinModal(true)}
        onShowCreateRoomModal={() => setShowCreateRoomModal(true)}
        onShowSettings={() => setShowSettingsModal(true)}
      />
      
      {/* 主内容区 */}
      <div className="flex-1">
        {activePrivateChat ? (
          <PrivateMessage
            friend={contacts.find(c => c.id === activePrivateChat)}
            messages={privateMessages[activePrivateChat] || []}
            onSendMessage={handlePrivateMessage}
            config={userConfig?.settings}
          />
        ) : activeChat ? (
          <div className="flex flex-col h-full">
            {/* 聊天室头部 */}
            <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {contacts.find(c => c.id === activeChat)?.name || '聊天室'}
              </h2>
              <button
                onClick={() => setShowChatSettings(true)}
                className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <Cog6ToothIcon className="w-6 h-6" />
              </button>
            </div>

            {/* 消息列表 */}
            <MessageList
              messages={messages}
              messagesEndRef={messagesEndRef}
              config={userConfig?.settings}
            />

            {/* 输入框 */}
            <ChatInput
              newMessage={newMessage}
              setNewMessage={setNewMessage}
              handleSendMessage={handleSendMessage}
              isSending={isSending}
            />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                欢迎使用 Dock Chat
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-8">
                选择一个聊天室开始聊天，或者创建/加入新的聊天室
              </p>
              <div className="space-x-4">
                <button
                  onClick={() => setShowCreateRoomModal(true)}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  创建聊天室
                </button>
                <button
                  onClick={() => setShowJoinModal(true)}
                  className="px-4 py-2 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
                >
                  加入聊天室
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 模态框 */}
      {showSettingsModal && (
        <SettingsModal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          config={userConfig}
          onSave={saveConfig}
        />
      )}

      {showCreateRoomModal && (
        <CreateRoomModal
          isOpen={showCreateRoomModal}
          onClose={() => setShowCreateRoomModal(false)}
          onCreate={handleCreateRoom}
        />
      )}

      {showJoinModal && (
        <JoinRoomModal
          isOpen={showJoinModal}
          onClose={() => setShowJoinModal(false)}
          onJoin={handleJoin}
          joinInput={joinInput}
          setJoinInput={setJoinInput}
        />
      )}
    </main>
  )
}

