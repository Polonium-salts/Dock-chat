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

// 注册扩展
extensionManager.register(new FileShareExtension())
extensionManager.register(new CodeCollabExtension())
extensionManager.register(new SystemNotificationExtension())
extensionManager.register(new RoomSettingsExtension())

export default function HomeWrapper({ username }) {
  return <Home username={username} />
}

function Home({ username }) {
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
  const [currentRoom, setCurrentRoom] = useState(null)
  const [showUpload, setShowUpload] = useState(false)
  const [showCodeEditor, setShowCodeEditor] = useState(false)

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

          // 预加载所有数据
          await preloadCache(session.user.login, session.accessToken)

          // 从缓存加载配置
          const config = getCache(session.user.login, 'config')
          console.log('Loaded config:', config)
          
          if (config) {
            setUserConfig(config)
            if (config.kimi_settings?.api_key) {
              setKimiApiKey(config.kimi_settings.api_key)
            }
          }

          // 从缓存加载聊天室列表
          const rooms = getCache(session.user.login, 'rooms')
          console.log('Loaded chat rooms:', rooms)
          
          if (rooms?.length > 0) {
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

  // 修改加载消息的逻辑
  const loadChatMessages = async () => {
    if (!session?.user?.login || !session.accessToken || !activeChat) return

    try {
      setIsLoading(true)
      setMessages([]) // 立即清空消息，避免显示上一个聊天室的消息
      console.log('Loading messages for chat:', activeChat)

      // 从 GitHub 加载消息（现在会优先使用缓存）
      const messages = await loadChatHistory(session.accessToken, session.user.login, activeChat)
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
          setMessages(formattedMessages)
        })
        console.log('Set formatted messages:', formattedMessages)
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

      // 更新联系人列表中的未读消息状态
      const updatedContacts = contacts.map(contact => {
        if (contact.id === activeChat) {
          return {
            ...contact,
            unread: 0,
            last_message: messages[messages.length - 1] || null,
            message_count: messages.length
          }
        }
        return contact
      })
      setContacts(updatedContacts)

    } catch (error) {
      console.error('Error loading messages:', error)
      setMessages([])
    } finally {
      setIsLoading(false)
    }
  }

  // 修改聊天室切换的逻辑
  const handleChatChange = async (chatId) => {
    if (chatId === activeChat) return
    setActiveChat(chatId)
    setMessages([]) // 立即清空消息
    setIsLoading(true) // 显示加载状态

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
        setMessages(formattedMessages)
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
          setMessages(formattedMessages)
        }
      }

      // 如果切换到系统通知，清除未读消息数
      if (chatId === 'system') {
        const updatedContacts = contacts.map(contact => {
          if (contact.id === 'system') {
            return {
              ...contact,
              unread: 0
            }
          }
          return contact
        })
        setContacts(updatedContacts)

        // 更新用户配置
        if (session?.accessToken && session.user.login && userConfig) {
          const updatedConfig = {
            ...userConfig,
            contacts: updatedContacts,
            last_updated: new Date().toISOString()
          }
          await updateConfig(session.accessToken, session.user.login, updatedConfig)
        }
      }
    } catch (error) {
      console.error('Error loading messages:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // 修改保存消息的逻辑
  const saveMessages = async (roomId, messages) => {
    if (!session?.user?.login || !session.accessToken) return

    try {
      console.log('Saving messages for room:', roomId)
      const savedMessages = await saveChatHistory(session.accessToken, session.user.login, roomId, messages)
      
      // 更新联系人列表中的消息状态
      const updatedContacts = contacts.map(contact => {
        if (contact.id === roomId) {
          return {
            ...contact,
            last_message: savedMessages[savedMessages.length - 1] || null,
            message_count: savedMessages.length,
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

      console.log('Successfully saved messages')
    } catch (error) {
      console.error('Error saving messages:', error)
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

  const handleSendMessage = async (content) => {
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
        // 获取当前所有消息括新消息
        const updatedMessages = [...messages, message]
        try {
          await saveChatHistory(session.accessToken, session.user.login, activeChat, updatedMessages)
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
    if (!joinInput.trim() || !session?.user?.login || !session.accessToken) return

    try {
      // 初始化聊天室
      await initializeChatRoom(
        session.accessToken,
        session.user.login,
        joinInput,
        `聊天室 ${joinInput}`,
        'room',
        {
          creator: session.user.login,
          created_at: new Date().toISOString()
        }
      )

      // 更新联系人列表
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

      setContacts(prev => [...prev, newContact])
      setJoinInput('')
      setShowJoinModal(false)
      setActiveChat(joinInput)

      // 更新用户配置
      if (userConfig) {
        const updatedConfig = {
          ...userConfig,
          contacts: [...contacts, newContact],
          settings: {
            ...userConfig.settings,
            activeChat: joinInput
          },
          last_updated: new Date().toISOString()
        }
        await updateConfig(session.accessToken, session.user.login, updatedConfig)
      }
    } catch (error) {
      console.error('Error joining chat room:', error)
      alert('加入聊天室失败')
    }
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

  // 修改面标题部分
  const pageTitle = currentView === 'chat' 
    ? (contacts.find(c => c.id === activeChat)?.name || '聊天室')
    : '个人主页'

  // 检查用户访问权限
  useEffect(() => {
    if (username && session?.user?.login && username !== session.user.login) {
      router.push(`/${session.user.login}`)
    }
  }, [username, session?.user?.login, router])

  // 修改创建聊天室的逻辑
  const handleCreateRoom = async (roomData) => {
    if (!session?.user?.login || !session.accessToken) return

    try {
      // 生成唯一的房间ID
      const roomId = `${roomData.type === 'basic' ? 'room' : 'ext'}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      // 初始化聊天室
      await initializeChatRoom(
        session.accessToken,
        session.user.login,
        roomId,
        roomData.name,
        roomData.type,
        {
          description: roomData.description,
          isPrivate: roomData.isPrivate,
          creator: session.user.login,
          created_at: new Date().toISOString(),
          // 如果是扩展类型，添加扩展相关配置
          ...(roomData.type === 'extended' && {
            extensionType: roomData.extensionType,
            extensionConfig: roomData.extensionConfig
          })
        }
      )

      // 更新联系人列表
      const newContact = {
        id: roomId,
        name: roomData.name,
        type: roomData.type,
        unread: 0,
        description: roomData.description,
        isPrivate: roomData.isPrivate,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        message_count: 0,
        last_message: null,
        // 如果是扩展类型，添加扩展相关信息
        ...(roomData.type === 'extended' && {
          extensionType: roomData.extensionType,
          extensionConfig: roomData.extensionConfig
        })
      }

      const updatedContacts = [...contacts, newContact]
      setContacts(updatedContacts)
      setActiveChat(roomId)

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
      }

      setShowCreateRoomModal(false)
    } catch (error) {
      console.error('Error creating room:', error)
      alert('创建聊天室失败')
    }
  }

  // ��听聊天室切换
  useEffect(() => {
    if (activeChat) {
      loadChatMessages()
    }
  }, [activeChat, session])

  // 优化消息保存逻辑
  useEffect(() => {
    if (!activeChat || !messages.length || !session?.user?.login || !session.accessToken) return

    const timeoutId = setTimeout(async () => {
      try {
        console.log('Saving messages for room:', activeChat)
        const savedMessages = await saveChatHistory(session.accessToken, session.user.login, activeChat, messages)
        
        // 更新联系人列表中的消息状态
        const updatedContacts = contacts.map(contact => {
          if (contact.id === activeChat) {
            return {
              ...contact,
              last_message: savedMessages[savedMessages.length - 1] || null,
              message_count: savedMessages.length,
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

        console.log('Successfully saved messages')
      } catch (error) {
        console.error('Error saving messages:', error)
      }
    }, 1000) // 1秒延迟保存

    return () => clearTimeout(timeoutId)
  }, [messages, activeChat, session])

  // 在组件初始化时初始化扩展
  useEffect(() => {
    if (socket && currentRoom) {
      const context = new ExtensionContext(
        currentRoom.id,
        socket,
        session?.user
      )
      extensionManager.initializeAll(context)

      return () => {
        extensionManager.destroyAll()
      }
    }
  }, [socket, currentRoom, session])

  // 在渲染消息时集成扩展的UI
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

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() || !session || isSending) return
    
    const content = newMessage.trim()
    setNewMessage('')
    await handleSendMessage(content)
  }

  // 添加文件上传按钮
  const renderInputTools = () => {
    const fileShareExtension = extensionManager.getExtension('file-share')
    const codeCollabExtension = extensionManager.getExtension('code-collab')

    return (
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowUpload(true)}
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
          onClick={() => setShowCodeEditor(true)}
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
        {showUpload && fileShareExtension && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-xl">
              {fileShareExtension.components.get('FileUpload')({
                onClose: () => setShowUpload(false)
              })}
            </div>
          </div>
        )}
        {showCodeEditor && codeCollabExtension && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-2xl bg-white dark:bg-gray-800 rounded-lg shadow-xl">
              {codeCollabExtension.components.get('CodeEditor')({
                onClose: () => setShowCodeEditor(false)
              })}
            </div>
          </div>
        )}
      </div>
    )
  }

  // 在用户登录时发送系统通知
  useEffect(() => {
    if (session?.user) {
      const systemNotification = extensionManager.getExtension('system-notification')
      if (systemNotification) {
        systemNotification.sendSystemNotification(
          `欢迎回来，${session.user.name || session.user.login}！`,
          'success'
        )
      }
    }
  }, [session])

  // 在切换聊天室时发送系统通知
  useEffect(() => {
    if (activeChat && session?.user) {
      const systemNotification = extensionManager.getExtension('system-notification')
      if (systemNotification) {
        const chatName = contacts.find(contact => contact.id === activeChat)?.name || activeChat
        systemNotification.sendSystemNotification(
          `已切换到聊天室：${chatName}`,
          'info'
        )
      }
    }
  }, [activeChat, contacts, session])

  // 在发生错误时发送系统通知
  const handleError = (error) => {
    const systemNotification = extensionManager.getExtension('system-notification')
    if (systemNotification) {
      systemNotification.sendSystemNotification(
        error.message || '发生错误，请稍后重试',
        'error'
      )
    }
  }

  // 添加聊天室设置按钮
  const renderRoomHeader = () => {
    const roomSettingsExtension = extensionManager.getExtension('room-settings')
    const [showSettings, setShowSettings] = useState(false)

    if (!activeChat || !contacts) return null

    const currentRoom = contacts.find(contact => contact.id === activeChat)
    if (!currentRoom) return null

    return (
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">
            {currentRoom.name || activeChat}
          </h2>
          {currentRoom.description && (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {currentRoom.description}
            </span>
          )}
        </div>
        <button
          onClick={() => setShowSettings(true)}
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
        {showSettings && roomSettingsExtension && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-2xl bg-white dark:bg-gray-800 rounded-lg shadow-xl">
              {roomSettingsExtension.components.get('RoomSettings')({
                onClose: () => setShowSettings(false),
                room: currentRoom
              })}
            </div>
          </div>
        )}
      </div>
    )
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
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      {/* 左侧导航栏 - 添加固定宽度 */}
      <div className="w-80 flex-shrink-0 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        {/* 用信息区域 */}
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

        {/* 聊天室列表 - 添��固定高度和滚动 */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {contacts.map(contact => (
            <button
              key={contact.id}
              onClick={() => handleChatChange(contact.id)}
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
        {renderRoomHeader()}
        <div className="flex-1 overflow-y-auto p-4">
          {currentView === 'chat' ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm h-full flex flex-col">
              {/* 消息列表区 - 优化滚动容器 */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {isLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="flex flex-col items-center space-y-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">加载消息中...</p>
                    </div>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-sm text-gray-500 dark:text-gray-400">暂无消息</p>
                  </div>
                ) : (
                  <>
                    {messages.map((message, index) => (
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

              {/* 输入框区域 - 固定在底部 */}
              <form onSubmit={handleSubmit} className="flex-shrink-0 p-4 border-t border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-4">
                  {renderInputTools()}
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="输入消息..."
                    className="flex-1 p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="submit"
                    disabled={isSending}
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

      {/* 加入聊天室模态框 */}
      {showJoinModal && (
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

