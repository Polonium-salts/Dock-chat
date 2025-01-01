'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
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
import SettingsPage from './components/SettingsPage'
import Toast from './components/Toast'

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
  const [activeChat, setActiveChat] = useState('public')
  const [contacts, setContacts] = useState([])
  const messagesEndRef = useRef(null)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [currentView, setCurrentView] = useState('chat') // 'chat', 'profile', 'friends'
  const [showKimiModal, setShowKimiModal] = useState(false)
  const [kimiApiKey, setKimiApiKey] = useState('')
  const [isWaitingForKimi, setIsWaitingForKimi] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [userConfig, setUserConfig] = useState(null)
  const [isSending, setIsSending] = useState(false)
  const [showChatSettings, setShowChatSettings] = useState(false)
  const { theme, setTheme } = useTheme()
  const [showCreateRoomModal, setShowCreateRoomModal] = useState(false)
  const [showAddFriendModal, setShowAddFriendModal] = useState(false)
  const [showFriendRequestsModal, setShowFriendRequestsModal] = useState(false)
  const [showUserProfileModal, setShowUserProfileModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [friendRequests, setFriendRequests] = useState([])
  const [friends, setFriends] = useState([])
  const [following, setFollowing] = useState([])
  const [toast, setToast] = useState(null)
  const [isSaving, setIsSaving] = useState(false)

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
        timeout: 10000,
        auth: {
          token: session.accessToken,
          userId: session.user.id,
          userName: session.user.name,
          userImage: session.user.image,
          userLogin: session.user.login
        }
      })

      socket.on('connect', () => {
        console.log('Socket connected')
        setIsConnected(true)
        if (activeChat) {
        socket.emit('join', { 
          room: activeChat,
            user: {
              id: session.user.id,
              name: session.user.name,
              image: session.user.image,
              login: session.user.login
            }
          })
        }
      })

      socket.on('message', (message) => {
        console.log('Received message:', message)
        if (message.room === activeChat) {
          setMessages(prev => {
            // 检查消息是否已存在
            const exists = prev.some(m => 
              m.id === message.id || 
              (m.createdAt === message.createdAt && m.user.id === message.user.id)
            );
            if (exists) return prev;
            
            return [...prev, {
              ...message,
              isOwnMessage: message.user.id === session.user.id
            }];
          });

          // 更新联系人列表中的最后一条消息
          setContacts(prev => prev.map(contact => {
            if (contact.id === activeChat) {
              return {
                ...contact,
                lastMessage: message.content,
                updated_at: new Date().toISOString()
              };
            }
            return contact;
          }));
        }
      })

      setSocket(socket)

      return () => {
        console.log('Cleaning up socket connection...')
        if (socket.connected) {
          socket.emit('leave', { 
            room: activeChat,
            user: {
              id: session.user.id,
              name: session.user.name,
              image: session.user.image,
              login: session.user.login
            }
          })
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

          // 加载用户配置
          const config = await getConfig(session.accessToken, session.user.login)
          console.log('Loaded config:', config)
          
          if (config) {
            // 设置主题
            if (config.settings?.theme) {
              setTheme(config.settings.theme)
            }

            // 加载联系人列表
            if (config.contacts?.length > 0) {
              const formattedContacts = config.contacts.map(contact => ({
                id: contact.id,
                name: contact.name,
                type: contact.type || 'room',
                unread: contact.unread || 0,
                created_at: contact.created_at || new Date().toISOString(),
                updated_at: contact.updated_at || new Date().toISOString(),
                lastMessage: contact.lastMessage || null,
                description: contact.description || '',
                isPrivate: contact.isPrivate || false
              }))
              
              // 先设置联系人列表
              setContacts(formattedContacts)
              
              // 再设置用户配置
              setUserConfig({
                ...config,
                contacts: formattedContacts
              })
              
              // 最后设置活动聊天室
              if (config.settings?.activeChat) {
                const chatExists = formattedContacts.some(contact => contact.id === config.settings.activeChat)
              if (chatExists) {
                  setActiveChat(config.settings.activeChat)
              }
            }
            } else {
              setUserConfig(config)
            }
          }

            // 加载消息
          if (activeChat) {
            const messages = await loadChatHistory(session.accessToken, session.user.login, activeChat)
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
    if (!session?.user?.login || !session.accessToken || !activeChat) return;

    try {
      setIsLoading(true);
      setMessages([]); // 立即清空消息，避免显示上一个聊天室的消息

      // 尝试从缓存加载消息
      const cachedMessages = getChatMessagesCache(session.user.login, activeChat);
      if (cachedMessages) {
        console.log('Using cached messages for', activeChat);
        const formattedCachedMessages = cachedMessages.map(msg => ({
          ...msg,
          isOwnMessage: msg.user?.id === session.user.id
        }));
        setMessages(formattedCachedMessages);
        setIsLoading(false);
        return;
      }

      console.log('Loading messages for chat:', activeChat);
      const messages = await loadChatHistory(session.accessToken, session.user.login, activeChat);
      
      if (Array.isArray(messages)) {
        const formattedMessages = messages.map(msg => ({
          id: msg.id || `msg-${msg.createdAt}-${msg.user?.id}`,
          content: msg.content || '',
          user: {
            name: msg.user?.name || 'Unknown User',
            image: msg.user?.image || '/default-avatar.png',
            id: msg.user?.id || 'unknown',
            login: msg.user?.login
          },
          createdAt: msg.createdAt || new Date().toISOString(),
          type: msg.type || 'message',
          isOwnMessage: msg.user?.id === session.user.id
        }));

        // 按时间排序
        const sortedMessages = formattedMessages.sort(
          (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
        );

        setMessages(sortedMessages);
        updateChatMessagesCache(session.user.login, activeChat, sortedMessages);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      showToast('加载消息失败', 'error');
      setMessages([]);
    } finally {
      setIsLoading(false);
    }
  };

  // 显示消息提示的函数
  const showToast = (message, type = 'info') => {
    setToast({ message, type })
  }

  // 手动保存消息
  const handleSaveMessages = async () => {
    if (!session?.user?.login || !session.accessToken || !activeChat || messages.length === 0) return

    try {
      setIsSaving(true)
      await saveChatHistory(session.accessToken, session.user.login, activeChat, messages)
      showToast('消息保存成功', 'success')
    } catch (error) {
      console.error('Error saving messages:', error)
      showToast('保存消息失败，请重试', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  // 修改发送消息的逻辑
  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !session || isSending) return;

    try {
      setIsSending(true);
      const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const message = {
        id: messageId,
        content: newMessage.trim(),
      user: {
        name: session.user.name,
        image: session.user.image,
          id: session.user.id,
          login: session.user.login
      },
        room: activeChat,
      createdAt: new Date().toISOString(),
        type: 'message'
      };

      // 先更新本地消息状态
      setMessages(prev => [...prev, {
        ...message,
        isOwnMessage: true
      }]);
      setNewMessage('');

      // 发送消息到 Socket.IO
      if (socket?.connected) {
        socket.emit('message', message);
      }

      // 保存消息到仓库
      try {
        const updatedMessages = [...messages, message];
        await saveChatHistory(session.accessToken, session.user.login, activeChat, updatedMessages);

        // 更新联系人列表中的最后一条消息
          const updatedContacts = contacts.map(contact => {
            if (contact.id === activeChat) {
              return {
                ...contact,
              lastMessage: message.content,
                updated_at: new Date().toISOString()
            };
          }
          return contact;
        });
        setContacts(updatedContacts);

          // 更新用户配置
          if (userConfig) {
            const updatedConfig = {
              ...userConfig,
              contacts: updatedContacts,
              last_updated: new Date().toISOString()
          };
          await updateConfig(session.accessToken, session.user.login, updatedConfig);
          setUserConfig(updatedConfig);
          }
        } catch (error) {
        console.error('Error saving message:', error);
        showToast('消息已发送但保存失败', 'warning');
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      showToast('发送消息失败', 'error');
      setNewMessage(newMessage); // 恢复消息内容
    } finally {
      setIsSending(false);
    }
  };

  // 修改聊天室切换的逻辑
  const handleChatChange = async (chatId) => {
    if (chatId === activeChat) return
    
    setActiveChat(chatId)
    setMessages([]) // 清空当前消息
    setIsLoading(true)

    try {
      // 加载新聊天室的消息
      const messages = await loadChatHistory(session.accessToken, session.user.login, chatId)
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
      }

      // 更新用户配置
      if (userConfig) {
        const updatedConfig = {
          ...userConfig,
          settings: {
            ...userConfig.settings,
            activeChat: chatId
          },
          last_updated: new Date().toISOString()
        }
        await updateConfig(session.accessToken, session.user.login, updatedConfig)
        setUserConfig(updatedConfig)
      }

      // 更新路由
      if (typeof window !== 'undefined') {
        router.push(`/${session.user.login}/${chatId}`)
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

  // 修改加入聊天室的逻辑
  const handleJoin = async (e) => {
    e.preventDefault();
    if (!joinInput.trim() || !session?.user?.login || !session.accessToken) {
      showToast('请先登录或输入聊天室ID', 'error');
      return;
    }

    try {
      setIsLoading(true);
      const roomId = joinInput.trim();
      
      // 检查聊天室是否已存在于自己的联系人列表中
      const existingRoom = contacts.find(contact => contact.id === roomId);
      if (existingRoom) {
        setActiveChat(roomId);
        setCurrentView('chat');
        setShowJoinModal(false);
        setJoinInput('');
        showToast('已切换到该聊天室', 'info');
        return;
      }

      // 获取聊天室信息和管理员信息
      try {
        const response = await fetch(
          `https://api.github.com/repos/${roomId.split('-')[0]}/dock-chat-data/contents/chats/${roomId}/info.json`,
          {
            headers: {
              'Authorization': `Bearer ${session.accessToken}`,
              'Accept': 'application/vnd.github.v3+json'
            }
          }
        );

        if (!response.ok) {
          showToast('聊天室不存在或无法访问', 'error');
          return;
        }

        const data = await response.json();
        const roomInfo = JSON.parse(atob(data.content));
        const adminLogin = roomInfo.admin;

        // 创建加入申请
        const joinRequest = {
          id: `jr-${Date.now()}`,
          type: 'join_request',
          room: roomId,
          user: {
            id: session.user.id,
            login: session.user.login,
            name: session.user.name,
            image: session.user.image
          },
          status: 'pending',
          created_at: new Date().toISOString()
        };

        // 保存申请到管理员的仓库
        const encodedRequest = btoa(JSON.stringify(joinRequest, null, 2));
        await fetch(
          `https://api.github.com/repos/${adminLogin}/dock-chat-data/contents/join_requests/${roomId}/${joinRequest.id}.json`,
          {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${session.accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              message: `Join request from ${session.user.login}`,
              content: encodedRequest
            })
          }
        );

        // 发送系统通知给管理员
        const systemMessage = {
          id: `sys-${Date.now()}`,
          content: `用户 ${session.user.name} (${session.user.login}) 请求加入聊天室 ${roomId}`,
          type: 'join_request',
          user: {
            name: 'System',
            image: '/system-avatar.png',
            id: 'system'
          },
          request: joinRequest,
          createdAt: new Date().toISOString()
        };

        // 加载管理员的系统消息
        const adminMessages = await loadChatHistory(session.accessToken, adminLogin, 'system');
        const updatedMessages = [...(adminMessages || []), systemMessage];
        
        // 保存系统消息到管理员的仓库
        await saveChatHistory(session.accessToken, adminLogin, 'system', updatedMessages);

        showToast('已发送加入申请，请等待管理员审核', 'success');
        setShowJoinModal(false);
        setJoinInput('');
      } catch (error) {
        console.error('Error sending join request:', error);
        showToast('发送加入申请失败，请重试', 'error');
      }
    } catch (error) {
      console.error('Error joining room:', error);
      showToast('加入聊天室失败，请重试', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // 添加处理加入申请的函数
  const handleJoinRequest = async (request, action) => {
    if (!session?.user?.login || !session.accessToken) {
      showToast('请先登录', 'error');
      return;
    }

    try {
      setIsLoading(true);
      const { room, user } = request;

      if (action === 'accept') {
        // 更新申请状态
        request.status = 'accepted';
        const encodedRequest = btoa(JSON.stringify(request, null, 2));
        await fetch(
          `https://api.github.com/repos/${session.user.login}/dock-chat-data/contents/join_requests/${room}/${request.id}.json`,
          {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${session.accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              message: `Accept join request from ${user.login}`,
              content: encodedRequest
            })
          }
        );

        // 更新聊天室成员列表
        const roomInfoResponse = await fetch(
          `https://api.github.com/repos/${session.user.login}/dock-chat-data/contents/chats/${room}/info.json`,
          {
            headers: {
              'Authorization': `Bearer ${session.accessToken}`,
              'Accept': 'application/vnd.github.v3+json'
            }
          }
        );

        if (roomInfoResponse.ok) {
          const data = await roomInfoResponse.json();
          const roomInfo = JSON.parse(atob(data.content));
          roomInfo.members = [...(roomInfo.members || []), user];
          
          const encodedInfo = btoa(JSON.stringify(roomInfo, null, 2));
          await fetch(
            `https://api.github.com/repos/${session.user.login}/dock-chat-data/contents/chats/${room}/info.json`,
            {
              method: 'PUT',
              headers: {
                'Authorization': `Bearer ${session.accessToken}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                message: `Update room members: add ${user.login}`,
                content: encodedInfo,
                sha: data.sha
              })
            }
          );
        }

        // 发送系统通知给申请者
        const systemMessage = {
          id: `sys-${Date.now()}`,
          content: `您的加入申请已被管理员通过，已加入聊天室 ${room}`,
          type: 'join_request_accepted',
          user: {
            name: 'System',
            image: '/system-avatar.png',
            id: 'system'
          },
          room: room,
          createdAt: new Date().toISOString()
        };

        const userMessages = await loadChatHistory(session.accessToken, user.login, 'system');
        const updatedMessages = [...(userMessages || []), systemMessage];
        await saveChatHistory(session.accessToken, user.login, 'system', updatedMessages);

        showToast('已同意加入申请', 'success');
      } else {
        // 拒绝申请
        request.status = 'rejected';
        const encodedRequest = btoa(JSON.stringify(request, null, 2));
        await fetch(
          `https://api.github.com/repos/${session.user.login}/dock-chat-data/contents/join_requests/${room}/${request.id}.json`,
          {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${session.accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              message: `Reject join request from ${user.login}`,
              content: encodedRequest
            })
          }
        );

        // 发送系统通知给申请者
        const systemMessage = {
          id: `sys-${Date.now()}`,
          content: `您的加入聊天室 ${room} 的申请已被管理员拒绝`,
          type: 'join_request_rejected',
          user: {
            name: 'System',
            image: '/system-avatar.png',
            id: 'system'
          },
          room: room,
          createdAt: new Date().toISOString()
        };

        const userMessages = await loadChatHistory(session.accessToken, user.login, 'system');
        const updatedMessages = [...(userMessages || []), systemMessage];
        await saveChatHistory(session.accessToken, user.login, 'system', updatedMessages);

        showToast('已拒绝加入申请', 'success');
      }
    } catch (error) {
      console.error('Error handling join request:', error);
      showToast('处理加入申请失败，请重试', 'error');
    } finally {
      setIsLoading(false);
    }
  };

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

  // 修改配置加载逻辑
  useEffect(() => {
    const loadUserConfig = async () => {
      if (!session?.user?.login || !session.accessToken) return;
      
      try {
        // 从 GitHub 加载配置
        const config = await getConfig(session.accessToken, session.user.login);
        if (config) {
          // 更新本地状态和缓存
          setUserConfig(config);
          updateUserConfigCache(session.user.login, config);
          
          if (config.settings?.theme) {
            setTheme(config.settings.theme);
          }
          
          if (config.contacts?.length > 0) {
            const formattedContacts = config.contacts.map(contact => ({
              id: contact.id,
              name: contact.name,
              type: contact.type || 'room',
              unread: contact.unread || 0,
              created_at: contact.created_at || new Date().toISOString(),
              updated_at: contact.updated_at || new Date().toISOString(),
              lastMessage: contact.lastMessage || null,
              description: contact.description || '',
              isPrivate: contact.isPrivate || false
            }));
            
            setContacts(formattedContacts);
            updateChatRoomsCache(session.user.login, formattedContacts);
            
            if (config.settings?.activeChat) {
              const chatExists = formattedContacts.some(
                contact => contact.id === config.settings.activeChat
              );
              if (chatExists) {
                setActiveChat(config.settings.activeChat);
              }
            }
          }
        }
      } catch (error) {
        console.error('Error loading user config:', error);
        showToast('加载配置失败', 'error');
      }
    };

    loadUserConfig();
  }, [session]);

  // 修改保存配置函数
  const saveConfig = async (updatedConfig) => {
    if (!session?.user?.login || !session.accessToken) {
      showToast('请先登录', 'error');
      return;
    }

    try {
      await updateConfig(session.accessToken, session.user.login, updatedConfig);
      setUserConfig(updatedConfig);
      updateUserConfigCache(session.user.login, updatedConfig);
      showToast('设置已保存', 'success');
    } catch (error) {
      console.error('Error saving config:', error);
      showToast('保存设置失败', 'error');
    }
  };

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
          if (config?.settings?.theme) {
            setTheme(config.settings.theme)
          }
        } catch (error) {
          console.error('Error loading user settings:', error)
        }
      }
    }

    loadUserSettings()
  }, [session])

  // 修改页面标题的逻辑
  const pageTitle = {
    chat: contacts.find(c => c.id === activeChat)?.name || '聊天室',
    profile: '个人主页',
    friends: '好友列表',
    settings: '设置'
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
      case 'settings':
        return `${session.user.login}/settings`
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
    if (!session?.user?.login || !session.accessToken || !roomId) return

    try {
      // 检查聊天室是否已存在于联系人列表中
      const existingRoom = contacts.find(c => c.id === roomId)
      if (existingRoom) {
        setActiveChat(roomId)
        setShowJoinModal(false)
        return
      }

      // 创建新的聊天室对象
      const newRoom = {
        id: roomId,
        name: `聊天室 ${roomId}`,
        type: 'room',
        joined_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        message_count: 0,
        unread: 0
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
          last_updated: new Date().toISOString()
        }
        await updateConfig(session.accessToken, session.user.login, updatedConfig)
        setUserConfig(updatedConfig)
      }

      // 切换到新加入的聊天室
      setActiveChat(roomId)
      setShowJoinModal(false)

      // 加载聊天记录
      await loadChatMessages()
    } catch (error) {
      console.error('Error joining room:', error)
      alert('加入聊天室失败，请重试')
    }
  }

  // 监听聊天室切换
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
        await saveChatHistory(session.accessToken, session.user.login, activeChat, messages)
        updateChatMessagesCache(session.user.login, activeChat, messages)
      } catch (error) {
        console.error('Error saving messages:', error)
      }
    }, 1000) // 1秒延迟保存

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
        description: roomData.description,
        type: roomData.type || 'room',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        creator: session.user.login,
        isPrivate: roomData.isPrivate,
        lastMessage: null,
        unread: 0
      }

      // 更新联系人列表
      const updatedContacts = [...contacts, newRoom]
      setContacts(updatedContacts)
      
      // 立即切换到新创建的聊天室
      setActiveChat(roomId)
      setShowCreateRoomModal(false)

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

      // 更新路由
      if (typeof window !== 'undefined') {
        router.push(`/${session.user.login}/${roomId}`)
      }
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
    if (!session?.user?.login || !session.accessToken) {
      showToast('请先登录', 'error');
      return;
    }

    try {
      setIsSending(true);
      // 创建好友请求对象
      const requestId = `fr-${Date.now()}`;
      const requestData = {
        id: requestId,
        from: {
          id: session.user.id,
          login: session.user.login,
          name: session.user.name,
          image: session.user.image
        },
        to: friendId,
        note: note,
        status: 'pending',
        created_at: new Date().toISOString()
      };

      // 确保目标用户的仓库存在
      const targetRepoResponse = await fetch(
        `https://api.github.com/repos/${friendId}/dock-chat-data`,
        {
          headers: {
            'Authorization': `Bearer ${session.accessToken}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      );

      if (!targetRepoResponse.ok) {
        showToast('对方未初始化聊天数据，无法发送好友请求', 'error');
        return;
      }

      // 确保 friend_requests 目录存在
      try {
        await fetch(
          `https://api.github.com/repos/${friendId}/dock-chat-data/contents/friend_requests/.gitkeep`,
          {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              message: 'Ensure friend_requests directory exists',
              content: 'MQ==', // Base64 encoded "1"
            })
          }
        );
      } catch (error) {
        console.log('Directory might already exist');
      }

      // 保存好友请求
      const encodedContent = btoa(unescape(encodeURIComponent(JSON.stringify(requestData, null, 2))));
      const response = await fetch(
        `https://api.github.com/repos/${friendId}/dock-chat-data/contents/friend_requests/${requestId}.json`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${session.accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: `Friend request from ${session.user.login}`,
          content: encodedContent
        })
        }
      );

      if (!response.ok) {
        throw new Error('Failed to send friend request');
      }

      // 发送系统通知
      const notificationMessage = {
        content: `${session.user.name} (${session.user.login}) 向您发送了好友请求`,
        type: 'friend_request',
        user: {
          name: 'System',
          image: '/system-avatar.png',
          id: 'system'
        },
        createdAt: new Date().toISOString(),
        requestId: requestId
      };

      // 加载目标用户的系统消息
      const existingMessages = await loadChatHistory(session.accessToken, friendId, 'system');
      const updatedMessages = [...existingMessages, notificationMessage];
      
      // 保存更新后的系统消息
      await saveChatHistory(session.accessToken, friendId, 'system', updatedMessages);

      showToast('好友请求已发送', 'success');
      setShowAddFriendModal(false);
    } catch (error) {
      console.error('Error sending friend request:', error);
      showToast('发送好友请求失败，请重试', 'error');
    } finally {
      setIsSending(false);
    }
  };

  // 加载好友请求
  const loadFriendRequests = async () => {
    if (!session?.user?.login || !session.accessToken) return;

    try {
      const response = await fetch(
        `https://api.github.com/repos/${session.user.login}/dock-chat-data/contents/friend_requests`,
        {
          headers: {
            'Authorization': `Bearer ${session.accessToken}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      );

      if (!response.ok) {
        if (response.status !== 404) {
          console.error('Error loading friend requests:', await response.text());
        }
        return;
      }

      const files = await response.json();
      const requests = await Promise.all(
        files
          .filter(file => file.name.endsWith('.json'))
          .map(async file => {
            try {
              const content = await fetch(file.download_url).then(res => res.json());
              return content.status === 'pending' ? content : null;
            } catch (error) {
              console.error('Error loading friend request:', error);
              return null;
            }
          })
      );

      const validRequests = requests.filter(Boolean);
      setFriendRequests(validRequests);

      // 更新未读好友请求数
      const unreadCount = validRequests.length;
      if (unreadCount > 0) {
        showToast(`您有 ${unreadCount} 个新的好友请求`, 'info');
      }
    } catch (error) {
      console.error('Error loading friend requests:', error);
    }
  };

  // 定期检查好友请求
  useEffect(() => {
    if (session?.user?.login && session.accessToken) {
      loadFriendRequests();
      const interval = setInterval(loadFriendRequests, 30000); // 每30秒检查一次
      return () => clearInterval(interval);
    }
  }, [session]);

  // 修改检查仓库函数
  const checkRepositoryExists = useCallback(async () => {
    if (!session?.user?.login || !session.accessToken) return false;
    
    try {
      const response = await fetch(`https://api.github.com/repos/${session.user.login}/dock-chat-data`, {
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      
      if (response.status === 404) {
        return false;
      }
      
      if (response.status === 200) {
        // 检查是否有必要的目录结构
        const contentResponse = await fetch(
          `https://api.github.com/repos/${session.user.login}/dock-chat-data/contents/`,
          {
            headers: {
              'Authorization': `Bearer ${session.accessToken}`,
              'Accept': 'application/vnd.github.v3+json'
            }
          }
        );
        
        if (contentResponse.ok) {
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error('Error checking repository:', error);
      return false;
    }
  }, [session]);

  // 修改创建仓库函数
  const createRepository = useCallback(async () => {
    if (!session?.user?.login || !session.accessToken) {
      alert('请先登录');
      return;
    }
    
    try {
      // 显示加载提示
      const loadingMessage = document.createElement('div');
      loadingMessage.innerHTML = `
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div class="bg-white dark:bg-gray-800 rounded-lg p-6 flex items-center space-x-4">
            <div class="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
            <p class="text-gray-900 dark:text-white">正在创建私有存储库...</p>
          </div>
        </div>
      `;
      document.body.appendChild(loadingMessage);

      // 先检查仓库是否已存在
      const exists = await checkRepositoryExists();
      if (exists) {
        document.body.removeChild(loadingMessage);
        alert('私有存储库已存在');
        return;
      }

      // 创建私有仓库
      const response = await fetch('https://api.github.com/user/repos', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.github.v3+json'
        },
        body: JSON.stringify({
          name: 'dock-chat-data',
          private: true,
          auto_init: true,
          description: 'Private repository for Dock Chat data storage'
        })
      });

      if (!response.ok) {
        document.body.removeChild(loadingMessage);
        const data = await response.json();
        
        if (response.status === 422) {
          alert('仓库名称已被使用，请先删除同名仓库后重试');
        } else if (response.status === 403) {
          alert('没有足够的权限创建仓库，请确保已授权正确的权限');
        } else if (response.status === 401) {
          alert('授权已过期，请重新登录');
          signOut({ callbackUrl: '/' });
        } else {
          throw new Error(data.message || '创建仓库失败');
        }
        return;
      }

      // 等待仓库初始化完成
      let retries = 0;
      const maxRetries = 10; // 增加重试次数
      while (retries < maxRetries) {
        const initCheck = await fetch(`https://api.github.com/repos/${session.user.login}/dock-chat-data`, {
          headers: {
            'Authorization': `Bearer ${session.accessToken}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        });

        if (initCheck.ok) {
          // 创建必要的目录结构
          const directories = ['chats', 'config', 'friend_requests'];
          for (const dir of directories) {
            await fetch(`https://api.github.com/repos/${session.user.login}/dock-chat-data/contents/${dir}/.gitkeep`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
                message: `Create ${dir} directory`,
                content: 'MQ==', // Base64 encoded "1"
              })
            });
          }

          // 创建初始配置文件
          const initialConfig = {
            settings: {
              theme: 'system',
              activeChat: '',
            },
            contacts: [],
            last_updated: new Date().toISOString()
          };

          const encodedConfig = btoa(JSON.stringify(initialConfig, null, 2));
          await fetch(`https://api.github.com/repos/${session.user.login}/dock-chat-data/contents/config/user.json`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${session.accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              message: 'Create initial config',
              content: encodedConfig
            })
          });

          document.body.removeChild(loadingMessage);
          alert('私有存储库创建成功！');
          window.location.reload();
          return;
        }

        await new Promise(resolve => setTimeout(resolve, 2000)); // 增加等待时间
        retries++;
      }

      document.body.removeChild(loadingMessage);
      throw new Error('仓库初始化超时，请刷新页面重试');
    } catch (error) {
      console.error('Error creating repository:', error);
      alert(error.message || '创建仓库失败，请重试');
    }
  }, [session, checkRepositoryExists]);

  // 使用 useCallback 优化 getConfig 函数
  const getConfigCallback = useCallback(async () => {
    if (!session?.user?.login || !session.accessToken) return null;
    
    try {
      return await getConfig(session.accessToken, session.user.login);
    } catch (error) {
      console.error('Error loading config:', error);
      return null;
    }
  }, [session]);

  // 修改登录检查逻辑
  useEffect(() => {
    const checkLoginAndRepository = async () => {
      if (!session?.user?.login || !session.accessToken || status === 'loading') {
        return;
      }
      
      try {
        setIsLoading(true);
        const exists = await checkRepositoryExists();
        
        if (!exists) {
          const shouldCreate = window.confirm(
            '检测到您还没有创建私有存储库。需要创建私有存储库来保存聊天记录和设置。是否立即创建？'
          );
          if (shouldCreate) {
            await createRepository();
          }
          setIsLoading(false);
          return;
        }
        
        // 加载用户配置
        const config = await getConfigCallback();
        if (!config) {
          console.error('Failed to load user config');
          setIsLoading(false);
          return;
        }
        
        setUserConfig(config);
        
        if (config.settings?.theme) {
          setTheme(config.settings.theme);
        }
        
        if (config.contacts?.length > 0) {
          const formattedContacts = config.contacts.map(contact => ({
            id: contact.id,
            name: contact.name,
            type: contact.type || 'room',
            unread: contact.unread || 0,
            created_at: contact.created_at || new Date().toISOString(),
            updated_at: contact.updated_at || new Date().toISOString(),
            lastMessage: contact.lastMessage || null,
            description: contact.description || '',
            isPrivate: contact.isPrivate || false
          }));
          
          setContacts(formattedContacts);
          
          if (config.settings?.activeChat) {
            const chatExists = formattedContacts.some(
              contact => contact.id === config.settings.activeChat
            );
            if (chatExists) {
              setActiveChat(config.settings.activeChat);
            }
          }
        }
      } catch (error) {
        console.error('Error checking repository status:', error);
        const shouldRetry = window.confirm(
          '检查存储库状态时出错。是否尝试创建新的私有存储库？'
        );
        if (shouldRetry) {
          await createRepository();
        }
      } finally {
        setIsLoading(false);
      }
    };

    checkLoginAndRepository();
  }, [session, status, createRepository, checkRepositoryExists, getConfigCallback]);

  // 修改删除聊天室的处理函数
  const handleDeleteChatRoom = async (roomId) => {
    if (!session?.user?.login || !session.accessToken) {
      showToast('请先登录', 'error');
      return;
    }
    
    if (roomId === 'public' || roomId === 'kimi-ai' || roomId === 'system') {
      showToast('系统聊天室不能删除', 'error');
      return;
    }

    try {
      setIsLoading(true);
      
      // 从联系人列表中移除
      const updatedContacts = contacts.filter(c => c.id !== roomId);
      setContacts(updatedContacts);
      
      // 如果当前正在查看被删除的聊天室，切换到公共聊天室
      if (activeChat === roomId) {
        setActiveChat('public');
        setCurrentView('chat');
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
        };

        // 保存到 GitHub
        await updateConfig(session.accessToken, session.user.login, updatedConfig);
        setUserConfig(updatedConfig);
      }

      showToast('聊天室已删除', 'success');
      setShowChatSettings(false);
    } catch (error) {
      console.error('Error deleting chat room:', error);
      showToast('删除聊天室失败，请重试', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // 获取文件的 SHA 值
  const getFileSha = async (token, username, path) => {
      try {
        const response = await fetch(
        `https://api.github.com/repos/${username}/dock-chat-data/contents/${path}`,
          {
            headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json'
            }
          }
      );
        if (response.ok) {
        const data = await response.json();
        return data.sha;
      }
      return null;
    } catch (error) {
      console.error('Error getting file SHA:', error);
      return null;
    }
  };

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

  // 添加离开聊天室的处理函数
  const handleLeaveRoom = async (roomId) => {
    if (!session?.user?.login || !session.accessToken) return;

    try {
      // 从联系人列表中移除
      const updatedContacts = contacts.filter(c => c.id !== roomId);
      setContacts(updatedContacts);
      
      // 如果当前正在查看被删除的聊天室，切换到公共聊天室
      if (activeChat === roomId) {
        setActiveChat('public');
      }

      // 离开 Socket.IO 房间
      if (socket?.connected) {
        socket.emit('leave', { 
          room: roomId,
          user: {
            id: session.user.id,
            name: session.user.name,
            image: session.user.image,
            login: session.user.login
          }
        });
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
        };
        await updateConfig(session.accessToken, session.user.login, updatedConfig);
        setUserConfig(updatedConfig);
        
        // 更新缓存
        updateUserConfigCache(session.user.login, updatedConfig);
        updateChatRoomsCache(session.user.login, updatedContacts);
      }

      showToast('已离开聊天室', 'success');
      setShowChatSettings(false);
    } catch (error) {
      console.error('Error leaving room:', error);
      showToast('离开聊天室失败', 'error');
    }
  };

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
              <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
            </svg>
            使用 GitHub 登录
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-white dark:bg-gray-900">
      {/* 侧边栏 - 始终显示聊天室列表 */}
      <div className="w-64 flex flex-col border-r border-gray-200 dark:border-gray-700">
        {/* 用户信息 */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          {session?.user ? (
            <div className="flex items-center space-x-3">
              <Image
                src={session.user.image || '/default-avatar.png'}
                alt={session.user.name}
                width={40}
                height={40}
                className="rounded-full"
              />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {session.user.name}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                @{session.user.login}
              </p>
            </div>
          </div>
          ) : (
            <button
              onClick={() => signIn('github')}
              className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              登录 GitHub
            </button>
          )}
        </div>

        {/* 导航按钮 */}
        <div className="flex p-2 space-x-2 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setCurrentView('chat')}
            className={`flex-1 p-2 rounded-md ${
              currentView === 'chat'
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300'
                : 'hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <UserGroupIcon className="h-5 w-5 mx-auto" />
          </button>
          <button
            onClick={() => setCurrentView('friends')}
            className={`flex-1 p-2 rounded-md ${
              currentView === 'friends'
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300'
                : 'hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <UserCircleIcon className="h-5 w-5 mx-auto" />
          </button>
          <button
            onClick={() => setCurrentView('settings')}
            className={`flex-1 p-2 rounded-md ${
              currentView === 'settings'
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300'
                : 'hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <Cog6ToothIcon className="h-5 w-5 mx-auto" />
          </button>
        </div>

        {/* 聊天室列表 - 始终显示 */}
        <div className="flex-1 overflow-y-auto">
          <div className="space-y-1 p-2">
            {contacts.map((contact) => (
            <button
              key={contact.id}
                onClick={() => {
                  handleChatChange(contact.id)
                  setCurrentView('chat')
                }}
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

      {/* 主内容区域 */}
      <div className="flex-1 flex flex-col">
        {currentView === 'chat' ? (
          activeChat ? (
            <>
              {/* 聊天界面 */}
              <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center">
                  <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                    {contacts.find((c) => c.id === activeChat)?.name || '聊天室'}
                  </h2>
                </div>
                <div className="flex items-center space-x-2">
                <button
                    onClick={() => setShowChatSettings(true)}
                    className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                    <Cog6ToothIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                </button>
          </div>
                    </div>

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
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                          }`}
                        >
                          {message.content}
                        </div>
                      </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <form onSubmit={sendMessage} className="flex space-x-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="输入消息..."
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim() || isSending}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    {isSending ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <PaperAirplaneIcon className="h-5 w-5" />
                    )}
                  </button>
              </form>
            </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">选择或创建聊天室</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  从左侧选择一个聊天室，或者创建新的聊天室开始聊天
                </p>
                <div className="mt-4 flex justify-center space-x-3">
                  <button
                    onClick={() => setShowCreateRoomModal(true)}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
                  >
                    创建聊天室
                  </button>
                  <button
                    onClick={() => setShowJoinModal(true)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:text-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-lg"
                  >
                    加入聊天室
                  </button>
                </div>
              </div>
            </div>
          )
        ) : currentView === 'friends' ? (
          <div className="flex-1 overflow-hidden">
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
          </div>
        ) : currentView === 'settings' ? (
          <div className="flex-1 overflow-hidden">
            <SettingsPage
              config={userConfig}
              onSave={saveConfig}
              onDeleteRepo={async () => {
                try {
                  if (session?.accessToken && session.user?.login) {
                    await fetch(`https://api.github.com/repos/${session.user.login}/dock-chat-data`, {
                      method: 'DELETE',
                      headers: {
                        'Authorization': `Bearer ${session.accessToken}`,
                        'Content-Type': 'application/json',
                      }
                    })
                    clearUserCache(session.user.login)
                    window.location.reload()
                  }
                } catch (error) {
                  console.error('Error deleting repository:', error)
                  alert('删除仓库失败，请重试')
                }
              }}
              onCreateRepo={createRepository}
            />
          </div>
        ) : null}
      </div>

      {/* 模态框 */}
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
          friends={friends}
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
      {showChatSettings && (
        <ChatRoomSettings
          isOpen={showChatSettings}
          onClose={() => setShowChatSettings(false)}
          roomId={activeChat}
          onDelete={handleDeleteChatRoom}
          members={contacts.find(c => c.id === activeChat)?.members || []}
        />
      )}

      {/* Toast 组件 */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}

