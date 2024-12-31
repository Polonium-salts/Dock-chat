'use client'

import { useState } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  XMarkIcon,
  UserPlusIcon,
  HeartIcon,
  ChatBubbleLeftRightIcon,
  GlobeAltIcon,
  UserGroupIcon,
  BookOpenIcon
} from '@heroicons/react/24/solid'

export default function UserProfileModal({ 
  user, 
  onClose, 
  onAddFriend, 
  onFollow, 
  onStartChat,
  isFriend,
  isFollowing 
}) {
  const [activeTab, setActiveTab] = useState('about') // 'about', 'friends', 'repos'

  const modalVariants = {
    hidden: {
      opacity: 0,
      scale: 0.9,
      y: 20
    },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 30
      }
    },
    exit: {
      opacity: 0,
      scale: 0.9,
      y: -20,
      transition: {
        duration: 0.2
      }
    }
  }

  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 }
  }

  const tabVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { 
      opacity: 1, 
      x: 0,
      transition: {
        duration: 0.3
      }
    },
    exit: { 
      opacity: 0, 
      x: 20,
      transition: {
        duration: 0.3
      }
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial="hidden"
        animate="visible"
        exit="exit"
        variants={overlayVariants}
        className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50"
        onClick={onClose}
      >
        <motion.div
          variants={modalVariants}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-2xl w-full mx-4 overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* 头部 */}
          <div className="relative h-48 bg-gradient-to-r from-blue-500 to-purple-500">
            <button
              onClick={onClose}
              className="absolute right-4 top-4 text-white/80 hover:text-white"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {/* 用户信息 */}
          <div className="relative px-6 pb-6">
            <div className="absolute -top-16 left-6 flex items-end gap-4">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="relative"
              >
                <Image
                  src={user.image || '/default-avatar.png'}
                  alt={user.name}
                  width={96}
                  height={96}
                  className="rounded-2xl ring-4 ring-white dark:ring-gray-800"
                />
                {user.isOnline && (
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-4 border-white dark:border-gray-800" />
                )}
              </motion.div>
              
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="mb-2"
              >
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {user.name}
                </h2>
                <p className="text-gray-500 dark:text-gray-400">
                  @{user.login}
                </p>
              </motion.div>
            </div>

            {/* 操作按钮 */}
            <div className="mt-24 flex gap-3">
              {!isFriend && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onAddFriend}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                >
                  <UserPlusIcon className="w-5 h-5" />
                  添加好友
                </motion.button>
              )}

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onFollow}
                className={`flex items-center gap-2 px-4 py-2 ${
                  isFollowing
                    ? 'bg-pink-100 text-pink-600 hover:bg-pink-200 dark:bg-pink-900/50 dark:text-pink-400'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
                } rounded-lg transition-colors`}
              >
                <HeartIcon className="w-5 h-5" />
                {isFollowing ? '已关注' : '关注'}
              </motion.button>

              {isFriend && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onStartChat}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                >
                  <ChatBubbleLeftRightIcon className="w-5 h-5" />
                  发起聊天
                </motion.button>
              )}
            </div>

            {/* 标签页切换 */}
            <div className="mt-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex gap-6">
                <motion.button
                  whileHover={{ y: -2 }}
                  onClick={() => setActiveTab('about')}
                  className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'about'
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <GlobeAltIcon className="w-5 h-5" />
                    关于
                  </div>
                </motion.button>

                <motion.button
                  whileHover={{ y: -2 }}
                  onClick={() => setActiveTab('friends')}
                  className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'friends'
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <UserGroupIcon className="w-5 h-5" />
                    好友
                  </div>
                </motion.button>

                <motion.button
                  whileHover={{ y: -2 }}
                  onClick={() => setActiveTab('repos')}
                  className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'repos'
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <BookOpenIcon className="w-5 h-5" />
                    仓库
                  </div>
                </motion.button>
              </div>
            </div>

            {/* 标签页内容 */}
            <div className="mt-6">
              <AnimatePresence mode="wait">
                {activeTab === 'about' && (
                  <motion.div
                    key="about"
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    variants={tabVariants}
                    className="space-y-4"
                  >
                    {user.bio && (
                      <p className="text-gray-600 dark:text-gray-300">
                        {user.bio}
                      </p>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <p className="text-sm text-gray-500 dark:text-gray-400">关注者</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                          {user.followers || 0}
                        </p>
                      </div>
                      <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <p className="text-sm text-gray-500 dark:text-gray-400">正在关注</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                          {user.following || 0}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'friends' && (
                  <motion.div
                    key="friends"
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    variants={tabVariants}
                  >
                    <div className="grid grid-cols-2 gap-4">
                      {user.friends?.map(friend => (
                        <div
                          key={friend.id}
                          className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                        >
                          <Image
                            src={friend.image || '/default-avatar.png'}
                            alt={friend.name}
                            width={40}
                            height={40}
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
                      ))}
                    </div>
                  </motion.div>
                )}

                {activeTab === 'repos' && (
                  <motion.div
                    key="repos"
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    variants={tabVariants}
                  >
                    <div className="space-y-4">
                      {user.repos?.map(repo => (
                        <a
                          key={repo.id}
                          href={repo.html_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                          <h3 className="font-medium text-gray-900 dark:text-white">
                            {repo.name}
                          </h3>
                          {repo.description && (
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                              {repo.description}
                            </p>
                          )}
                          <div className="mt-2 flex items-center gap-4 text-sm">
                            <span className="text-gray-500 dark:text-gray-400">
                              ⭐ {repo.stargazers_count}
                            </span>
                            <span className="text-gray-500 dark:text-gray-400">
                              🔀 {repo.forks_count}
                            </span>
                            <span className="text-gray-500 dark:text-gray-400">
                              {repo.language}
                            </span>
                          </div>
                        </a>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
} 