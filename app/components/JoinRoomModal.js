'use client'

import { useState } from 'react'
import { Dialog } from '@headlessui/react'
import { 
  XMarkIcon,
  MagnifyingGlassIcon,
  ChatBubbleLeftRightIcon,
  LockClosedIcon
} from '@heroicons/react/24/outline'
import { useDebounce } from '@/lib/hooks'

export default function JoinRoomModal({ isOpen, onClose, onJoin, session }) {
  const [roomId, setRoomId] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [error, setError] = useState('')
  const debouncedSearch = useDebounce(searchQuery, 300)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!roomId.trim()) {
      setError('请输入聊天室ID')
      return
    }

    try {
      await onJoin(roomId.trim())
      onClose()
    } catch (err) {
      setError('加入聊天室失败')
    }
  }

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      className="fixed inset-0 z-50 overflow-y-auto"
    >
      <div className="flex min-h-screen items-center justify-center p-4">
        <Dialog.Overlay className="fixed inset-0 bg-black/30" />

        <div className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-xl">
          {/* 标题栏 */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <Dialog.Title className="text-xl font-semibold text-gray-900 dark:text-white">
              加入聊天室
            </Dialog.Title>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* 搜索框 */}
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="搜索聊天室..."
              />
            </div>

            {/* 聊天室列表 */}
            <div className="space-y-2">
              {/* 这里可以添加搜索到的聊天室列表 */}
            </div>

            {/* 直接加入 */}
            <div>
              <label htmlFor="roomId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                聊天室ID
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <ChatBubbleLeftRightIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  id="roomId"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  className="block w-full pl-10 rounded-md border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                  placeholder="输入聊天室ID"
                />
              </div>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                输入聊天室ID直接加入，私密聊天室需要邀请码
              </p>
            </div>

            {/* 错误提示 */}
            {error && (
              <div className="text-sm text-red-600 dark:text-red-400">
                {error}
              </div>
            )}

            {/* 操作按钮 */}
            <div className="flex justify-end gap-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
              >
                取消
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
              >
                加入
              </button>
            </div>
          </form>
        </div>
      </div>
    </Dialog>
  )
} 