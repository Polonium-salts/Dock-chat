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

export default function Home({ username }) {
  const { data: session, status } = useSession()
  const router = useRouter()
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
  const [showKimiModal, setShowKimiModal] = useState(false)
  const [kimiApiKey, setKimiApiKey] = useState('')
  const [isWaitingForKimi, setIsWaitingForKimi] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [userConfig, setUserConfig] = useState(null)
  const [isSending, setIsSending] = useState(false)
  const [autoSaveInterval, setAutoSaveInterval] = useState(null)
  const [showChatSettings, setShowChatSettings] = useState(false)
  const { theme, setTheme } = useTheme()
  const [showCreateRoomModal, setShowCreateRoomModal] = useState(false)

  // 动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

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
        setIsConnected(true)
        socket.emit('join', { 
          room: activeChat,
          userId: session.user.id
        })
      })

      socket.on('connect_error', (error) => {
        console.error('Connection error:', error)
        setIsConnected(false)
      })

      socket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason)
        setIsConnected(false)
      })

      socket.on('message', (message) => {
        console.log('Received message:', message)
        setMessages(prev => [...prev, message])
      })

      setSocket(socket)

      return () => {
        console.log('Cleaning up socket connection...')
        if (socket.connected) {
          socket.emit('leave', { room: activeChat })
          socket.disconnect()
        }
      }
    }
  }, [session, activeChat])

  // 修改初始化加载逻辑
  useEffect(() => {
    const initializeData = async () => {
      if (session?.user?.login && session.accessToken) {
        try {
          setIsLoading(true)
          console.log('Initializing data...')

          // 确保仓库和基本结构存在
          const hasRepo = await checkDataRepository(session.accessToken, session.user.login)
          if (!hasRepo) {
            console.log('Creating new repository...')
            await createDataRepository(session.accessToken, session.user.login)
          }

          // 加载用户配置
          const config = await getConfig(session.accessToken, session.user.login)
          console.log('Loaded config:', config)
          
          if (config) {
            setUserConfig(config)
            // 恢复用户配置
            if (config.kimi_settings?.api_key) {
              setKimiApiKey(config.kimi_settings.api_key)
            }
          }

          // 加载聊天室列表
          const rooms = await getChatRooms(session.accessToken, session.user.login)
          console.log('Loaded chat rooms:', rooms)
          
          if (rooms.length > 0) {
            setContacts(rooms)

            // 设置活动聊天室
            let targetChat = 'public'
            if (config?.settings?.activeChat) {
              const chatExists = rooms.some(room => room.id === config.settings.activeChat)
              if (chatExists) {
                targetChat = config.settings.activeChat
              }
            }
            setActiveChat(targetChat)

            // 加载消息
            const messages = await loadChatHistory(session.accessToken, session.user.login, targetChat)
            console.log('Loaded messages for', targetChat, ':', messages)
            
            if (messages && messages.length > 0) {
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
              setMessages(formattedMessages)
            } else {
              setMessages([])
            }
          }
        } catch (error) {
          console.error('Error initializing data:', error)
        } finally {
          setIsLoading(false)
        }
      }
    }

    initializeData()
  }, [session])

  // 修改切换聊天室的逻辑
  useEffect(() => {
    const loadChatMessages = async () => {
      if (!session?.user?.login || !session.accessToken || !activeChat) return

      try {
        setIsLoading(true)
        console.log('Loading messages for chat:', activeChat)

        // 从 GitHub 加载消息
        const messages = await loadChatHistory(session.accessToken, session.user.login, activeChat)
        console.log('Loaded messages:', messages)

        if (Array.isArray(messages) && messages.length > 0) {
          // 确保消息格式正确
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

          setMessages(formattedMessages)
          console.log('Set formatted messages:', formattedMessages)
        } else {
          setMessages([])
          console.log('No messages found, set empty array')
        }

        // 更新配置中的活动聊天室
        if (userConfig) {
          const updatedConfig = {
            ...userConfig,
            settings: {
              ...userConfig.settings,
              activeChat
            },
            last_updated: new Date().toISOString()
          }
          await updateConfig(session.accessToken, session.user.login, updatedConfig)
        }
      } catch (error) {
        console.error('Error loading messages:', error)
        setMessages([])
      } finally {
        setIsLoading(false)
      }
    }

    loadChatMessages()
  }, [activeChat, session])

  // 保存消息到 GitHub
  const saveMessages = async (roomId, messages) => {
    if (session?.user?.login && session.accessToken) {
      try {
        if (roomId === 'kimi-ai') {
          await saveAIChatHistory(session.accessToken, session.user.login, messages)
        } else {
          await saveChatHistory(session.accessToken, session.user.login, roomId, messages)
        }
      } catch (error) {
        console.error('Error saving messages:', error)
      }
    }
  }

  // 在消息列表变化时保存
  useEffect(() => {
    if (activeChat && messages.length > 0) {
      saveMessages(activeChat, messages)
    }
  }, [messages])

  const handleKimiMessage = async (content) => {
    if (!kimiApiKey) {
      console.error('Kimi API key not set');
      return;
    }

    try {
      setIsWaitingForKimi(true);
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
      };

      setMessages(prev => [...prev, typingMessage]);

      const response = await sendMessageToKimi(content, kimiApiKey);
      
      // 移除正在输入状态的消息并添加 AI 响应
      setMessages(prev => {
        const messagesWithoutTyping = prev.filter(msg => !msg.isTyping);
        const aiMessage = {
          content: response,
          user: {
            name: 'Kimi AI',
            image: '/kimi-avatar.png',
            id: 'kimi-ai'
          },
          createdAt: new Date().toISOString()
        };
        
        const updatedMessages = [...messagesWithoutTyping, aiMessage];
        
        // 保存更新后的消息
        saveChatHistory(session.accessToken, session.user.login, activeChat, updatedMessages)
          .catch(error => console.error('Error saving AI chat history:', error));
        
        return updatedMessages;
      });
    } catch (error) {
      console.error('Failed to get Kimi AI response:', error);
      setMessages(prev => {
        const messagesWithoutTyping = prev.filter(msg => !msg.isTyping);
        const errorMessage = {
          content: '抱歉，我遇到了一些问题。请稍后再试。',
          user: {
            name: 'Kimi AI',
            image: '/kimi-avatar.png',
            id: 'kimi-ai'
          },
          isError: true,
          createdAt: new Date().toISOString()
        };
        
        const updatedMessages = [...messagesWithoutTyping, errorMessage];
        
        // 保存错误消息
        saveChatHistory(session.accessToken, session.user.login, activeChat, updatedMessages)
          .catch(error => console.error('Error saving error message:', error));
        
        return updatedMessages;
      });
    } finally {
      setIsWaitingForKimi(false);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() || !session || isSending) return

    try {
      setIsSending(true)
      const message = {
        content: newMessage,
        user: {
          name: session.user.name,
          image: session.user.image,
          id: session.user.id
        },
        createdAt: new Date().toISOString()
      }

      // 添加消息到本地状态
      setMessages(prev => [...prev, message])
      setNewMessage('')

      // 发送消息到 Socket.IO
      if (socket?.connected) {
        socket.emit('message', {
          ...message,
          room: activeChat
        })
      }

      // 根据聊天室类型保存消息
      if (activeChat === 'kimi-ai') {
        await handleKimiMessage(message.content)
      } else {
        // 获取当前所有消息，包括新消息
        const updatedMessages = [...messages, message]
        try {
          await saveChatHistory(session.accessToken, session.user.login, activeChat, updatedMessages)
          console.log('Successfully saved messages:', updatedMessages)
        } catch (error) {
          console.error('Failed to save messages:', error)
          throw error
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error)
      // 移除失败的消息并显示错误
      setMessages(prev => {
        const newMessages = prev.slice(0, -1)
        return [...newMessages, {
          content: '消息发送失败，请重试',
          user: {
            name: 'System',
            image: '/system-avatar.png',
            id: 'system'
          },
          isError: true,
          createdAt: new Date().toISOString()
        }]
      })
    } finally {
      setIsSending(false)
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

  // 检查是否需要显示新手引导
  useEffect(() => {
    const checkOnboarding = async () => {
      if (session?.user?.login && session.accessToken) {
        try {
          const hasRepo = await checkDataRepository(session.accessToken, session.user.login)
          if (!hasRepo) {
            setShowOnboarding(true)
          } else {
            // 如果仓库存在，加载用户配置
            const config = await getConfig(session.accessToken, session.user.login)
            if (config) {
              setUserConfig(config)
              // 恢复用户配置
              if (config.kimi_settings?.api_key) {
                setKimiApiKey(config.kimi_settings.api_key)
              }
              if (config.contacts?.length > 0) {
                setContacts(config.contacts)
              }
              if (config.settings?.activeChat) {
                setActiveChat(config.settings.activeChat)
              }
            }
          }
        } catch (error) {
          console.error('Error checking repository:', error)
        }
      }
    }

    checkOnboarding()
  }, [session])

  // 保存配置到 GitHub
  const saveConfig = async () => {
    if (session?.user?.login && session.accessToken && userConfig) {
      try {
        const updatedConfig = {
          ...userConfig,
          settings: {
            ...userConfig.settings,
            activeChat
          },
          contacts,
          kimi_settings: {
            ...userConfig.kimi_settings,
            api_key: kimiApiKey,
            isEnabled: contacts.some(c => c.id === 'kimi-ai')
          },
          last_updated: new Date().toISOString()
        }

        await updateConfig(session.accessToken, session.user.login, updatedConfig)
        setUserConfig(updatedConfig)
      } catch (error) {
        console.error('Error saving config:', error)
      }
    }
  }

  // 在相关状态变化时保存配置
  useEffect(() => {
    if (userConfig) {
      saveConfig()
    }
  }, [kimiApiKey, contacts, activeChat])

  // 修改添加 Kimi AI 聊天室函数
  const addKimiAIChat = () => {
    if (!kimiApiKey) {
      setShowKimiModal(true)
      return
    }

    const kimiContact = {
      id: 'kimi-ai',
      name: 'Kimi AI 助手',
      type: 'ai',
      unread: 0
    }

    setContacts(prev => {
      if (!prev.find(c => c.id === 'kimi-ai')) {
        return [...prev, kimiContact]
      }
      return prev
    })
    setActiveChat('kimi-ai')
    setMessages([])
  }

  // 加载用户设置
  useEffect(() => {
    const loadUserSettings = async () => {
      if (session?.user?.login && session.accessToken) {
        try {
          const config = await getConfig(session.accessToken, session.user.login)
          if (config?.general_settings?.autoSaveToGitHub) {
            // 设置自动保存间隔
            const interval = config.general_settings.saveInterval || 5
            setupAutoSave(interval)
          }
        } catch (error) {
          console.error('Error loading user settings:', error)
        }
      }
    }

    loadUserSettings()
    return () => {
      if (autoSaveInterval) {
        clearInterval(autoSaveInterval)
      }
    }
  }, [session])

  // 设置自动保存
  const setupAutoSave = (interval) => {
    if (autoSaveInterval) {
      clearInterval(autoSaveInterval)
    }

    const newInterval = setInterval(async () => {
      if (session?.user?.login && session.accessToken && messages.length > 0) {
        try {
          await saveChatHistory(session.accessToken, session.user.login, activeChat, messages)
          console.log('Auto-saved messages to GitHub')
        } catch (error) {
          console.error('Error auto-saving messages:', error)
        }
      }
    }, interval * 60 * 1000) // 转换为毫秒

    setAutoSaveInterval(newInterval)
  }

  // 在组件卸载时清理定时器
  useEffect(() => {
    return () => {
      if (autoSaveInterval) {
        clearInterval(autoSaveInterval)
      }
    }
  }, [autoSaveInterval])

  // 消息变化时手动保存
  useEffect(() => {
    const saveMessagesToGitHub = async () => {
      if (!session?.user?.login || !session.accessToken || !activeChat || messages.length === 0) return

      try {
        console.log('Saving messages for room:', activeChat)
        await saveChatHistory(session.accessToken, session.user.login, activeChat, messages)
        console.log('Successfully saved messages')
      } catch (error) {
        console.error('Error saving messages:', error)
      }
    }

    // 使用防抖来避免频繁保存
    const timeoutId = setTimeout(saveMessagesToGitHub, 1000)
    return () => clearTimeout(timeoutId)
  }, [messages, activeChat, session])

  // 添加删除聊天室的函数
  const handleDeleteChatRoom = async (roomId) => {
    if (!session?.user?.login || !session.accessToken) return
    if (roomId === 'public' || roomId === 'kimi-ai') {
      alert('系统聊天室不能删除')
      return
    }

    try {
      // 从联系人列表中移除
      setContacts(prev => prev.filter(c => c.id !== roomId))
      
      // 如果当前正在查看被删除的聊天室，切换到公共聊天室
      if (activeChat === roomId) {
        setActiveChat('public')
      }

      // 更新配置
      const config = await getConfig(session.accessToken, session.user.login)
      const updatedConfig = {
        ...config,
        contacts: contacts.filter(c => c.id !== roomId),
        last_updated: new Date().toISOString()
      }
      await updateConfig(session.accessToken, session.user.login, updatedConfig)

      // 可以选择是否也从 GitHub 仓库中删除聊天记录
      // 这里暂时不实现，因为可能需要保留历史记录
    } catch (error) {
      console.error('Error deleting chat room:', error)
    }
  }

  // 修改登录消息发送逻辑
  useEffect(() => {
    const sendLoginMessage = async () => {
      if (session?.user && socket?.connected) {
        try {
          const loginMessage = await generateLoginMessage(session)
          
          // 格式化系统通知
          const notification = await formatSystemNotification('login', {
            message: loginMessage,
            userInfo: {
              name: session.user.name,
              id: session.user.id,
              email: session.user.email
            },
            loginTime: new Date().toISOString()
          })

          if (notification) {
            // 保存到 GitHub
            await saveSystemNotification(session.accessToken, session.user.login, notification)

            // 发送到 Socket
            socket.emit('message', {
              ...notification,
              room: 'public'
            })

            // 如果当前在公共聊天室，更新本地消息
            if (activeChat === 'public') {
              setMessages(prev => [...prev, notification])
            }
          }
        } catch (error) {
          console.error('Error sending login message:', error)
        }
      }
    }

    // 确保只在初始连接时发送一次登录消息
    if (session?.user && socket?.connected && !socket._loginMessageSent) {
      socket._loginMessageSent = true
      sendLoginMessage()
    }
  }, [session, socket?.connected])

  // 修改页面标题部分
  const pageTitle = currentView === 'chat' 
    ? (contacts.find(c => c.id === activeChat)?.name || '聊天室')
    : '个人主页'

  // 检查用户访问权限
  useEffect(() => {
    if (username && session?.user?.login && username !== session.user.login) {
      router.push(`/${session.user.login}`)
    }
  }, [username, session?.user?.login, router])

  // 添加创建聊天室的处理函数
  const handleCreateRoom = async (roomData) => {
    if (!session?.user?.login || !session.accessToken) return

    try {
      // 生成唯一的房间ID
      const roomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      // 初始化聊天室
      await initializeChatRoom(
        session.accessToken,
        session.user.login,
        roomId,
        roomData.name,
        'room',
        {
          description: roomData.description,
          isPrivate: roomData.isPrivate,
          creator: session.user.login,
          created_at: new Date().toISOString()
        }
      )

      // 更新联系人列表
      const newContact = {
        id: roomId,
        name: roomData.name,
        type: 'room',
        unread: 0,
        description: roomData.description,
        isPrivate: roomData.isPrivate
      }

      setContacts(prev => [...prev, newContact])
      setActiveChat(roomId)

      // 更新用户配置
      if (userConfig) {
        const updatedConfig = {
          ...userConfig,
          contacts: [...(userConfig.contacts || []), newContact],
          settings: {
            ...userConfig.settings,
            activeChat: roomId
          },
          last_updated: new Date().toISOString()
        }
        await updateConfig(session.accessToken, session.user.login, updatedConfig)
      }
    } catch (error) {
      console.error('Error creating room:', error)
      throw error
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
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="max-w-sm w-full p-6">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">欢迎使用 Dock Chat</h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">请使用 GitHub 账号登��</p>
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

        {/* 聊天室列表 - 添加固定高度和滚动 */}
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
            onClick={() => setShowCreateRoomModal(true)}
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
            加入聊天室
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

      {/* 主聊天区 - 优化滚动行为 */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex-shrink-0 bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
          <div className="px-4 py-3 flex items-center justify-between relative">
            <div className="flex flex-col">
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                {pageTitle}
              </h1>
              {currentView === 'chat' && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {window.location.origin}/{session.user.login}
                </p>
              )}
            </div>
            {currentView === 'chat' && (
              <>
                <button
                  onClick={() => setShowChatSettings(!showChatSettings)}
                  className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <Cog6ToothIcon className="w-5 h-5" />
                </button>
                {showChatSettings && (
                  <ChatRoomSettings
                    room={{
                      id: activeChat,
                      name: contacts.find(c => c.id === activeChat)?.name || '聊天室'
                    }}
                    onDelete={handleDeleteChatRoom}
                    onClose={() => setShowChatSettings(false)}
                  />
                )}
              </>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 overflow-hidden">
          {currentView === 'chat' ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm h-full flex flex-col">
              {/* 消息列表区 - 优化滚动容器 */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${
                      message.user.id === session?.user?.id ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div className={`flex items-start gap-3 max-w-[70%] ${
                      message.user.id === session?.user?.id ? 'flex-row-reverse' : ''
                    }`}>
                      {message.user.image && (
                        <Image
                          src={message.user.image}
                          alt={message.user.name || '用户头像'}
                          width={40}
                          height={40}
                          className="rounded-full flex-shrink-0"
                        />
                      )}
                      <div className={`flex flex-col ${
                        message.user.id === session?.user?.id ? 'items-end' : 'items-start'
                      }`}>
                        <div className={`rounded-2xl p-4 break-words ${
                          message.isTyping ? 'bg-gray-100 dark:bg-gray-700 animate-pulse' :
                          message.isError ? 'bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400' :
                          message.user.id === session?.user?.id
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                        }`}>
                          <p className="text-sm font-medium mb-1">{message.user.name}</p>
                          <p className="text-base whitespace-pre-wrap">{message.content}</p>
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

              {/* 输入框区域 - 固定在底部 */}
              <form onSubmit={sendMessage} className="flex-shrink-0 p-4 border-t border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-4">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="flex-1 px-4 py-3 text-gray-700 dark:text-white bg-gray-50 dark:bg-gray-700 rounded-xl border-0 focus:ring-2 focus:ring-blue-500"
                    placeholder="输入消息..."
                    disabled={isSending}
                  />
                  <button
                    type="submit"
                    className={`flex-shrink-0 p-3 bg-blue-500 text-white rounded-xl transition-colors duration-200 ${
                      isSending ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'
                    }`}
                    disabled={!newMessage.trim() || !session || isSending}
                  >
                    {isSending ? (
                      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <PaperAirplaneIcon className="h-6 w-6" />
                    )}
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
                  ��入聊天室 ID 或 IP 地址
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

      {/* Kimi API Key 设置模态框 */}
      {showKimiModal && (
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
                  value={kimiApiKey}
                  onChange={(e) => setKimiApiKey(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="输入您的 Kimi AI API Key"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowKimiModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (kimiApiKey) {
                      setShowKimiModal(false)
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

      {showOnboarding && (
        <OnboardingModal
          isOpen={showOnboarding}
          onClose={() => setShowOnboarding(false)}
          session={session}
        />
      )}

      {/* 添加创建聊天室模态框 */}
      {showCreateRoomModal && (
        <CreateRoomModal
          onClose={() => setShowCreateRoomModal(false)}
          onCreate={handleCreateRoom}
        />
      )}
    </div>
  )
}

