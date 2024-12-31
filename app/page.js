'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useTheme } from 'next-themes'
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
    if (!session?.user?.login || !session.accessToken) return

    try {
      // 加入聊天室的逻辑
        setShowJoinModal(false)
      setJoinInput('')
    } catch (error) {
      console.error('Error joining room:', error)
      alert('加入聊天室失败，请重试')
    }
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* 侧边栏 */}
      <div className="w-64 flex flex-col border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        {/* 顶部用户信息 */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {session?.user?.image && (
                <Image
                  src={session.user.image}
                  alt={session.user.name || ''}
                  width={32}
                  height={32}
                  className="rounded-full"
                />
              )}
              <span className="ml-2 text-sm font-medium text-gray-900 dark:text-white">
                {session?.user?.name}
              </span>
            </div>
            <button
              onClick={() => setShowSettingsModal(true)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <Cog6ToothIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* 聊天室列表 */}
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
            <button
              onClick={() => router.push('/friends')}
              className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 dark:text-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700"
            >
              <UserIcon className="h-5 w-5 mr-2" />
              好友列表
            </button>
          </div>
        </div>
      </div>

      {/* 主聊天区域 */}
      <div className="flex-1 flex flex-col">
        {/* 聊天头部 */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <h2 className="text-lg font-medium">
              {contacts.find((c) => c.id === activeChat)?.name || '聊天室'}
            </h2>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowChatSettings(true)}
              className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <Cog6ToothIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

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
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <form onSubmit={sendMessage} className="flex space-x-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="输入消息..."
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800"
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
      </div>

      {/* 模态框 */}
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
          onClose={() => setShowCreateRoomModal(false)}
          onCreate={handleCreateRoom}
        />
      )}

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
    </div>
  )
}

