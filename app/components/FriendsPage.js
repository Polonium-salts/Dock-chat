'use client'

import { Fragment, useState } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { XMarkIcon, UserPlusIcon } from '@heroicons/react/24/outline'
import Image from 'next/image'

export default function FriendsPage({ isOpen, onClose, onAddFriend, session }) {
  const [activeTab, setActiveTab] = useState('friends') // 'friends' or 'requests'
  const [friends, setFriends] = useState([])
  const [requests, setRequests] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const loadFriends = async () => {
    try {
      setIsLoading(true)
      setError('')

      const response = await fetch('/api/friends')
      if (!response.ok) {
        throw new Error('加载好友列表失败')
      }

      const data = await response.json()
      setFriends(data)
    } catch (err) {
      console.error('Failed to load friends:', err)
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const loadRequests = async () => {
    try {
      setIsLoading(true)
      setError('')

      const response = await fetch('/api/friends/requests')
      if (!response.ok) {
        throw new Error('加载好友请求失败')
      }

      const data = await response.json()
      setRequests(data)
    } catch (err) {
      console.error('Failed to load friend requests:', err)
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="fixed inset-0 z-50 overflow-y-auto" onClose={onClose}>
        <div className="min-h-screen px-4 text-center">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <Dialog.Overlay className="fixed inset-0 bg-black bg-opacity-30" />
          </Transition.Child>

          <span className="inline-block h-screen align-middle" aria-hidden="true">&#8203;</span>

          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white dark:bg-gray-800 shadow-xl rounded-2xl">
              <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900 dark:text-white">
                好友管理
              </Dialog.Title>
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>

              <div className="mt-4">
                {/* 标签页 */}
                <div className="border-b border-gray-200 dark:border-gray-700">
                  <nav className="-mb-px flex space-x-8">
                    <button
                      onClick={() => setActiveTab('friends')}
                      className={`py-4 px-1 border-b-2 font-medium text-sm ${
                        activeTab === 'friends'
                          ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                      }`}
                    >
                      好友列表
                    </button>
                    <button
                      onClick={() => setActiveTab('requests')}
                      className={`py-4 px-1 border-b-2 font-medium text-sm ${
                        activeTab === 'requests'
                          ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                      }`}
                    >
                      好友请求
                      {requests.length > 0 && (
                        <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-600 rounded-full">
                          {requests.length}
                        </span>
                      )}
                    </button>
                  </nav>
                </div>

                {/* 内容区域 */}
                <div className="mt-4">
                  {isLoading ? (
                    <div className="text-center py-4">
                      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    </div>
                  ) : error ? (
                    <div className="text-center text-red-500 dark:text-red-400">
                      {error}
                    </div>
                  ) : activeTab === 'friends' ? (
                    <div className="space-y-4">
                      <button
                        onClick={onAddFriend}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                      >
                        <UserPlusIcon className="w-5 h-5" />
                        添加好友
                      </button>
                      {friends.length === 0 ? (
                        <p className="text-center text-gray-500 dark:text-gray-400">
                          暂无好友
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {friends.map(friend => (
                            <div
                              key={friend.id}
                              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                            >
                              <div className="flex items-center space-x-3">
                                <Image
                                  src={friend.image || '/default-avatar.png'}
                                  alt={friend.name}
                                  width={40}
                                  height={40}
                                  className="rounded-full"
                                />
                                <div>
                                  <p className="font-medium text-gray-900 dark:text-white">
                                    {friend.name}
                                  </p>
                                  <p className="text-sm text-gray-500 dark:text-gray-400">
                                    @{friend.login}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {requests.length === 0 ? (
                        <p className="text-center text-gray-500 dark:text-gray-400">
                          暂无好友请求
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {requests.map(request => (
                            <div
                              key={request.id}
                              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                            >
                              <div className="flex items-center space-x-3">
                                <Image
                                  src={request.user.image || '/default-avatar.png'}
                                  alt={request.user.name}
                                  width={40}
                                  height={40}
                                  className="rounded-full"
                                />
                                <div>
                                  <p className="font-medium text-gray-900 dark:text-white">
                                    {request.user.name}
                                  </p>
                                  <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {request.note || '无验证消息'}
                                  </p>
                                </div>
                              </div>
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => handleAcceptRequest(request.id)}
                                  className="px-3 py-1 text-sm text-white bg-blue-500 hover:bg-blue-600 rounded"
                                >
                                  接受
                                </button>
                                <button
                                  onClick={() => handleRejectRequest(request.id)}
                                  className="px-3 py-1 text-sm text-red-500 hover:text-red-600 bg-red-50 hover:bg-red-100 rounded"
                                >
                                  拒绝
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  )
} 