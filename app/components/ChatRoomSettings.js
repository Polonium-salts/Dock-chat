'use client'

import { useState } from 'react'
import { XMarkIcon, TrashIcon } from '@heroicons/react/24/solid'

export default function ChatRoomSettings({ room, onDelete, onClose }) {
  const [isConfirming, setIsConfirming] = useState(false)

  // 防止点击设置面板时关闭
  const handlePanelClick = (e) => {
    e.stopPropagation()
  }

  // 处理删除聊天室
  const handleDelete = () => {
    if (room.id === 'public' || room.id === 'system') {
      alert('系统聊天室不能删除')
      return
    }
    onDelete(room.id)
    onClose()
  }

  return (
    <div 
      className="absolute top-full right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50"
      onClick={handlePanelClick}
    >
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            聊天室设置
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              聊天室名称
            </label>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {room.name}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              聊天室 ID
            </label>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {room.id}
            </p>
          </div>

          {!isConfirming ? (
            <button
              onClick={() => setIsConfirming(true)}
              className="w-full flex items-center justify-center gap-2 p-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/50 rounded-lg transition-colors"
              disabled={room.id === 'public' || room.id === 'system'}
            >
              <TrashIcon className="w-5 h-5" />
              删除聊天室
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-red-600 dark:text-red-400">
                确定要删除这个聊天室吗？此操作不可撤销。
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsConfirming(false)}
                  className="flex-1 p-2 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 p-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
                >
                  确认删除
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 