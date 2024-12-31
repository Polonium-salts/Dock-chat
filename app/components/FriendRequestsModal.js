'use client'

import { useState } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  XMarkIcon, 
  CheckIcon, 
  XCircleIcon,
  UserGroupIcon
} from '@heroicons/react/24/solid'

export default function FriendRequestsModal({ onClose, requests = [], onAccept, onReject }) {
  const [selectedRequest, setSelectedRequest] = useState(null)

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

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.3
      }
    }
  }

  const listVariants = {
    visible: {
      transition: {
        staggerChildren: 0.1
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
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-lg w-full mx-4 overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* 头部 */}
          <div className="relative border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                  <UserGroupIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    好友请求
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {requests.length} 个待处理请求
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* 请求列表 */}
          <div className="p-4">
            {requests.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400"
              >
                <UserGroupIcon className="w-16 h-16 mb-4" />
                <p>暂无好友请求</p>
              </motion.div>
            ) : (
              <motion.div
                variants={listVariants}
                initial="hidden"
                animate="visible"
                className="space-y-4"
              >
                {requests.map((request) => (
                  <motion.div
                    key={request.id}
                    variants={itemVariants}
                    className={`group relative bg-gray-50 dark:bg-gray-700/50 rounded-xl overflow-hidden transition-all duration-200 ${
                      selectedRequest?.id === request.id
                        ? 'ring-2 ring-blue-500'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                    onClick={() => setSelectedRequest(request)}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/0 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                    
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
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => onAccept(request.id)}
                            className="p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/50 rounded-full transition-colors"
                          >
                            <CheckIcon className="w-5 h-5" />
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => onReject(request.id)}
                            className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/50 rounded-full transition-colors"
                          >
                            <XCircleIcon className="w-5 h-5" />
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
                          <div className="space-y-2">
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              请求时间: {new Date(request.created_at).toLocaleString()}
                            </p>
                            {request.mutual_friends?.length > 0 && (
                              <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                  共同好友: {request.mutual_friends.length}
                                </p>
                                <div className="flex -space-x-2 mt-1">
                                  {request.mutual_friends.slice(0, 3).map((friend) => (
                                    <Image
                                      key={friend.id}
                                      src={friend.image || '/default-avatar.png'}
                                      alt={friend.name}
                                      width={24}
                                      height={24}
                                      className="rounded-full ring-2 ring-white dark:ring-gray-800"
                                    />
                                  ))}
                                  {request.mutual_friends.length > 3 && (
                                    <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs text-gray-600 dark:text-gray-400 ring-2 ring-white dark:ring-gray-800">
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
    </AnimatePresence>
  )
} 