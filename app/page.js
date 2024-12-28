'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession, signIn } from 'next-auth/react'
import { io } from 'socket.io-client'
import { 
  PaperAirplaneIcon,
  UserGroupIcon,
  UserCircleIcon,
  Cog6ToothIcon,
  PlusCircleIcon,
  SparklesIcon
} from '@heroicons/react/24/solid'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import SettingsModal from './components/SettingsModal'
import ProfilePage from './components/ProfilePage'
import OnboardingModal from './components/OnboardingModal'
import { sendMessageToKimi } from '@/lib/kimi'
import { checkDataRepository, getConfig, updateConfig, saveChatHistory, loadChatHistory } from '@/lib/github'
import ChatRoomSettings from './components/ChatRoomSettings'
import { generateLoginMessage } from '@/lib/userInfo'
import { saveSystemNotification, formatSystemNotification } from '@/lib/systemNotifications'
import { useTheme } from 'next-themes'
import CreateRoomModal from './components/CreateRoomModal'
import { extensionManager, ExtensionContext } from '@/lib/extensionApi'
import { FileShareExtension } from '@/lib/extensions/fileShare'
import { CodeCollabExtension } from '@/lib/extensions/codeCollab'
import { SystemNotificationExtension } from '@/lib/extensions/systemNotification'
import { RoomSettingsExtension } from '@/lib/extensions/roomSettings'

// 初始化扩展
if (typeof window !== 'undefined') {
  try {
    extensionManager.register(new FileShareExtension())
    extensionManager.register(new CodeCollabExtension())
    extensionManager.register(new SystemNotificationExtension())
    extensionManager.register(new RoomSettingsExtension())
  } catch (error) {
    console.error('Error registering extensions:', error)
  }
}

export default function HomeWrapper({ username }) {
  return <Home username={username} />
}

