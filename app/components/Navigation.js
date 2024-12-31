'use client'

import { useState } from 'react'
import Image from 'next/image'
import { 
  Cog6ToothIcon,
  PlusCircleIcon,
  UserGroupIcon,
  ChatBubbleLeftIcon,
  UserPlusIcon
} from '@heroicons/react/24/outline'

export default function Navigation({
  contacts,
  activeChat,
  activePrivateChat,
  onChatChange,
  onPrivateChatChange,
  onShowJoinModal,
  onShowCreateRoomModal,
  onShowSettings,
  onShowFriendManage
}) {
  const [searchTerm, setSearchTerm] = useState('')

  // 过滤联系人列表
  const filteredContacts = contacts.filter(contact => 
    contact.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // 分类联系人
  const rooms = filteredContacts.filter(contact => contact.type === 'room')
  const friends = filteredContacts.filter(contact => contact.type === 'friend')

  return (
    <nav className="w-64 bg-gray-50 dark:bg-gray-800 border-r dark:border-gray-700 flex flex-col">
      {/* 搜索框 */}
      <div className="p-4">
        <input
          type="text"
          placeholder="搜索..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
        />
      </div>

      {/* 操作按钮 */}
      <div className="flex justify-around p-2 border-b dark:border-gray-700">
        <button
          onClick={onShowCreateRoomModal}
          className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          title="创建聊天室"
        >
          <PlusCircleIcon className="w-6 h-6" />
        </button>
        <button
          onClick={onShowJoinModal}
          className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          title="加入聊天室"
        >
          <UserGroupIcon className="w-6 h-6" />
        </button>
        <button
          onClick={onShowFriendManage}
          className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          title="好友管理"
        >
          <UserPlusIcon className="w-6 h-6" />
        </button>
        <button
          onClick={onShowSettings}
          className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          title="设置"
        >
          <Cog6ToothIcon className="w-6 h-6" />
        </button>
      </div>

      {/* 联系人列表 */}
      <div className="flex-1 overflow-y-auto">
        {/* 好友列表 */}
        {friends.length > 0 && (
          <div className="mt-4">
            <h3 className="px-4 text-sm font-medium text-gray-500 uppercase tracking-wider">
              好友
            </h3>
            <ul className="mt-2 space-y-1">
              {friends.map(friend => (
                <li key={friend.id}>
                  <button
                    onClick={() => {
                      onPrivateChatChange(friend.id)
                      onChatChange(null)
                    }}
                    className={`w-full flex items-center px-4 py-2 text-sm ${
                      activePrivateChat === friend.id
                        ? 'bg-blue-500 text-white'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <div className="relative">
                      <Image
                        src={friend.avatar || '/default-avatar.png'}
                        alt={friend.name}
                        width={32}
                        height={32}
                        className="rounded-full"
                      />
                      <span className={`absolute bottom-0 right-0 w-2 h-2 rounded-full ${
                        friend.online ? 'bg-green-500' : 'bg-gray-500'
                      }`}></span>
                    </div>
                    <div className="ml-3 flex-1 truncate">
                      <p className="font-medium">{friend.name}</p>
                      {friend.lastMessage && (
                        <p className="text-xs text-gray-500 truncate">
                          {friend.lastMessage.content}
                        </p>
                      )}
                    </div>
                    {friend.unread > 0 && (
                      <span className="ml-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                        {friend.unread}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 聊天室列表 */}
        {rooms.length > 0 && (
          <div className="mt-4">
            <h3 className="px-4 text-sm font-medium text-gray-500 uppercase tracking-wider">
              聊天室
            </h3>
            <ul className="mt-2 space-y-1">
              {rooms.map(room => (
                <li key={room.id}>
                  <button
                    onClick={() => {
                      onChatChange(room.id)
                      onPrivateChatChange(null)
                    }}
                    className={`w-full flex items-center px-4 py-2 text-sm ${
                      activeChat === room.id
                        ? 'bg-blue-500 text-white'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <ChatBubbleLeftIcon className="w-5 h-5 mr-3" />
                    <div className="flex-1 truncate">
                      <p className="font-medium">{room.name}</p>
                      {room.lastMessage && (
                        <p className="text-xs text-gray-500 truncate">
                          {room.lastMessage.content}
                        </p>
                      )}
                    </div>
                    {room.unread > 0 && (
                      <span className="ml-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                        {room.unread}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </nav>
  )
}