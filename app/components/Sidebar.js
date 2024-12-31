'use client'

import { memo } from 'react'
import { 
  UserGroupIcon,
  UserCircleIcon,
  Cog6ToothIcon,
  PlusCircleIcon,
  SparklesIcon,
  UserPlusIcon,
  BellIcon
} from '@heroicons/react/24/solid'
import Image from 'next/image'

const Sidebar = memo(({ 
  session,
  currentView,
  contacts = [],
  activeChat,
  onRoomChange,
  onViewChange,
  onCreateRoom,
  onAddFriend,
  onShowSettings,
  onAddAI,
  onShowRequests,
  friendRequestsCount = 0
}) => {
  // 对联系人进行分组
  const groupedContacts = contacts.reduce((acc, contact) => {
    const type = contact.type || 'room'
    if (!acc[type]) acc[type] = []
    acc[type].push(contact)
    return acc
  }, {})

  return (
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
          <button
            onClick={onShowRequests}
            className="relative p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <BellIcon className="w-5 h-5" />
            {friendRequestsCount > 0 && (
              <span className="absolute top-0 right-0 -mt-1 -mr-1 bg-red-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center">
                {friendRequestsCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* 导航按钮 */}
      <div className="p-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex space-x-2">
          <button
            onClick={() => onViewChange('chat')}
            className={`flex-1 flex items-center justify-center gap-2 p-2 text-sm font-medium rounded-lg transition-colors ${
              currentView === 'chat'
                ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <UserGroupIcon className="w-5 h-5" />
            聊天
          </button>
          <button
            onClick={() => onViewChange('friends')}
            className={`flex-1 flex items-center justify-center gap-2 p-2 text-sm font-medium rounded-lg transition-colors ${
              currentView === 'friends'
                ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <UserPlusIcon className="w-5 h-5" />
            好友
          </button>
          <button
            onClick={() => onViewChange('profile')}
            className={`flex-1 flex items-center justify-center gap-2 p-2 text-sm font-medium rounded-lg transition-colors ${
              currentView === 'profile'
                ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <UserCircleIcon className="w-5 h-5" />
            我的
          </button>
        </div>
      </div>

      {/* 聊天室列表 - 仅在聊天视图显示 */}
      {currentView === 'chat' && (
        <div className="flex-1 overflow-y-auto">
          {/* 公共聊天室 */}
          {groupedContacts.room && groupedContacts.room.length > 0 && (
            <div className="p-3">
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                聊天室
              </h3>
              <div className="space-y-1">
                {groupedContacts.room.map(contact => (
                  <button
                    key={contact.id}
                    onClick={() => onRoomChange(contact.id)}
                    className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors ${
                      activeChat === contact.id
                        ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200'
                    }`}
                  >
                    <UserGroupIcon className="w-5 h-5 flex-shrink-0" />
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
            </div>
          )}

          {/* AI 助手 */}
          {groupedContacts.ai && groupedContacts.ai.length > 0 && (
            <div className="p-3 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                AI 助手
              </h3>
              <div className="space-y-1">
                {groupedContacts.ai.map(contact => (
                  <button
                    key={contact.id}
                    onClick={() => onRoomChange(contact.id)}
                    className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors ${
                      activeChat === contact.id
                        ? 'bg-purple-50 text-purple-600 dark:bg-purple-900/50 dark:text-purple-400'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200'
                    }`}
                  >
                    <SparklesIcon className="w-5 h-5 flex-shrink-0" />
                    <span className="flex-1 text-left text-sm font-medium truncate">
                      {contact.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 底部按钮区域 */}
      <div className="p-3 border-t border-gray-200 dark:border-gray-700 space-y-2">
        {currentView === 'chat' && (
          <>
            <button
              onClick={onCreateRoom}
              className="w-full flex items-center justify-center gap-2 p-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/50 rounded-lg transition-colors"
            >
              <PlusCircleIcon className="w-5 h-5" />
              创建聊天室
            </button>
            <button
              onClick={onAddAI}
              className="w-full flex items-center justify-center gap-2 p-2 text-sm font-medium text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/50 rounded-lg transition-colors"
            >
              <SparklesIcon className="w-5 h-5" />
              添加 AI 助手
            </button>
          </>
        )}
        <button
          onClick={onShowSettings}
          className="w-full flex items-center justify-center gap-2 p-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <Cog6ToothIcon className="w-5 h-5" />
          设置
        </button>
      </div>
    </div>
  )
})

Sidebar.displayName = 'Sidebar'

export default Sidebar 