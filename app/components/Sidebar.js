'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useSession, signIn } from 'next-auth/react'
import {
  ChatBubbleLeftIcon,
  UserGroupIcon,
  Cog6ToothIcon,
  PlusCircleIcon
} from '@heroicons/react/24/outline'

export default function Sidebar({
  currentView,
  setCurrentView,
  contacts,
  activeChat,
  handleChatChange,
  setShowSettingsModal,
  setShowCreateRoomModal,
  setShowJoinModal
}) {
  const { data: session } = useSession()
  const [selectedChat, setSelectedChat] = useState(activeChat)

  // 同步外部状态
  useEffect(() => {
    if (activeChat !== selectedChat) {
      setSelectedChat(activeChat)
    }
  }, [activeChat])

  // 处理聊天室切换
  const handleChatSelect = (chatId) => {
    setSelectedChat(chatId)
    handleChatChange(chatId)
  }

  return (
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

      {/* 导航菜单 */}
      <div className="flex items-center p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex space-x-2 w-full">
          <button
            onClick={() => setCurrentView('chat')}
            className={`flex items-center justify-center px-3 py-2 text-sm font-medium rounded-md ${
              currentView === 'chat'
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300'
                : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
            }`}
          >
            <ChatBubbleLeftIcon className="h-5 w-5 mr-2" />
            聊天
          </button>
          <Link
            href="/friends"
            className="flex items-center justify-center px-3 py-2 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <UserGroupIcon className="h-5 w-5 mr-2" />
            好友
          </Link>
          <button
            onClick={() => setShowSettingsModal(true)}
            className="flex items-center justify-center px-3 py-2 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <Cog6ToothIcon className="h-5 w-5 mr-2" />
            设置
          </button>
        </div>
      </div>

      {/* 聊天列表 */}
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-1 p-2">
          {contacts.map((contact) => {
            const isActive = contact.id === selectedChat
            return (
              <button
                key={contact.id}
                onClick={() => handleChatSelect(contact.id)}
                className={`w-full flex items-center px-3 py-2 rounded-md transition-colors ${
                  isActive
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${
                    isActive
                      ? 'text-blue-600 dark:text-blue-300'
                      : 'text-gray-900 dark:text-white'
                  }`}>
                    {contact.name}
                  </p>
                  {contact.lastMessage && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {contact.lastMessage.content}
                    </p>
                  )}
                </div>
                {contact.unread > 0 && (
                  <span className="ml-2 px-2 py-0.5 text-xs bg-blue-500 text-white rounded-full">
                    {contact.unread}
                  </span>
                )}
              </button>
            )
          })}
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
  )
}