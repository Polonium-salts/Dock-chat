'use client'

import { useState } from 'react'
import { TrashIcon, CogIcon } from '@heroicons/react/outline'

export default function ChatRoomSettings({ room, onDelete, onClose, onUpdateSettings }) {
  const [showConfirmDelete, setShowConfirmDelete] = useState(false)
  const [isPrivate, setIsPrivate] = useState(room?.isPrivate || false)
  const [showSettings, setShowSettings] = useState(false)

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
      alert('删除聊天室失败')
    }
  }

  const handleUpdateSettings = () => {
    try {
      onUpdateSettings({
        ...room,
        isPrivate
      })
      setShowSettings(false)
    } catch (error) {
      console.error('Error updating chat room settings:', error)
      alert('更新聊天室设置失败')
    }
  }

  return (
    <div className="absolute top-12 right-0 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
      <div className="p-4">
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white">
            {room?.name || '聊天室'} 设置
          </h3>

          {/* 聊天室信息 */}
          <div className="space-y-2 text-xs text-gray-500 dark:text-gray-400">
            <p>ID: {room?.id}</p>
            <p>类型: {room?.type === 'ai' ? 'AI 助手' : '聊天室'}</p>
            <p>创建时间: {new Date(room?.created_at).toLocaleString()}</p>
            <p>消息数量: {room?.message_count || 0}</p>
          </div>

          {/* 设置选项 */}
          {!showSettings ? (
            <button
              onClick={() => setShowSettings(true)}
              className="w-full flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700/50 rounded-md"
            >
              <CogIcon className="w-4 h-4 mr-2" />
              聊天室设置
            </button>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm text-gray-700 dark:text-gray-300">
                  私密聊天室
                </label>
                <input
                  type="checkbox"
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleUpdateSettings}
                  className="flex-1 px-3 py-1.5 text-xs font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-md"
                >
                  保存设置
                </button>
                <button
                  onClick={() => setShowSettings(false)}
                  className="flex-1 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md"
                >
                  取消
                </button>
              </div>
            </div>
          )}

          {/* 删除选项 */}
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
        </div>
      </div>
    </div>
  )
} 