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
import SettingsModal from './SettingsModal'
import CreateRoomModal from './CreateRoomModal'
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
import Navigation from './Navigation'
import JoinRoomModal from './JoinRoomModal'
import MessageList from './MessageList'
import ChatInput from './ChatInput'
import PrivateMessage from './PrivateMessage'
import FriendManageModal from './FriendManageModal'

interface Message {
  id: string
  content: string
  sender: string
  createdAt: string
  type: 'text' | 'image'
}

interface Contact {
  id: string
  name: string
  type: 'room' | 'friend'
  avatar?: string
  online?: boolean
  unread: number
  lastMessage?: Message
  created_at: string
  updated_at: string
  message_count?: number
}

interface UserConfig {
  settings?: {
    theme?: string
    activeChat?: string
  }
  contacts?: Contact[]
  last_updated?: string
  sha?: string
}

interface HomeProps {
  params: {
    username?: string
    roomId?: string
  }
}

export default function Home({ params }: HomeProps) {
  const { username, roomId } = params || {}
  const { data: session, status } = useSession()
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [socket, setSocket] = useState<WebSocket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [joinInput, setJoinInput] = useState('')
  const [activeChat, setActiveChat] = useState('')
  const [contacts, setContacts] = useState<Contact[]>([])
  const [privateMessages, setPrivateMessages] = useState<Record<string, Message[]>>({})
  const [activePrivateChat, setActivePrivateChat] = useState<string | null>(null)
  const [friendRequests, setFriendRequests] = useState<any[]>([])
  const [showFriendManageModal, setShowFriendManageModal] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [showKimiModal, setShowKimiModal] = useState(false)
  const [kimiApiKey, setKimiApiKey] = useState('')
  const [isWaitingForKimi, setIsWaitingForKimi] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [userConfig, setUserConfig] = useState<UserConfig | null>(null)
  const [isSending, setIsSending] = useState(false)
  const [showChatSettings, setShowChatSettings] = useState(false)
  const { theme, setTheme } = useTheme()
  const [showCreateRoomModal, setShowCreateRoomModal] = useState(false)
  const ws = useRef<WebSocket | null>(null)

  // ... rest of the code ...

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
        onShowFriendManage={() => setShowFriendManageModal(true)}
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

      {showFriendManageModal && (
        <FriendManageModal
          isOpen={showFriendManageModal}
          onClose={() => setShowFriendManageModal(false)}
          onAddFriend={handleAddFriend}
          onAcceptRequest={handleAcceptRequest}
          onRejectRequest={handleRejectRequest}
          friendRequests={friendRequests}
          config={userConfig?.settings}
        />
      )}
    </main>
  )
}