'use client'

import { Fragment, useState } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { XMarkIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import Image from 'next/image'
import { useDebounce } from '@/lib/hooks'

export default function AddFriendModal({ isOpen, onClose, session }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const debouncedSearch = useDebounce(searchQuery, 300)

  // 搜索用户
  const searchUsers = async (query) => {
    if (!query) {
      setSearchResults([])
      return
    }

    try {
      setIsLoading(true)
      setError('')

      const response = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`)
      if (!response.ok) {
        throw new Error('搜索用户失败')
      }

      const data = await response.json()
      setSearchResults(data)
    } catch (err) {
      console.error('Failed to search users:', err)
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  // 发送好友请求
  const sendFriendRequest = async (userId) => {
    try {
      setIsLoading(true)
      setError('')

      const response = await fetch('/api/friends/requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      })

      if (!response.ok) {
        throw new Error('发送好友请求失败')
      }

      // 成功发送请求后关闭模态框
      onClose()
    } catch (err) {
      console.error('Failed to send friend request:', err)
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
                添加好友
              </Dialog.Title>
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>

              <div className="mt-4">
                {/* 搜索框 */}
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="搜索用户..."
                  />
                </div>

                {/* 搜索结果 */}
                <div className="mt-4">
                  {isLoading ? (
                    <div className="text-center py-4">
                      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    </div>
                  ) : error ? (
                    <div className="text-center text-red-500 dark:text-red-400">
                      {error}
                    </div>
                  ) : searchResults.length > 0 ? (
                    <div className="space-y-2">
                      {searchResults.map(user => (
                        <div
                          key={user.id}
                          className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                        >
                          <div className="flex items-center space-x-3">
                            <Image
                              src={user.image || '/default-avatar.png'}
                              alt={user.name}
                              width={40}
                              height={40}
                              className="rounded-full"
                            />
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">
                                {user.name}
                              </p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                @{user.login}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => sendFriendRequest(user.id)}
                            className="px-3 py-1 text-sm text-white bg-blue-500 hover:bg-blue-600 rounded"
                          >
                            添加
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : searchQuery ? (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      未找到相关用户
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      输入用户名或邮箱搜索
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