'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession, signIn, signOut } from 'next-auth/react'
import { io } from 'socket.io-client'
import { 
  PaperAirplaneIcon,
  UserGroupIcon,
  UserCircleIcon,
  Cog6ToothIcon,
  PlusCircleIcon,
  SparklesIcon,
  XMarkIcon,
  UserPlusIcon
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
import {
  getChatMessagesCache,
  updateChatMessagesCache,
  getChatRoomsCache,
  updateChatRoomsCache,
  getUserConfigCache,
  updateUserConfigCache,
  clearUserCache
} from '@/lib/cache'
import AddFriendModal from './components/AddFriendModal'
import FriendRequestsModal from './components/FriendRequestsModal'
import UserProfileModal from './components/UserProfileModal'
import FriendsPage from './components/FriendsPage'

export default function Home({ username, roomId }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [currentView, setCurrentView] = useState('chat')
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [activeChat, setActiveChat] = useState('')
  const [contacts, setContacts] = useState([])
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [socket, setSocket] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [joinInput, setJoinInput] = useState('')
  const messagesEndRef = useRef(null)
  const [showKimiModal, setShowKimiModal] = useState(false)
  const [kimiApiKey, setKimiApiKey] = useState('')
  const [isWaitingForKimi, setIsWaitingForKimi] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [userConfig, setUserConfig] = useState(null)
  const [isSending, setIsSending] = useState(false)
  const { theme, setTheme } = useTheme()
  const [showCreateRoomModal, setShowCreateRoomModal] = useState(false)
  const [showAddFriendModal, setShowAddFriendModal] = useState(false)
  const [showFriendRequestsModal, setShowFriendRequestsModal] = useState(false)
  const [showUserProfileModal, setShowUserProfileModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [friendRequests, setFriendRequests] = useState([])
  const [friends, setFriends] = useState([])
  const [following, setFollowing] = useState([])

  // 修改错误处理
  const handleError = (error, message) => {
    console.error(message, error)
    alert(message)
  }

  // 修改加载消息的逻辑
  const loadChatMessages = async () => {
    if (!session?.user?.login || !session.accessToken || !activeChat) return

    try {
      setIsLoading(true)
      setMessages([]) // 立即清空消息，避免显示上一个聊天室的消息

      // 尝试从缓存加载消息
      const cachedMessages = getChatMessagesCache(session.user.login, activeChat)
      if (cachedMessages) {
        console.log('Using cached messages for', activeChat)
        setMessages(cachedMessages)
        setIsLoading(false)
        return
      }

      console.log('Loading messages for chat:', activeChat)

      // 从 GitHub 加载消息
      const messages = await loadChatHistory(session.accessToken, session.user.login, activeChat)
      console.log('Loaded messages:', messages)

      if (Array.isArray(messages) && messages.length > 0) {
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
        updateChatMessagesCache(session.user.login, activeChat, formattedMessages)
      }
    } catch (error) {
      handleError(error, '加载消息失败')
      setMessages([])
    } finally {
      setIsLoading(false)
    }
  }

  // 修改保存消息的逻辑
  const saveMessages = async (roomId, messages) => {
    if (!session?.user?.login || !session.accessToken) return

    try {
      console.log('Saving messages for room:', roomId)
      await saveChatHistory(session.accessToken, session.user.login, roomId, messages)
      updateChatMessagesCache(session.user.login, roomId, messages)

      // 更新联系人列表中的消息状态
      const updatedContacts = contacts.map(contact => {
        if (contact.id === roomId) {
          return {
            ...contact,
            last_message: messages[messages.length - 1] || null,
            message_count: messages.length,
            updated_at: new Date().toISOString()
          }
        }
        return contact
      })
      setContacts(updatedContacts)
      updateChatRoomsCache(session.user.login, updatedContacts)

      console.log('Successfully saved messages')
    } catch (error) {
      handleError(error, '保存消息失败')
    }
  }

  // 修改发送消息的逻辑
  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() || !session?.user?.login || !session.accessToken || isSending) return

    try {
      setIsSending(true)
      const message = {
        content: newMessage,
        user: {
          name: session.user.name || session.user.login,
          image: session.user.image || '/default-avatar.png',
          id: session.user.id
        },
        createdAt: new Date().toISOString()
      }

      // 添加消息到本地状态
      setMessages(prev => [...prev, message])
      setNewMessage('')

      // 保存消息
      const updatedMessages = [...messages, message]
      await saveMessages(activeChat, updatedMessages)

      // 如果是公共聊天室，发送到 WebSocket
      if (activeChat === 'public' && socket?.connected) {
        socket.emit('message', {
          ...message,
          room: 'public'
        })
      }

      // 如果是 Kimi AI 聊天室，发送到 AI
      if (activeChat === 'kimi-ai') {
        await handleKimiMessage(newMessage)
      }
    } catch (error) {
      handleError(error, '发送消息失败')
      // 移除失败的消息
      setMessages(prev => prev.slice(0, -1))
    } finally {
      setIsSending(false)
    }
  }

  // 修改聊天室切换的逻辑
  const handleChatChange = async (chatId) => {
    if (chatId === activeChat) return
    
    try {
      setActiveChat(chatId)
      setMessages([])
      setIsLoading(true)

      // 更新未读消息数
      const updatedContacts = contacts.map(contact => {
        if (contact.id === chatId) {
          return {
            ...contact,
            unread: 0
          }
        }
        return contact
      })
      setContacts(updatedContacts)

      // 更新用户配置
      if (userConfig && session?.user?.login && session.accessToken) {
        const updatedConfig = {
          ...userConfig,
          settings: {
            ...userConfig.settings,
            activeChat: chatId
          },
          last_updated: new Date().toISOString()
        }
        await updateConfig(session.accessToken, session.user.login, updatedConfig)
          .catch(error => console.error('Error updating config:', error))
      }

      // 加载消息
      await loadChatMessages()

      // 更新路由
      if (session?.user?.login) {
        router.push(`/${session.user.login}/${chatId}`)
      }
    } catch (error) {
      handleError(error, '切换聊天室失败')
    }
  }

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

          // 尝试从缓存加载数据
          const cachedConfig = getUserConfigCache(session.user.login)
          const cachedRooms = getChatRoomsCache(session.user.login)

          if (cachedConfig && cachedRooms) {
            console.log('Using cached data')
            setUserConfig(cachedConfig)
            setContacts(cachedRooms)
            
            // 设置活动聊天室
            let targetChat = ''
            if (cachedConfig?.settings?.activeChat) {
              const chatExists = cachedRooms.some(room => room.id === cachedConfig.settings.activeChat)
              if (chatExists) {
                targetChat = cachedConfig.settings.activeChat
              }
            }
            setActiveChat(targetChat)

            // 从缓存加载消息
            if (targetChat) {
              const cachedMessages = getChatMessagesCache(session.user.login, targetChat)
              if (cachedMessages) {
                setMessages(cachedMessages)
                setIsLoading(false)
              }
            }
          }

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
            updateUserConfigCache(session.user.login, config)
            
            // 恢复用户配置
            if (config.kimi_settings?.api_key) {
              setKimiApiKey(config.kimi_settings.api_key)
            }
            if (config.settings?.theme) {
              setTheme(config.settings.theme)
            }
          }

          // 加载聊天室列表
          const rooms = await getChatRooms(session.accessToken, session.user.login)
          console.log('Loaded chat rooms:', rooms)
          
          if (rooms.length > 0) {
            setContacts(rooms)
            updateChatRoomsCache(session.user.login, rooms)

            // 设置活动聊天室
            let targetChat = ''
            if (config?.settings?.activeChat) {
              const chatExists = rooms.some(room => room.id === config.settings.activeChat)
              if (chatExists) {
                targetChat = config.settings.activeChat
              }
            }
            setActiveChat(targetChat)

            // 加载消息
            if (targetChat) {
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
                updateChatMessagesCache(session.user.login, targetChat, formattedMessages)
              } else {
                setMessages([])
              }
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

  // 修改主题变化时的逻辑
  useEffect(() => {
    if (userConfig && theme !== userConfig.settings?.theme) {
      const updatedConfig = {
        ...userConfig,
        settings: {
          ...userConfig.settings,
          theme
        },
        last_updated: new Date().toISOString()
      }
      updateConfig(session.accessToken, session.user.login, updatedConfig)
        .catch(error => console.error('Error updating theme:', error))
    }
  }, [theme])

  // 修改渲染导航栏的逻辑
  const renderNavigation = () => {
    return (
      <nav className="w-64 bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
        <div className="p-4">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">聊天室列表</h2>
          <div className="space-y-2">
            {contacts.map(contact => (
              <button
                key={contact.id}
                onClick={() => handleChatChange(contact.id)}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                  activeChat === contact.id
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                <span className="truncate">{contact.name}</span>
                {contact.unread > 0 && (
                  <span className="ml-auto bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                    {contact.unread}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </nav>
    )
  }

  // 修改初始化检查的逻辑
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
                // 确保联系人列表包含必要的字段
                const formattedContacts = config.contacts.map(contact => ({
                  id: contact.id,
                  name: contact.name,
                  type: contact.type,
                  unread: contact.unread || 0,
                  created_at: contact.created_at || new Date().toISOString(),
                  updated_at: contact.updated_at || new Date().toISOString(),
                  message_count: contact.message_count || 0,
                  last_message: contact.last_message || null,
                  description: contact.description,
                  isPrivate: contact.isPrivate
                }))
                setContacts(formattedContacts)
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
      const updatedConfig = {
        ...userConfig,
        settings: {
          ...userConfig.settings,
          theme: theme
        },
        last_updated: new Date().toISOString()
      }
      saveConfig(updatedConfig)
    }
  }, [theme])

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

  // 修改删除聊天室的逻辑
  const handleDeleteChatRoom = async (roomId) => {
    if (!session?.user?.login || !session.accessToken) return
    if (roomId === 'public' || roomId === 'kimi-ai') {
      alert('系统聊天室不能删除')
      return
    }

    try {
      // 从联系人列表中移除
      const updatedContacts = contacts.filter(c => c.id !== roomId)
      setContacts(updatedContacts)
      
      // 如果当前正在查看被删除的聊天室，切换到公共聊天室
      if (activeChat === roomId) {
        setActiveChat('public')
      }

      // 更新用户配置
      if (userConfig) {
        const updatedConfig = {
          ...userConfig,
          contacts: updatedContacts,
          settings: {
            ...userConfig.settings,
            activeChat: activeChat === roomId ? 'public' : activeChat
          },
          last_updated: new Date().toISOString()
        }
        await updateConfig(session.accessToken, session.user.login, updatedConfig)
      }
    } catch (error) {
      console.error('Error deleting chat room:', error)
      alert('删除聊天室失败')
    }
  }

  // 修改登录消息发送逻辑
  useEffect(() => {
    const sendLoginMessage = async () => {
      if (session?.user && socket?.connected) {
        try {
          const loginMessage = await generateLoginMessage(session)
          
          // 创建系统通知消息
          const systemMessage = {
            content: loginMessage,
            user: {
              name: 'System',
              image: '/system-avatar.png',
              id: 'system'
            },
            type: 'system',
            createdAt: new Date().toISOString()
          }

          // 保存到系统通知聊天室
          if (session.accessToken && session.user.login) {
            try {
              // 加载现有系统消息
              const existingMessages = await loadChatHistory(session.accessToken, session.user.login, 'system')
              const updatedMessages = [...existingMessages, systemMessage]
              
              // 保存更新后的消息
              await saveChatHistory(session.accessToken, session.user.login, 'system', updatedMessages)

              // 更新联系人列表中的系统通知未读数
              const updatedContacts = contacts.map(contact => {
                if (contact.id === 'system') {
                  return {
                    ...contact,
                    unread: (contact.unread || 0) + 1,
                    last_message: systemMessage,
                    message_count: updatedMessages.length,
                    updated_at: new Date().toISOString()
                  }
                }
                return contact
              })
              setContacts(updatedContacts)

              // 更新用户配置
              if (userConfig) {
                const updatedConfig = {
                  ...userConfig,
                  contacts: updatedContacts,
                  last_updated: new Date().toISOString()
                }
                await updateConfig(session.accessToken, session.user.login, updatedConfig)
              }
            } catch (error) {
              console.error('Error saving system notification:', error)
            }
          }

          // 发送到公共聊天室
          socket.emit('message', {
            ...systemMessage,
            room: 'public'
          })

          // 如果当前在公共聊天室，更新本地消息
          if (activeChat === 'public') {
            setMessages(prev => [...prev, systemMessage])
          }
        } catch (error) {
          console.error('Error sending login message:', error)
        }
      }
    }

    // 确保只在初始连接发送一次登录消息
    if (session?.user && socket?.connected && !socket._loginMessageSent) {
      socket._loginMessageSent = true
      sendLoginMessage()
    }
  }, [session, socket?.connected])

  // 修改页面标题的逻辑
  const pageTitle = {
    chat: contacts.find(c => c.id === activeChat)?.name || '聊天室',
    profile: '个人主页',
    friends: '好友列表'
  }[currentView]

  // 修改页面 URL 的逻辑
  const getPageUrl = () => {
    if (!session?.user?.login) return ''
    
    switch (currentView) {
      case 'chat':
        return activeChat ? `${session.user.login}/${activeChat}` : session.user.login
      case 'profile':
        return session.user.login
      case 'friends':
        return `${session.user.login}/friends`
      default:
        return session.user.login
    }
  }

  // 监听 URL 变化
  useEffect(() => {
    if (session?.user?.login && typeof window !== 'undefined') {
      const pathParts = window.location.pathname.split('/')
      if (pathParts.length >= 3) {
        const roomId = pathParts[2]
        if (roomId && roomId !== activeChat) {
          setActiveChat(roomId)
        }
      }
    }
  }, [session, router.asPath])

  // 添加加入聊天室的逻辑
  const handleJoinRoom = async (roomId) => {
    if (!roomId.trim() || !session?.user?.login || !session.accessToken) return

    try {
      // 初始化聊天室
      await initializeChatRoom(
        session.accessToken,
        session.user.login,
        roomId,
        `聊天室 ${roomId}`,
        'room',
        {
          creator: session.user.login,
          created_at: new Date().toISOString()
        }
      )

      // 更新联系人列表
      const newContact = {
        id: roomId,
        name: `聊天室 ${roomId}`,
        type: 'room',
        unread: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        message_count: 0,
        last_message: null
      }

      const updatedContacts = [...contacts, newContact]
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

      // 切换到新加入的聊天室
      setActiveChat(roomId)
      setShowJoinModal(false)

      // 更新路由
      router.push(`/${session.user.login}/${roomId}`)
    } catch (error) {
      console.error('Error joining chat room:', error)
      alert('加入聊天室失败')
    }
  }

  // 监听聊天室切换
  useEffect(() => {
    if (activeChat) {
      loadChatMessages()
    }
  }, [activeChat, session])

  // 加载用户设置
  useEffect(() => {
    const loadUserSettings = async () => {
      if (session?.user?.login && session.accessToken) {
        try {
          const config = await getConfig(session.accessToken, session.user.login)
          if (config) {
            setUserConfig(config)
            if (config?.settings?.theme) {
              setTheme(config.settings.theme)
            }
          }
        } catch (error) {
          console.error('Error loading user settings:', error)
        }
      }
    }

    loadUserSettings()
  }, [session])

  // 消息保存逻辑
  useEffect(() => {
    if (!activeChat || !messages.length || !session?.user?.login || !session.accessToken) return

    const timeoutId = setTimeout(async () => {
      try {
        console.log('Saving messages for room:', activeChat)
        await saveChatHistory(session.accessToken, session.user.login, activeChat, messages)
        updateChatMessagesCache(session.user.login, activeChat, messages)
      } catch (error) {
        console.error('Error saving messages:', error)
      }
    }, 1000)

    return () => clearTimeout(timeoutId)
  }, [messages, activeChat, session])

  // 修改退出登录的处理
  const handleSignOut = async () => {
    try {
      // 清除用户缓存
      if (session?.user?.login) {
        clearUserCache(session.user.login)
      }
      await signOut({ callbackUrl: '/' })
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  // 修改聊天室切换逻辑
  const handleRoomChange = async (roomId) => {
    if (roomId === activeChat) return
    
    setActiveChat(roomId)
    setMessages([]) // 立即清空消息
    setIsLoading(true)

    // 更新 URL
    if (typeof window !== 'undefined') {
      router.replace(`/${session.user.login}/${roomId}`)
    }

    // 更新用户配置
    if (session?.accessToken && session.user.login && userConfig) {
      const updatedConfig = {
        ...userConfig,
        settings: {
          ...userConfig.settings,
          activeChat: roomId
        },
        last_updated: new Date().toISOString()
      }
      await updateConfig(session.accessToken, session.user.login, updatedConfig)
        .catch(error => console.error('Error updating config:', error))
    }

    // 加载新聊天室的消息
    await loadChatMessages()
  }

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
      router.push(`/${session.user.login}/${roomId}`)
    } catch (error) {
      console.error('Error creating room:', error)
      alert('创建聊天室失败，请重试')
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
    if (roomId && roomId !== activeChat) {
      setActiveChat(roomId)
    }
  }, [status, session, username, roomId, router])

  // 处理好友请求
  const handleSendFriendRequest = async ({ friendId, note }) => {
    if (!session?.user?.login || !session.accessToken) return

    try {
      // 保存好友请求到 GitHub
      const requestId = `fr-${Date.now()}`
      const requestContent = JSON.stringify({
        id: requestId,
        from: session.user.login,
        to: friendId,
        note: note,
        status: 'pending',
        created_at: new Date().toISOString()
      }, null, 2)

      const encodedContent = btoa(unescape(encodeURIComponent(requestContent)))
      
      await fetch(`https://api.github.com/repos/${friendId}/dock-chat-data/contents/friend_requests/${requestId}.json`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `Friend request from ${session.user.login}`,
          content: encodedContent
        })
      })

      alert('好友请求已发送')
    } catch (error) {
      console.error('Error sending friend request:', error)
      alert('发送好友请求失败，请重试')
    }
  }

  // 处理接受好友请求
  const handleAcceptFriendRequest = async (requestId) => {
    if (!session?.user?.login || !session.accessToken) return

    try {
      const request = friendRequests.find(r => r.id === requestId)
      if (!request) return

      // 更新好友请求状态
      const updatedRequest = {
        ...request,
        status: 'accepted',
        updated_at: new Date().toISOString()
      }

      const encodedContent = btoa(unescape(encodeURIComponent(JSON.stringify(updatedRequest, null, 2))))
      
      await fetch(`https://api.github.com/repos/${session.user.login}/dock-chat-data/contents/friend_requests/${requestId}.json`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `Accept friend request from ${request.from}`,
          content: encodedContent
        })
      })

      // 添加到好友列表
      const newFriend = {
        id: request.from,
        name: request.user.name,
        image: request.user.image,
        added_at: new Date().toISOString()
      }

      const updatedFriends = [...friends, newFriend]
      setFriends(updatedFriends)

      // 更新用户配置
      if (userConfig) {
        const updatedConfig = {
          ...userConfig,
          friends: updatedFriends,
          last_updated: new Date().toISOString()
        }
        await updateConfig(session.accessToken, session.user.login, updatedConfig)
        setUserConfig(updatedConfig)
      }

      // 从请求列表中移除
      setFriendRequests(prev => prev.filter(r => r.id !== requestId))
    } catch (error) {
      console.error('Error accepting friend request:', error)
      alert('接受好友请求失败，请重试')
    }
  }

  // 处理拒绝好友请求
  const handleRejectFriendRequest = async (requestId) => {
    if (!session?.user?.login || !session.accessToken) return

    try {
      const request = friendRequests.find(r => r.id === requestId)
      if (!request) return

      // 更新好友请求状态
      const updatedRequest = {
        ...request,
        status: 'rejected',
        updated_at: new Date().toISOString()
      }

      const encodedContent = btoa(unescape(encodeURIComponent(JSON.stringify(updatedRequest, null, 2))))
      
      await fetch(`https://api.github.com/repos/${session.user.login}/dock-chat-data/contents/friend_requests/${requestId}.json`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `Reject friend request from ${request.from}`,
          content: encodedContent
        })
      })

      // 从请求列表中移除
      setFriendRequests(prev => prev.filter(r => r.id !== requestId))
    } catch (error) {
      console.error('Error rejecting friend request:', error)
      alert('拒绝好友请求失败，请重试')
    }
  }

  // 处理关注用户
  const handleFollowUser = async (userId) => {
    if (!session?.user?.login || !session.accessToken) return

    try {
      const isFollowing = following.some(f => f.id === userId)
      let updatedFollowing

      if (isFollowing) {
        // 取消关注
        updatedFollowing = following.filter(f => f.id !== userId)
      } else {
        // 添加关注
        const newFollowing = {
          id: userId,
          followed_at: new Date().toISOString()
        }
        updatedFollowing = [...following, newFollowing]
      }

      setFollowing(updatedFollowing)

      // 更新用户配置
      if (userConfig) {
        const updatedConfig = {
          ...userConfig,
          following: updatedFollowing,
          last_updated: new Date().toISOString()
        }
        await updateConfig(session.accessToken, session.user.login, updatedConfig)
        setUserConfig(updatedConfig)
      }
    } catch (error) {
      console.error('Error following user:', error)
      alert('操作失败，请重试')
    }
  }

  // 加载好友请求
  useEffect(() => {
    const loadFriendRequests = async () => {
      if (!session?.user?.login || !session.accessToken) return

      try {
        const response = await fetch(
          `https://api.github.com/repos/${session.user.login}/dock-chat-data/contents/friend_requests`,
          {
            headers: {
              'Authorization': `Bearer ${session.accessToken}`,
            }
          }
        )

        if (response.ok) {
          const files = await response.json()
          const requests = await Promise.all(
            files
              .filter(file => file.name.endsWith('.json'))
              .map(async file => {
                const content = await fetch(file.download_url).then(res => res.json())
                return content.status === 'pending' ? content : null
              })
          )

          setFriendRequests(requests.filter(Boolean))
        }
      } catch (error) {
        console.error('Error loading friend requests:', error)
      }
    }

    loadFriendRequests()
  }, [session])

  // 修改 Kimi AI 消息处理逻辑
  const handleKimiMessage = async (content) => {
    if (!kimiApiKey) {
      console.error('Kimi API key not set')
      return
    }

    try {
      setIsWaitingForKimi(true)
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

      setMessages(prev => [...prev, typingMessage])

      const response = await sendMessageToKimi(content, kimiApiKey)
      
      // 移除正在输入状态的消息并添加 AI 响应
      setMessages(prev => {
        const messagesWithoutTyping = prev.filter(msg => !msg.isTyping)
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
        saveChatHistory(session.accessToken, session.user.login, activeChat, updatedMessages)
          .catch(error => console.error('Error saving AI chat history:', error))
        
        return updatedMessages
      })
    } catch (error) {
      console.error('Failed to get Kimi AI response:', error)
      setMessages(prev => {
        const messagesWithoutTyping = prev.filter(msg => !msg.isTyping)
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
        saveChatHistory(session.accessToken, session.user.login, activeChat, updatedMessages)
          .catch(error => console.error('Error saving error message:', error))
        
        return updatedMessages
      })
    } finally {
      setIsWaitingForKimi(false)
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
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* 左侧边栏 */}
      <div className="w-64 flex flex-col bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
        {/* 用户信息 */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            {session?.user?.image && (
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
                {session?.user?.name || '用户'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                @{session?.user?.login}
              </p>
            </div>
          </div>
        </div>

        {/* 聊天列表 */}
        <div className="flex-1 overflow-y-auto">
          <div className="space-y-1 p-2">
            {contacts.map((contact) => (
              <button
                key={contact.id}
                onClick={() => handleChatChange(contact.id)}
                className={`w-full flex items-center px-3 py-2 rounded-lg ${
                  activeChat === contact.id
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {contact.name}
                  </p>
                  {contact.lastMessage && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {contact.lastMessage}
                    </p>
                  )}
                </div>
                {contact.unread > 0 && (
                  <span className="ml-2 px-2 py-1 text-xs bg-blue-500 text-white rounded-full">
                    {contact.unread}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* 底部操作按钮 */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="space-y-2">
            <button
              onClick={() => setShowCreateRoomModal(true)}
              className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <PlusCircleIcon className="h-5 w-5 mr-2" />
              新建聊天
            </button>
            <button
              onClick={() => setShowJoinModal(true)}
              className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 dark:text-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700"
            >
              <UserGroupIcon className="h-5 w-5 mr-2" />
              加入聊天室
            </button>
          </div>
        </div>
      </div>

      {/* 主聊天区域 */}
      <div className="flex-1 flex flex-col">
        {/* 聊天头部 */}
        <div className="h-16 flex items-center justify-between px-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">
              {contacts.find((c) => c.id === activeChat)?.name || '聊天室'}
            </h2>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentView(currentView === 'chat' ? 'friends' : 'chat')}
              className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <UserPlusIcon className="h-5 w-5" />
            </button>
            <button
              onClick={() => setShowSettingsModal(true)}
              className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Cog6ToothIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* 聊天内容区域 */}
        {currentView === 'chat' ? (
          <>
            {/* 消息列表 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex items-start space-x-3 ${
                    message.user.id === session?.user?.id ? 'flex-row-reverse space-x-reverse' : ''
                  }`}
                >
                  <Image
                    src={message.user.image || '/default-avatar.png'}
                    alt={message.user.name}
                    width={40}
                    height={40}
                    className="rounded-full"
                  />
                  <div
                    className={`flex flex-col ${
                      message.user.id === session?.user?.id ? 'items-end' : 'items-start'
                    }`}
                  >
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {message.user.name}
                    </span>
                    <div
                      className={`mt-1 px-4 py-2 rounded-lg ${
                        message.user.id === session?.user?.id
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-800'
                      }`}
                    >
                      {message.content}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* 输入框 */}
            <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
              <form onSubmit={sendMessage} className="flex space-x-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="输入消息..."
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
                <button
                  type="submit"
                  disabled={!isConnected || isSending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  <PaperAirplaneIcon className="h-5 w-5" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <FriendsPage
            friends={friends}
            following={following}
            onAddFriend={() => setShowAddFriendModal(true)}
            onShowRequests={() => setShowFriendRequestsModal(true)}
            onSelectUser={(user) => {
              setSelectedUser(user)
              setShowUserProfileModal(true)
            }}
          />
        )}
      </div>

      {/* 加入聊天室模态框 */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">加入聊天室</h2>
              <button
                onClick={() => setShowJoinModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleJoin} className="p-4 space-y-4">
              <div>
                <label htmlFor="roomId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  聊天室 ID
                </label>
                <input
                  type="text"
                  id="roomId"
                  value={joinInput}
                  onChange={(e) => setJoinInput(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="输入聊天室 ID"
                  required
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowJoinModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={!joinInput.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  加入
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 其他模态框 */}
      {showSettingsModal && (
        <SettingsModal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          config={userConfig}
          onSave={saveConfig}
          theme={theme}
          setTheme={setTheme}
        />
      )}
      {showCreateRoomModal && (
        <CreateRoomModal
          isOpen={showCreateRoomModal}
          onClose={() => setShowCreateRoomModal(false)}
          onCreate={handleCreateRoom}
        />
      )}
      {showAddFriendModal && (
        <AddFriendModal
          isOpen={showAddFriendModal}
          onClose={() => setShowAddFriendModal(false)}
          onSendRequest={handleSendFriendRequest}
        />
      )}
      {showFriendRequestsModal && (
        <FriendRequestsModal
          isOpen={showFriendRequestsModal}
          onClose={() => setShowFriendRequestsModal(false)}
          requests={friendRequests}
          onAccept={handleAcceptFriendRequest}
          onReject={handleRejectFriendRequest}
        />
      )}
      {showUserProfileModal && selectedUser && (
        <UserProfileModal
          isOpen={showUserProfileModal}
          onClose={() => {
            setShowUserProfileModal(false)
            setSelectedUser(null)
          }}
          user={selectedUser}
          onFollow={handleFollowUser}
          isFollowing={following.includes(selectedUser.id)}
        />
      )}
    </div>
  )
}