function Home({ username }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { theme } = useTheme()
  
  const [state, setState] = useState({
    messages: [],
    newMessage: '',
    socket: null,
    isConnected: false,
    isLoading: false,
    showJoinModal: false,
    joinInput: '',
    activeChat: 'public',
    contacts: [
      { id: 'public', name: '公共聊天室', type: 'room', unread: 0 },
    ],
    showSettingsModal: false,
    currentView: 'chat',
    showKimiModal: false,
    kimiApiKey: '',
    isWaitingForKimi: false,
    showOnboarding: false,
    userConfig: null,
    isSending: false,
    autoSaveInterval: null,
    showChatSettings: false,
    showCreateRoomModal: false,
    currentRoom: null,
    showUpload: false,
    showCodeEditor: false,
    showSettings: false
  })

  const messagesEndRef = useRef(null)

  const updateState = (updates) => {
    setState(prev => ({
      ...prev,
      ...updates
    }))
  }

  // 动态滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [state.messages])

  // WebSocket 连接
  useEffect(() => {
    if (session) {
      console.log('Initializing socket connection...')
      const socket = io(window.location.origin, {
        path: '/api/socket',
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      })

      socket.on('connect', () => {
        console.log('Socket connected')
        updateState({ 
          isConnected: true,
          socket
        })
        socket.emit('join', { 
          room: state.activeChat,
          userId: session.user.id
        })
      })

      socket.on('connect_error', (error) => {
        console.error('Connection error:', error)
        updateState({ isConnected: false })
      })

      socket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason)
        updateState({ isConnected: false })
      })

      socket.on('message', (message) => {
        console.log('Received message:', message)
        updateState(prev => ({
          messages: [...prev.messages, message]
        }))
      })

      updateState({ socket })

      return () => {
        console.log('Cleaning up socket connection...')
        if (socket.connected) {
          socket.emit('leave', { room: state.activeChat })
          socket.disconnect()
        }
      }
    }
  }, [session, state.activeChat])

  // 修改初始化加载逻辑
  useEffect(() => {
    const initializeData = async () => {
      if (session?.user?.login && session.accessToken) {
        try {
          updateState({ isLoading: true })
          console.log('Initializing data...')

          // 确保仓库和基本结构存在
          const hasRepo = await checkDataRepository(session.accessToken, session.user.login)
          if (!hasRepo) {
            console.log('Creating new repository...')
            await createDataRepository(session.accessToken, session.user.login)
          }

          // 预加载所有数据
          await preloadCache(session.user.login, session.accessToken)

          // 从缓存加载配置
          const config = getCache(session.user.login, 'config')
          console.log('Loaded config:', config)
          
          if (config) {
            updateState({
              userConfig: config,
              kimiApiKey: config.kimi_settings?.api_key || ''
            })
          }

          // 从缓存加载聊天室列表
          const rooms = getCache(session.user.login, 'rooms')
          console.log('Loaded chat rooms:', rooms)
          
          if (rooms?.length > 0) {
            // 设置活动聊天室
            let targetChat = 'public'
            if (config?.settings?.activeChat) {
              const chatExists = rooms.some(room => room.id === config.settings.activeChat)
              if (chatExists) {
                targetChat = config.settings.activeChat
              }
            }

            updateState({
              contacts: rooms,
              activeChat: targetChat
            })

            // 从缓存加载消息
            const messages = getCache(session.user.login, 'messages', targetChat)
            console.log('Loaded messages for', targetChat, ':', messages)
            
            if (messages?.length > 0) {
              const formattedMessages = messages.map(msg => ({
                content: msg.content || '',
                user: {
                  name: msg.user?.name || 'Unknown User',
                  image: msg.user?.image || '/default-avatar.png',
                  id: msg.user?.id || 'unknown'
                },
                createdAt: msg.createdAt || new Date().toISOString(),
                type: msg.type || 'message'
              }))
              updateState({ messages: formattedMessages })
            }
          }
        } catch (error) {
          console.error('Error initializing data:', error)
        } finally {
          updateState({ isLoading: false })
        }
      }
    }

    initializeData()
  }, [session])

  // 修改加载消息的逻辑
  const loadChatMessages = async () => {
    if (!session?.user?.login || !session.accessToken || !state.activeChat) return

    try {
      updateState({ 
        isLoading: true,
        messages: [] // 立即清空消息，避免显示上一个聊天室的消息
      })
      console.log('Loading messages for chat:', state.activeChat)

      // 从 GitHub 加载消息（现在会优先使用缓存）
      const messages = await loadChatHistory(session.accessToken, session.user.login, state.activeChat)
      console.log('Loaded messages:', messages)

      if (Array.isArray(messages) && messages.length > 0) {
        // 使用批量更新来优化性能
        const formattedMessages = messages.map(msg => ({
          content: msg.content || '',
          user: {
            name: msg.user?.name || 'Unknown User',
            image: msg.user?.image || '/default-avatar.png',
            id: msg.user?.id || 'unknown'
          },
          createdAt: msg.createdAt || new Date().toISOString(),
          type: msg.type || 'message'
        }))

        // 使用 requestAnimationFrame 来优化渲染性能
        requestAnimationFrame(() => {
          updateState({ messages: formattedMessages })
        })
        console.log('Set formatted messages:', formattedMessages)
      }

      // 更新配置中的活动聊天室
      if (state.userConfig) {
        const updatedConfig = {
          ...state.userConfig,
          settings: {
            ...state.userConfig.settings,
            activeChat: state.activeChat
          },
          last_updated: new Date().toISOString()
        }
        await updateConfig(session.accessToken, session.user.login, updatedConfig)
        updateState({ userConfig: updatedConfig })
      }

      // 更新联系人列表中的未读消息状态
      const updatedContacts = state.contacts.map(contact => {
        if (contact.id === state.activeChat) {
          return {
            ...contact,
            unread: 0,
            last_message: messages[messages.length - 1] || null,
            message_count: messages.length
          }
        }
        return contact
      })
      updateState({ contacts: updatedContacts })

    } catch (error) {
      console.error('Error loading messages:', error)
      updateState({ messages: [] })
    } finally {
      updateState({ isLoading: false })
    }
  }

  // 修改聊天室切换的逻辑
  const handleChatChange = async (chatId) => {
    if (chatId === state.activeChat) return
    
    updateState({ 
      activeChat: chatId,
      messages: [], // 立即清空消息
      isLoading: true // 显示加载状态
    })

    try {
      // 从缓存加载消息
      const cachedMessages = getCache(session.user.login, 'messages', chatId)
      if (cachedMessages?.length > 0) {
        const formattedMessages = cachedMessages.map(msg => ({
          content: msg.content || '',
          user: {
            name: msg.user?.name || 'Unknown User',
            image: msg.user?.image || '/default-avatar.png',
            id: msg.user?.id || 'unknown'
          },
          createdAt: msg.createdAt || new Date().toISOString(),
          type: msg.type || 'message'
        }))
        updateState({ messages: formattedMessages })
      } else {
        // 如果缓存中没有消息，从服务器加载
        const messages = await loadChatHistory(session.accessToken, session.user.login, chatId)
        if (messages?.length > 0) {
          const formattedMessages = messages.map(msg => ({
            content: msg.content || '',
            user: {
              name: msg.user?.name || 'Unknown User',
              image: msg.user?.image || '/default-avatar.png',
              id: msg.user?.id || 'unknown'
            },
            createdAt: msg.createdAt || new Date().toISOString(),
            type: msg.type || 'message'
          }))
          updateState({ messages: formattedMessages })
        }
      }

      // 如果切换到系统通知，清除未读消息数
      if (chatId === 'system') {
        const updatedContacts = state.contacts.map(contact => {
          if (contact.id === 'system') {
            return {
              ...contact,
              unread: 0
            }
          }
          return contact
        })
        updateState({ contacts: updatedContacts })

        // 更新用户配置
        if (session?.accessToken && session.user.login && state.userConfig) {
          const updatedConfig = {
            ...state.userConfig,
            contacts: updatedContacts,
            last_updated: new Date().toISOString()
          }
          await updateConfig(session.accessToken, session.user.login, updatedConfig)
          updateState({ userConfig: updatedConfig })
        }
      }
    } catch (error) {
      console.error('Error loading messages:', error)
    } finally {
      updateState({ isLoading: false })
    }
  }

  // 修改消息发送逻辑
  const handleKimiMessage = async (content) => {
    if (!state.kimiApiKey) {
      console.error('Kimi API key not set')
      return
    }

    try {
      updateState({ isWaitingForKimi: true })
      // 显示正在输入状态
      const typingMessage = {
        content: '正在思考...',
        user: {
          name: 'Kimi AI',
          image: '/kimi-avatar.png',
          id: 'kimi-ai'
        },
        isTyping: true,
        createdAt: new Date().toISOString()
      }

      updateState(prev => ({
        messages: [...prev.messages, typingMessage]
      }))

      const response = await sendMessageToKimi(content, state.kimiApiKey)
      
      // 移除正在输入状态的消息并添加 AI 响应
      updateState(prev => {
        const messagesWithoutTyping = prev.messages.filter(msg => !msg.isTyping)
        const aiMessage = {
          content: response,
          user: {
            name: 'Kimi AI',
            image: '/kimi-avatar.png',
            id: 'kimi-ai'
          },
          createdAt: new Date().toISOString()
        }
        
        const updatedMessages = [...messagesWithoutTyping, aiMessage]
        
        // 保存更新后的消息
        saveChatHistory(session.accessToken, session.user.login, state.activeChat, updatedMessages)
          .catch(error => console.error('Error saving AI chat history:', error))
        
        return { messages: updatedMessages }
      })
    } catch (error) {
      console.error('Failed to get Kimi AI response:', error)
      updateState(prev => {
        const messagesWithoutTyping = prev.messages.filter(msg => !msg.isTyping)
        const errorMessage = {
          content: '抱歉，我遇到了一些问题。请稍后再试。',
          user: {
            name: 'Kimi AI',
            image: '/kimi-avatar.png',
            id: 'kimi-ai'
          },
          isError: true,
          createdAt: new Date().toISOString()
        }
        
        const updatedMessages = [...messagesWithoutTyping, errorMessage]
        
        // 保存错误消息
        saveChatHistory(session.accessToken, session.user.login, state.activeChat, updatedMessages)
          .catch(error => console.error('Error saving error message:', error))
        
        return { messages: updatedMessages }
      })
    } finally {
      updateState({ isWaitingForKimi: false })
    }
  }

  const handleSendMessage = async (content) => {
    try {
      updateState({ isSending: true })
      const message = {
        content: state.newMessage,
        user: {
          name: session.user.name,
          image: session.user.image,
          id: session.user.id
        },
        createdAt: new Date().toISOString()
      }

      // 添加消息到本地状态
      updateState(prev => ({
        messages: [...prev.messages, message],
        newMessage: ''
      }))

      // 发送消息到 Socket.IO
      if (state.socket?.connected) {
        state.socket.emit('message', {
          ...message,
          room: state.activeChat
        })
      }

      // 根据聊天室类型保存消息
      if (state.activeChat === 'kimi-ai') {
        await handleKimiMessage(message.content)
      } else {
        // 获取当前所有消息括新消息
        const updatedMessages = [...state.messages, message]
        try {
          await saveChatHistory(session.accessToken, session.user.login, state.activeChat, updatedMessages)
          console.log('Successfully saved messages:', updatedMessages)
        } catch (error) {
          console.error('Failed to save messages:', error)
          throw error
        }
      }

      // 通知扩展
      const extensions = extensionManager.getAllExtensions()
      for (const extension of extensions) {
        extension.handleMessage(message)
      }
    } catch (error) {
      console.error('Failed to send message:', error)
      // 移除失败的消息并显示错误
      updateState(prev => {
        const newMessages = prev.messages.slice(0, -1)
        return {
          messages: [...newMessages, {
            content: '消息发送失败，请重试',
            user: {
              name: 'System',
              image: '/system-avatar.png',
              id: 'system'
            },
            isError: true,
            createdAt: new Date().toISOString()
          }]
        }
      })
    } finally {
      updateState({ isSending: false })
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!state.newMessage.trim() || !session || state.isSending) return
    
    const content = state.newMessage.trim()
    updateState({ newMessage: '' })
    await handleSendMessage(content)
  }

  // 渲染聊天室头部
  const renderRoomHeader = () => {
    const roomSettingsExtension = extensionManager.getExtension('room-settings')

    if (!state.activeChat || !state.contacts) return null

    const currentRoom = state.contacts.find(contact => contact.id === state.activeChat)
    if (!currentRoom) return null

    return (
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">
            {currentRoom.name || state.activeChat}
          </h2>
          {currentRoom.description && (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {currentRoom.description}
            </span>
          )}
        </div>
        <button
          onClick={() => updateState({ showSettings: true })}
          className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          title="聊天室设置"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </button>
        {state.showSettings && roomSettingsExtension && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-2xl bg-white dark:bg-gray-800 rounded-lg shadow-xl">
              {roomSettingsExtension.components.get('RoomSettings')({
                onClose: () => updateState({ showSettings: false }),
                room: currentRoom
              })}
            </div>
          </div>
        )}
      </div>
    )
  }

  // 渲染输入工具栏
  const renderInputTools = () => {
    const fileShareExtension = extensionManager.getExtension('file-share')
    const codeCollabExtension = extensionManager.getExtension('code-collab')

    return (
      <div className="flex items-center gap-2">
        <button
          onClick={() => updateState({ showUpload: true })}
          className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          title="上传文件"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
            />
          </svg>
        </button>
        <button
          onClick={() => updateState({ showCodeEditor: true })}
          className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          title="分享代码"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
            />
          </svg>
        </button>
        {state.showUpload && fileShareExtension && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-xl">
              {fileShareExtension.components.get('FileUpload')({
                onClose: () => updateState({ showUpload: false })
              })}
            </div>
          </div>
        )}
        {state.showCodeEditor && codeCollabExtension && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-2xl bg-white dark:bg-gray-800 rounded-lg shadow-xl">
              {codeCollabExtension.components.get('CodeEditor')({
                onClose: () => updateState({ showCodeEditor: false })
              })}
            </div>
          </div>
        )}
      </div>
    )
  }

  // 渲染消息
  const renderChatMessage = (message) => {
    // 检查是否是扩展消息
    if (message.extensionId) {
      const extension = extensionManager.getExtension(message.extensionId)
      if (extension) {
        return extension.render({ message, currentUser: session?.user })
      }
    }
    
    // 默认消息渲染
    return (
      <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} mb-4`}>
        {/* ... existing code ... */}
      </div>
    )
  }

  // 主渲染逻辑
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
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="max-w-sm w-full p-6">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">欢迎使用 Dock Chat</h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">请使用 GitHub 账号登录</p>
          </div>
          <button
            onClick={() => signIn('github', { callbackUrl: '/' })}
            className="w-full flex items-center justify-center gap-2 bg-gray-900 dark:bg-gray-800 text-white rounded-lg px-4 py-2.5 hover:bg-gray-800 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-800 focus:ring-offset-2"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
            </svg>
            使用 GitHub 登录
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      {/* 左侧导航栏 - 添加固定宽度 */}
      <div className="w-80 flex-shrink-0 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        {/* 用户信息区域 */}
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
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                @{session.user.login}
              </p>
            </div>
          </div>
        </div>

        {/* 聊天室列表 */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {state.contacts.map(contact => (
            <button
              key={contact.id}
              onClick={() => handleChatChange(contact.id)}
              className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors ${
                state.activeChat === contact.id
                  ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200'
              }`}
            >
              {contact.type === 'ai' ? (
                <SparklesIcon className="w-5 h-5 flex-shrink-0" />
              ) : (
                <UserGroupIcon className="w-5 h-5 flex-shrink-0" />
              )}
              <span className="flex-1 text-left text-sm font-medium truncate">
                {contact.name}
              </span>
              {contact.unread > 0 && (
                <span className="flex-shrink-0 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {contact.unread}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* 底部按钮区域 */}
        <div className="p-3 border-t border-gray-200 dark:border-gray-700 space-y-2">
          <button
            onClick={() => updateState({ showCreateRoomModal: true })}
            className="w-full flex items-center justify-center gap-2 p-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/50 rounded-lg transition-colors"
          >
            <PlusCircleIcon className="w-5 h-5" />
            创建聊天室
          </button>
          <button
            onClick={addKimiAIChat}
            className="w-full flex items-center justify-center gap-2 p-2 text-sm font-medium text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/50 rounded-lg transition-colors"
          >
            <SparklesIcon className="w-5 h-5" />
            添加 AI 助手
          </button>
          <button
            onClick={() => updateState({ currentView: state.currentView === 'chat' ? 'profile' : 'chat' })}
            className={`w-full flex items-center justify-center gap-2 p-2 text-sm font-medium ${
              state.currentView === 'profile'
                ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/50'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
            } rounded-lg transition-colors`}
          >
            {state.currentView === 'chat' ? (
              <UserCircleIcon className="w-5 h-5" />
            ) : (
              <UserGroupIcon className="w-5 h-5" />
            )}
            {state.currentView === 'chat' ? '个人主页' : '返回聊天'}
          </button>
          <button
            onClick={() => updateState({ showJoinModal: true })}
            className="w-full flex items-center justify-center gap-2 p-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/50 rounded-lg transition-colors"
          >
            <PlusCircleIcon className="w-5 h-5" />
            加入聊天室
          </button>
          <button
            onClick={() => updateState({ showSettingsModal: true })}
            className="w-full flex items-center justify-center gap-2 p-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <Cog6ToothIcon className="w-5 h-5" />
            设置
          </button>
        </div>
      </div>

      {/* 主聊天区域 */}
      <div className="flex-1 flex flex-col min-w-0">
        {renderRoomHeader()}
        <div className="flex-1 overflow-y-auto p-4">
          {state.currentView === 'chat' ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm h-full flex flex-col">
              {/* 消息列表区域 */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {state.isLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="flex flex-col items-center space-y-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">加载消息中...</p>
                    </div>
                  </div>
                ) : state.messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-sm text-gray-500 dark:text-gray-400">暂无消息</p>
                  </div>
                ) : (
                  <>
                    {state.messages.map((message, index) => (
                      <div
                        key={`${message.createdAt}-${message.user.id}-${index}`}
                        className={`flex ${
                          message.type === 'system' 
                            ? 'justify-center'
                            : message.user.id === session?.user?.id 
                              ? 'justify-end' 
                              : 'justify-start'
                        }`}
                      >
                        <div className={`flex items-start gap-3 ${
                          message.type === 'system'
                            ? 'max-w-[80%]'
                            : 'max-w-[70%]'
                        } ${
                          message.type === 'system'
                            ? ''
                            : message.user.id === session?.user?.id
                              ? 'flex-row-reverse'
                              : ''
                        }`}>
                          {message.user.image && message.type !== 'system' && (
                            <Image
                              src={message.user.image}
                              alt={message.user.name || '用户头像'}
                              width={40}
                              height={40}
                              className="rounded-full flex-shrink-0"
                            />
                          )}
                          <div className={`flex flex-col ${
                            message.type === 'system'
                              ? 'items-center'
                              : message.user.id === session?.user?.id
                                ? 'items-end'
                                : 'items-start'
                          }`}>
                            <div className={`rounded-2xl p-4 break-words ${
                              message.type === 'system'
                                ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-sm'
                                : message.isTyping
                                  ? 'bg-gray-100 dark:bg-gray-700 animate-pulse'
                                  : message.isError
                                    ? 'bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400'
                                    : message.user.id === session?.user?.id
                                      ? 'bg-blue-500 text-white'
                                      : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                            }`}>
                              {message.type !== 'system' && (
                                <p className="text-sm font-medium mb-1">{message.user.name}</p>
                              )}
                              <p className={`${
                                message.type === 'system' ? 'text-center' : ''
                              } whitespace-pre-wrap`}>{message.content}</p>
                            </div>
                            <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {new Date(message.createdAt).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* 输入框区域 */}
              <form onSubmit={handleSubmit} className="flex-shrink-0 p-4 border-t border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-4">
                  {renderInputTools()}
                  <input
                    type="text"
                    value={state.newMessage}
                    onChange={(e) => updateState({ newMessage: e.target.value })}
                    placeholder="输入消息..."
                    className="flex-1 p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="submit"
                    disabled={state.isSending}
                    className="px-4 py-2 text-white bg-blue-500 rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    发送
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <ProfilePage session={session} />
          )}
        </div>
      </div>

      {/* 模态框 */}
      {state.showJoinModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">加入聊天室</h2>
            <form onSubmit={handleJoin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  加入聊天室 ID 或 IP 地址
                </label>
                <input
                  type="text"
                  value={state.joinInput}
                  onChange={(e) => updateState({ joinInput: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="例如：room-123 或 192.168.1.1"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => updateState({ showJoinModal: false })}
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

      {state.showSettingsModal && (
        <SettingsModal
          isOpen={state.showSettingsModal}
          onClose={() => updateState({ showSettingsModal: false })}
          session={session}
        />
      )}

      {state.showKimiModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">设置 Kimi AI API Key</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  API Key
                </label>
                <input
                  type="password"
                  value={state.kimiApiKey}
                  onChange={(e) => updateState({ kimiApiKey: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="输入您的 Kimi AI API Key"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => updateState({ showKimiModal: false })}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (state.kimiApiKey) {
                      updateState({ showKimiModal: false })
                      addKimiAIChat()
                    }
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-purple-500 hover:bg-purple-600 rounded-lg"
                >
                  确认
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {state.showOnboarding && (
        <OnboardingModal
          isOpen={state.showOnboarding}
          onClose={() => updateState({ showOnboarding: false })}
          session={session}
        />
      )}

      {state.showCreateRoomModal && (
        <CreateRoomModal
          onClose={() => updateState({ showCreateRoomModal: false })}
          onCreate={handleCreateRoom}
        />
      )}
    </div>
  )
}


