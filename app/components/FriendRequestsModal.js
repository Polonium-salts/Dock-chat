'use client'

import { useState } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  XMarkIcon, 
  CheckIcon, 
  XCircleIcon,
  UserGroupIcon,
  ClockIcon,
  UserPlusIcon
} from '@heroicons/react/24/solid'

export default function FriendRequestsModal({ onClose, requests = [], onAccept, onReject }) {
  const [selectedRequest, setSelectedRequest] = useState(null)

  const modalVariants = {
    hidden: {
      opacity: 0,
      scale: 0.95,
      y: 20
    },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        type: "spring",
        duration: 0.3
      }
    },
    exit: {
      opacity: 0,
      scale: 0.95,
      y: -20,
      transition: {
        duration: 0.2
      }
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={onClose}
    >
      <motion.div
        variants={modalVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl max-w-lg w-full mx-4"
        onClick={e => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                <UserGroupIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-xl font-google-sans text-gray-900 dark:text-white">
                  好友请求
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {requests.length} 个待处理请求
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* 请求列表 */}
        <div className="p-6">
          {requests.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400"
            >
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                <UserGroupIcon className="w-8 h-8 text-gray-400 dark:text-gray-500" />
              </div>
              <p className="text-center">暂无好友请求</p>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              {requests.map((request) => (
                <motion.div
                  key={request.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -2 }}
                  className={`group relative bg-white dark:bg-gray-800 rounded-lg border transition-all ${
                    selectedRequest?.id === request.id
                      ? 'border-blue-500 shadow-md'
                      : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 hover:shadow-md'
                  }`}
                >
                  <div className="p-4">
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
                        <h3 className="font-google-sans text-gray-900 dark:text-white">
                          {request.user?.name}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          @{request.from}
                        </p>
                        {request.note && (
                          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                            {request.note}
                          </p>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <motion.button
                          whileHover={{ y: -2 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => onAccept(request.id)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                        >
                          <UserPlusIcon className="w-4 h-4" />
                          接受
                        </motion.button>
                        <motion.button
                          whileHover={{ y: -2 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => onReject(request.id)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg transition-colors"
                        >
                          <XCircleIcon className="w-4 h-4" />
                          拒绝
                        </motion.button>
                      </div>
                    </div>

                    {selectedRequest?.id === request.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700"
                      >
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <ClockIcon className="w-4 h-4" />
                            请求时间: {new Date(request.created_at).toLocaleString()}
                          </div>
                          {request.mutual_friends?.length > 0 && (
                            <div>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                共同好友 ({request.mutual_friends.length})
                              </p>
                              <div className="flex -space-x-2">
                                {request.mutual_friends.slice(0, 3).map((friend) => (
                                  <Image
                                    key={friend.id}
                                    src={friend.image || '/default-avatar.png'}
                                    alt={friend.name}
                                    width={32}
                                    height={32}
                                    className="rounded-full ring-2 ring-white dark:ring-gray-800"
                                  />
                                ))}
                                {request.mutual_friends.length > 3 && (
                                  <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xs text-gray-600 dark:text-gray-400 ring-2 ring-white dark:ring-gray-800">
                                    +{request.mutual_friends.length - 3}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
} 