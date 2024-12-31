'use client'

import { useState } from 'react'
import { Dialog } from '@headlessui/react'
import { 
  XMarkIcon,
  SunIcon,
  MoonIcon,
  BellIcon,
  LanguageIcon,
  KeyIcon,
  CloudIcon
} from '@heroicons/react/24/outline'

export default function SettingsModal({ isOpen, onClose, session }) {
  const [theme, setTheme] = useState('system') // 'light', 'dark', 'system'
  const [notifications, setNotifications] = useState(true)
  const [language, setLanguage] = useState('zh-CN')
  const [apiKey, setApiKey] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      // 保存设置
      onClose()
    } catch (err) {
      setError('保存设置失败')
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
              设置
            </Dialog.Title>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* 主题设置 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                主题
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setTheme('light')}
                  className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-colors ${
                    theme === 'light'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-800'
                  }`}
                >
                  <SunIcon className={`w-6 h-6 ${
                    theme === 'light' ? 'text-blue-500' : 'text-gray-400'
                  }`} />
                  <span className="text-sm font-medium">浅色</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTheme('dark')}
                  className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-colors ${
                    theme === 'dark'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-800'
                  }`}
                >
                  <MoonIcon className={`w-6 h-6 ${
                    theme === 'dark' ? 'text-blue-500' : 'text-gray-400'
                  }`} />
                  <span className="text-sm font-medium">深色</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTheme('system')}
                  className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-colors ${
                    theme === 'system'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-800'
                  }`}
                >
                  <CloudIcon className={`w-6 h-6 ${
                    theme === 'system' ? 'text-blue-500' : 'text-gray-400'
                  }`} />
                  <span className="text-sm font-medium">跟随系统</span>
                </button>
              </div>
            </div>

            {/* 通知设置 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                通知
              </label>
              <button
                type="button"
                onClick={() => setNotifications(!notifications)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  notifications ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    notifications ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                接收新消息和好友请求的通知
              </p>
            </div>

            {/* 语言设置 */}
            <div>
              <label htmlFor="language" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                语言
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <LanguageIcon className="h-5 w-5 text-gray-400" />
                </div>
                <select
                  id="language"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="block w-full pl-10 rounded-md border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                >
                  <option value="zh-CN">简体中文</option>
                  <option value="en-US">English</option>
                </select>
              </div>
            </div>

            {/* API设置 */}
            <div>
              <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                OpenAI API Key
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <KeyIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="password"
                  id="apiKey"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="block w-full pl-10 rounded-md border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                  placeholder="设置默认的 API Key"
                />
              </div>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                用于AI助手功能，如不设置则需要在创建AI助手时单独设置
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
                保存
              </button>
            </div>
          </form>
        </div>
      </div>
    </Dialog>
  )
} 