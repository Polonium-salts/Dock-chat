'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  UserPlusIcon,
  UserGroupIcon,
  HeartIcon,
  UsersIcon,
  BellIcon,
  ChatBubbleLeftRightIcon,
  ArrowRightIcon
} from '@heroicons/react/24/solid'

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
  const [activeTab, setActiveTab] = useState('friends')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFriend, setSelectedFriend] = useState(null)

  const filteredFriends = friends.filter(friend => 
    friend.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    friend.login?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredFollowing = following.filter(user =>
    user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.login?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        ease: [0.4, 0, 0.2, 1]
      }
    },
    exit: {
      opacity: 0,
      y: -20,
      transition: {
        duration: 0.3,
        ease: [0.4, 0, 1, 1]
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.3,
        ease: [0.4, 0, 0.2, 1]
      }
    }
  }

  const staggerVariants = {
    visible: {
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={containerVariants}
      className="flex-1 flex flex-col bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden"
    >
      {/* 标题和搜索区域 */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <motion.h1 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-2xl font-bold text-gray-900 dark:text-white"
          >
            好友列表
          </motion.h1>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onAddFriend}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            <UserPlusIcon className="w-5 h-5" />
            添加好友
          </motion.button>
        </div>

        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:text-white"
            placeholder="搜索好友..."
          />
          <UsersIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        </div>
      </div>

      {/* 标签页切换 */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        <motion.button
          whileHover={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}
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
        </motion.button>

        <motion.button
          whileHover={{ backgroundColor: 'rgba(236, 72, 153, 0.1)' }}
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
        </motion.button>

        <motion.button
          whileHover={{ backgroundColor: 'rgba(234, 179, 8, 0.1)' }}
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
        </motion.button>
      </div>

      {/* 列表内容 */}
      <div className="flex-1 p-6 overflow-y-auto">
        <AnimatePresence mode="wait">
          {activeTab === 'friends' && (
            <motion.div
              key="friends"
              variants={staggerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              {filteredFriends.length > 0 ? (
                filteredFriends.map(friend => (
                  <motion.div
                    key={friend.id}
                    variants={itemVariants}
                    whileHover={{ scale: 1.02 }}
                    className="group relative bg-gray-50 dark:bg-gray-700/50 rounded-xl overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/0 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    <div className="relative p-4">
                      <div className="flex items-center gap-4">
                        <motion.div
                          whileHover={{ scale: 1.1 }}
                          className="relative"
                        >
                          <Image
                            src={friend.image || '/default-avatar.png'}
                            alt={friend.name}
                            width={48}
                            height={48}
                            className="rounded-full ring-2 ring-white dark:ring-gray-800"
                          />
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-gray-800" />
                        </motion.div>
                        
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                            {friend.name}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                            @{friend.login}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => onStartChat(friend)}
                            className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/50 rounded-full transition-colors"
                          >
                            <ChatBubbleLeftRightIcon className="w-5 h-5" />
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => onShowUserProfile(friend)}
                            className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-full transition-colors"
                          >
                            <ArrowRightIcon className="w-5 h-5" />
                          </motion.button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <motion.div
                  variants={containerVariants}
                  className="col-span-2 flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400"
                >
                  <UsersIcon className="w-16 h-16 mb-4" />
                  <p>暂无好友</p>
                </motion.div>
              )}
            </motion.div>
          )}

          {activeTab === 'following' && (
            <motion.div
              key="following"
              variants={staggerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              {filteredFollowing.length > 0 ? (
                filteredFollowing.map(user => (
                  <motion.div
                    key={user.id}
                    variants={itemVariants}
                    whileHover={{ scale: 1.02 }}
                    className="group relative bg-gray-50 dark:bg-gray-700/50 rounded-xl overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-pink-500/0 via-pink-500/0 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    <div className="relative p-4">
                      <div className="flex items-center gap-4">
                        <motion.div
                          whileHover={{ scale: 1.1 }}
                          className="relative"
                        >
                          <Image
                            src={user.image || '/default-avatar.png'}
                            alt={user.name}
                            width={48}
                            height={48}
                            className="rounded-full ring-2 ring-white dark:ring-gray-800"
                          />
                        </motion.div>
                        
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                            {user.name}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                            @{user.login}
                          </p>
                        </div>

                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => onShowUserProfile(user)}
                          className="px-3 py-1 text-sm font-medium text-pink-600 dark:text-pink-400 hover:bg-pink-50 dark:hover:bg-pink-900/50 rounded-md transition-colors"
                        >
                          已关注
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <motion.div
                  variants={containerVariants}
                  className="col-span-2 flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400"
                >
                  <HeartIcon className="w-16 h-16 mb-4" />
                  <p>暂无关注</p>
                </motion.div>
              )}
            </motion.div>
          )}

          {activeTab === 'requests' && (
            <motion.div
              key="requests"
              variants={staggerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="space-y-4"
            >
              {friendRequests.length > 0 ? (
                friendRequests.map(request => (
                  <motion.div
                    key={request.id}
                    variants={itemVariants}
                    whileHover={{ scale: 1.02 }}
                    className="group relative bg-gray-50 dark:bg-gray-700/50 rounded-xl overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/0 via-yellow-500/0 to-yellow-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    <div className="relative p-4">
                      <div className="flex items-center gap-4">
                        <motion.div
                          whileHover={{ scale: 1.1 }}
                          className="relative"
                        >
                          <Image
                            src={request.user?.image || '/default-avatar.png'}
                            alt={request.user?.name}
                            width={48}
                            height={48}
                            className="rounded-full ring-2 ring-white dark:ring-gray-800"
                          />
                        </motion.div>
                        
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {request.user?.name}
                          </h3>
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
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => onAcceptRequest(request.id)}
                            className="px-3 py-1 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
                          >
                            接受
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => onRejectRequest(request.id)}
                            className="px-3 py-1 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-md transition-colors"
                          >
                            拒绝
                          </motion.button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <motion.div
                  variants={containerVariants}
                  className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400"
                >
                  <BellIcon className="w-16 h-16 mb-4" />
                  <p>暂无好友请求</p>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
} 