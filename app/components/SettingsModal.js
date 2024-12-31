'use client'

import { useState } from 'react'
import { XMarkIcon, TrashIcon } from '@heroicons/react/24/outline'
import { useSession } from 'next-auth/react'

export default function SettingsModal({ isOpen, onClose, config, onSave, theme, setTheme }) {
  const { data: session } = useSession()
  const [isDeleting, setIsDeleting] = useState(false)
  const [showConfirmDelete, setShowConfirmDelete] = useState(false)

  if (!isOpen) return null

  const handleSave = async (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    const updatedConfig = {
      ...config,
      settings: {
        ...config.settings,
        theme: formData.get('theme')
      },
      last_updated: new Date().toISOString()
    }
    await onSave(updatedConfig)
    onClose()
  }

  const handleDeleteRepository = async () => {
    if (!session?.accessToken || !session.user?.login) return
    
    try {
      setIsDeleting(true)
      const response = await fetch(`https://api.github.com/repos/${session.user.login}/dock-chat-data`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      })

      if (response.status === 204) {
        alert('存储库已成功删除')
        window.location.reload()
      } else {
        throw new Error('删除存储库失败')
      }
    } catch (error) {
      console.error('Error deleting repository:', error)
      alert('删除存储库失败，请重试')
    } finally {
      setIsDeleting(false)
      setShowConfirmDelete(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">设置</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              主题
            </label>
            <select
              name="theme"
              defaultValue={theme}
              onChange={(e) => setTheme(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="system">跟随系统</option>
              <option value="light">浅色</option>
              <option value="dark">深色</option>
            </select>
          </div>

          <div className="pt-4 space-y-4">
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <button
                type="button"
                onClick={() => setShowConfirmDelete(true)}
                className="flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 dark:text-red-400 dark:bg-red-900/30 dark:hover:bg-red-900/50 rounded-md transition-colors"
              >
                <TrashIcon className="w-5 h-5 mr-2" />
                删除私有存储库
              </button>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md"
              >
                取消
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
              >
                保存
              </button>
            </div>
          </div>
        </form>

        {showConfirmDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-sm w-full mx-4 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                确认删除
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                此操作将删除您的私有存储库及其中的所有数据。此操作不可逆，请谨慎操作。
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowConfirmDelete(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md"
                  disabled={isDeleting}
                >
                  取消
                </button>
                <button
                  onClick={handleDeleteRepository}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md disabled:opacity-50"
                  disabled={isDeleting}
                >
                  {isDeleting ? '删除中...' : '确认删除'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 