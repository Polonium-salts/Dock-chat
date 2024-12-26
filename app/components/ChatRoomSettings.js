'use client'

import { useState } from 'react'
import { TrashIcon } from '@heroicons/react/24/solid'

export default function ChatRoomSettings({ room, onDelete, onClose }) {
  const [showConfirmDelete, setShowConfirmDelete] = useState(false)

  const handleDelete = () => {
    try {
      if (!room?.id) return
      if (room.id === 'public' || room.id === 'kimi-ai') {
        alert('系统聊天室不能删除')
        return
      }
      onDelete(room.id)
      onClose()
    } catch (error) {
      console.error('Error deleting chat room:', error)
      alert('删除聊天室时出错')
    }
  }

  return (
    <div className="absolute top-12 right-0 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
      <div className="p-4">
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white">
            {room?.name || '聊天室'} 设置
          </h3>
          
          {!showConfirmDelete ? (
            <button
              onClick={() => setShowConfirmDelete(true)}
              className="w-full flex items-center px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/50 rounded-md"
            >
              <TrashIcon className="w-4 h-4 mr-2" />
              删除聊天室
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                确定要删除这个聊天室吗？此操作不可撤销。
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleDelete}
                  className="flex-1 px-3 py-1.5 text-xs font-medium text-white bg-red-500 hover:bg-red-600 rounded-md"
                >
                  确认删除
                </button>
                <button
                  onClick={() => setShowConfirmDelete(false)}
                  className="flex-1 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md"
                >
                  取消
                </button>
              </div>
            </div>
          )}

          <button
            onClick={onClose}
            className="w-full px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-700 rounded-md"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  )
} 