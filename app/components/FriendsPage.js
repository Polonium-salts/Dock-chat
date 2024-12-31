'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { 
  UserPlusIcon,
  UserGroupIcon,
  HeartIcon,
  UsersIcon,
  BellIcon,
  ChatBubbleLeftIcon,
  UserCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/solid'
import { useSession } from 'next-auth/react'

export default function FriendsPage({ 
  session, 
  friends = [], 
  following = [], 
  friendRequests = [], 
  onAddFriend, 
  onAcceptRequest, 
  onRejectRequest, 
  onShowUserProfile,
  onStartChat,
  onUnfollow
}) {
  const [activeTab, setActiveTab] = useState('friends') // 'friends', 'following', 'requests'
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUser, setSelectedUser] = useState(null)

  // 过滤用户列表
  const filteredFriends = friends.filter(friend => 
    friend.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    friend.login?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredFollowing = following.filter(user => 
    user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.login?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* 主列表区域 */}
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
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 pl-10 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="搜索用户..."
            />
            <UserCircleIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
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
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => onStartChat(friend)}
                        className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/50 rounded-lg transition-colors"
                        title="开始聊天"
                      >
                        <ChatBubbleLeftIcon className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => onShowUserProfile(friend)}
                        className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
                        title="查看资料"
                      >
                        <UserCircleIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-2 flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
                  <UsersIcon className="w-16 h-16 mb-4" />
                  <p>{searchQuery ? '未找到相关用户' : '暂无好友'}</p>
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
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => onUnfollow(user.id)}
                        className="px-3 py-1 text-sm font-medium text-pink-600 dark:text-pink-400 hover:bg-pink-50 dark:hover:bg-pink-900/50 rounded-md transition-colors"
                      >
                        取消关注
                      </button>
                      <button
                        onClick={() => onShowUserProfile(user)}
                        className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
                        title="查看资料"
                      >
                        <UserCircleIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-2 flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
                  <HeartIcon className="w-16 h-16 mb-4" />
                  <p>{searchQuery ? '未找到相关用户' : '暂无关注'}</p>
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

      {/* 用户详情侧边栏 */}
      {selectedUser && (
        <div className="w-80 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">用户资料</h2>
              <button
                onClick={() => setSelectedUser(null)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col items-center">
              <Image
                src={selectedUser.image || '/default-avatar.png'}
                alt={selectedUser.name}
                width={120}
                height={120}
                className="rounded-full"
              />
              <h3 className="mt-4 text-xl font-semibold text-gray-900 dark:text-white">
                {selectedUser.name}
              </h3>
              <p className="text-gray-500 dark:text-gray-400">@{selectedUser.login}</p>

              <div className="flex gap-4 mt-6">
                <button
                  onClick={() => onStartChat(selectedUser)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  <ChatBubbleLeftIcon className="w-5 h-5" />
                  发起聊天
                </button>
                <button
                  onClick={() => onUnfollow(selectedUser.id)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-pink-600 dark:text-pink-400 hover:bg-pink-50 dark:hover:bg-pink-900/50 rounded-lg transition-colors"
                >
                  <HeartIcon className="w-5 h-5" />
                  {following.some(f => f.id === selectedUser.id) ? '取消关注' : '关注'}
                </button>
              </div>
            </div>

            {selectedUser.bio && (
              <div className="mt-6">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">个人简介</h4>
                <p className="text-gray-600 dark:text-gray-400">{selectedUser.bio}</p>
              </div>
            )}

            <div className="mt-6 grid grid-cols-2 gap-4 text-center">
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {selectedUser.following_count || 0}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">关注</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {selectedUser.followers_count || 0}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">粉丝</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 