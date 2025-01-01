'use client'

import { useState } from 'react'
import { XMarkIcon } from '@heroicons/react/24/solid'

export default function ChatRoomSettings({ isOpen, onClose, roomId, onDelete }) {
  const [autoSave, setAutoSave] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  if (!isOpen) return null

  const handleDelete = () => {
    if (roomId === 'public' || roomId === 'kimi-ai' || roomId === 'system') {
      alert('系统聊天室不能删除')
      return
    }
    setShowDeleteConfirm(true)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">聊天室设置</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* 自动保存设置 */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">自动保存聊天记录</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                每隔5分钟自动保存聊天记录到 GitHub
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={autoSave}
                onChange={(e) => setAutoSave(e.target.checked)}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* 删除聊天室 */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleDelete}
              className="w-full px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md"
            >
              删除聊天室
            </button>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              删除后聊天记录将无法恢复，请谨慎操作
            </p>
          </div>
        </div>

        {/* 删除确认对话框 */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-sm w-full mx-4 p-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                确认删除聊天室？
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                删除后聊天记录将无法恢复，是否继续？
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md"
                >
                  取消
                </button>
                <button
                  onClick={() => {
                    onDelete(roomId)
                    setShowDeleteConfirm(false)
                    onClose()
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md"
                >
                  确认删除
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 