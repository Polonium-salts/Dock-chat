'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { 
  UserPlusIcon,
  UserGroupIcon,
  HeartIcon,
  UsersIcon,
  BellIcon,
  ChatBubbleLeftRightIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/solid'
import { useDebounce } from '@/lib/hooks'

export default function FriendsPage({ 
  session, 
  friends = [], 
  following = [], 
  friendRequests = [], 
  onAddFriend, 
  onAcceptRequest, 
  onRejectRequest, 
  onShowUserProfile,
  onStartChat
}) {
  const [activeTab, setActiveTab] = useState('friends') // 'friends', 'following', 'requests'
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearch = useDebounce(searchQuery, 300)

  // 过滤列表
  const filteredFriends = friends.filter(friend => 
    friend.name?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
    friend.login?.toLowerCase().includes(debouncedSearch.toLowerCase())
  )

  const filteredFollowing = following.filter(user => 
    user.name?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
    user.login?.toLowerCase().includes(debouncedSearch.toLowerCase())
  )

  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
      {/* 标题和搜索区域 */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">好友列表</h1>
          <button
            onClick={onAddFriend}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            <UserPlusIcon className="w-5 h-5" />
            添加好友
          </button>
        </div>

        {/* 搜索框 */}
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            placeholder="搜索好友或关注..."
          />
        </div>
      </div>

      {/* 标签页切换 */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('friends')}
          className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'friends'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <UserGroupIcon className="w-5 h-5" />
            好友
            <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full text-xs">
              {friends.length}
            </span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('following')}
          className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'following'
              ? 'border-pink-500 text-pink-600 dark:text-pink-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <HeartIcon className="w-5 h-5" />
            关注
            <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full text-xs">
              {following.length}
            </span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'requests'
              ? 'border-yellow-500 text-yellow-600 dark:text-yellow-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <BellIcon className="w-5 h-5" />
            好友请求
            {friendRequests.length > 0 && (
              <span className="bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full text-xs">
                {friendRequests.length}
              </span>
            )}
          </div>
        </button>
      </div>

      {/* 列表内容 */}
      <div className="flex-1 p-6 overflow-y-auto">
        {activeTab === 'friends' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredFriends.length > 0 ? (
              filteredFriends.map(friend => (
                <div
                  key={friend.id}
                  className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
                >
                  <div
                    onClick={() => onShowUserProfile(friend)}
                    className="flex items-center gap-4 flex-1 min-w-0 cursor-pointer"
                  >
                    <Image
                      src={friend.image || '/default-avatar.png'}
                      alt={friend.name}
                      width={48}
                      height={48}
                      className="rounded-full"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white truncate">
                        {friend.name}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        @{friend.login}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onStartChat(friend)}
                      className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/50 rounded-lg transition-colors"
                      title="开始聊天"
                    >
                      <ChatBubbleLeftRightIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))
            ) : searchQuery ? (
              <div className="col-span-2 flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
                <MagnifyingGlassIcon className="w-16 h-16 mb-4" />
                <p>未找到相关好友</p>
              </div>
            ) : (
              <div className="col-span-2 flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
                <UsersIcon className="w-16 h-16 mb-4" />
                <p>暂无好友</p>
                <button
                  onClick={onAddFriend}
                  className="mt-4 flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/50 rounded-lg transition-colors"
                >
                  <UserPlusIcon className="w-5 h-5" />
                  添加好友
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'following' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredFollowing.length > 0 ? (
              filteredFollowing.map(user => (
                <div
                  key={user.id}
                  className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
                >
                  <div
                    onClick={() => onShowUserProfile(user)}
                    className="flex items-center gap-4 flex-1 min-w-0 cursor-pointer"
                  >
                    <Image
                      src={user.image || '/default-avatar.png'}
                      alt={user.name}
                      width={48}
                      height={48}
                      className="rounded-full"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white truncate">
                        {user.name}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        @{user.login}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onAddFriend(user)}
                      className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/50 rounded-lg transition-colors"
                      title="添加好友"
                    >
                      <UserPlusIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))
            ) : searchQuery ? (
              <div className="col-span-2 flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
                <MagnifyingGlassIcon className="w-16 h-16 mb-4" />
                <p>未找到相关用户</p>
              </div>
            ) : (
              <div className="col-span-2 flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
                <HeartIcon className="w-16 h-16 mb-4" />
                <p>暂无关注</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'requests' && (
          <div className="space-y-4">
            {friendRequests.length > 0 ? (
              friendRequests.map(request => (
                <div
                  key={request.id}
                  className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                >
                  <Image
                    src={request.user?.image || '/default-avatar.png'}
                    alt={request.user?.name}
                    width={48}
                    height={48}
                    className="rounded-full"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {request.user?.name}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      @{request.from}
                    </p>
                    {request.note && (
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                        {request.note}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => onAcceptRequest(request.id)}
                      className="px-3 py-1 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
                    >
                      接受
                    </button>
                    <button
                      onClick={() => onRejectRequest(request.id)}
                      className="px-3 py-1 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-md transition-colors"
                    >
                      拒绝
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
                <BellIcon className="w-16 h-16 mb-4" />
                <p>暂无好友请求</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
} 