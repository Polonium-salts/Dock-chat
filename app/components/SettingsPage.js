'use client'

import { useState } from 'react'
import { signOut } from 'next-auth/react'

export default function SettingsPage({ config, onSave, onDeleteRepo, onCreateRepo }) {
  const [activeTab, setActiveTab] = useState('general') // 'general', 'account', 'storage'

  const handleSignOut = async () => {
    try {
      await signOut({ callbackUrl: '/' })
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-800">
      {/* 顶部标签栏 */}
      <div className="flex items-center p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex space-x-4">
          <button
            onClick={() => setActiveTab('general')}
            className={`px-4 py-2 text-sm font-medium rounded-lg ${
              activeTab === 'general'
                ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400'
                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
            }`}
          >
            常规设置
          </button>
          <button
            onClick={() => setActiveTab('account')}
            className={`px-4 py-2 text-sm font-medium rounded-lg ${
              activeTab === 'account'
                ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400'
                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
            }`}
          >
            账号设置
          </button>
          <button
            onClick={() => setActiveTab('storage')}
            className={`px-4 py-2 text-sm font-medium rounded-lg ${
              activeTab === 'storage'
                ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400'
                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
            }`}
          >
            存储设置
          </button>
        </div>
      </div>

      {/* 设置内容区域 */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'general' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">主题设置</h3>
              <div className="mt-4 space-y-4">
                <div className="flex items-center">
                  <input
                    type="radio"
                    id="theme-light"
                    name="theme"
                    value="light"
                    checked={config?.settings?.theme === 'light'}
                    onChange={(e) => onSave({ ...config, settings: { ...config?.settings, theme: e.target.value } })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <label htmlFor="theme-light" className="ml-3 text-sm text-gray-700 dark:text-gray-300">
                    浅色主题
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="radio"
                    id="theme-dark"
                    name="theme"
                    value="dark"
                    checked={config?.settings?.theme === 'dark'}
                    onChange={(e) => onSave({ ...config, settings: { ...config?.settings, theme: e.target.value } })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <label htmlFor="theme-dark" className="ml-3 text-sm text-gray-700 dark:text-gray-300">
                    深色主题
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="radio"
                    id="theme-system"
                    name="theme"
                    value="system"
                    checked={config?.settings?.theme === 'system'}
                    onChange={(e) => onSave({ ...config, settings: { ...config?.settings, theme: e.target.value } })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <label htmlFor="theme-system" className="ml-3 text-sm text-gray-700 dark:text-gray-300">
                    跟随系统
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'account' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">账号管理</h3>
              <button
                onClick={handleSignOut}
                className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/50 rounded-lg transition-colors"
              >
                退出登录
              </button>
            </div>
          </div>
        )}

        {activeTab === 'storage' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">存储管理</h3>
              <div className="space-y-4">
                <button
                  onClick={onCreateRepo}
                  className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  创建私有存储库
                </button>
                <button
                  onClick={onDeleteRepo}
                  className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/50 rounded-lg transition-colors"
                >
                  删除私有存储库
                </button>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  注意：删除私有存储库将清除所有聊天记录和设置。此操作不可恢复。
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 