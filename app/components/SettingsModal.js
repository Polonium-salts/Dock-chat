'use client'

import { useState } from 'react'
import { useTheme } from '../providers/ThemeProvider'
import { MoonIcon, SunIcon } from '@heroicons/react/24/outline'
import GitHubStorageSettings from './GitHubStorageSettings'

export default function SettingsModal({ isOpen, onClose, session }) {
  const [activeTab, setActiveTab] = useState('general')
  const { theme, setTheme } = useTheme()

  if (!isOpen) return null

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light')
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">设置</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveTab('general')}
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === 'general'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              常规
            </button>
            <button
              onClick={() => setActiveTab('github')}
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === 'github'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              GitHub 存储
            </button>
            <button
              onClick={() => setActiveTab('appearance')}
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === 'appearance'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              外观
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {activeTab === 'general' && (
              <div className="p-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  常规设置
                </h3>
                {/* 添加常规设置选项 */}
              </div>
            )}

            {activeTab === 'github' && (
              <GitHubStorageSettings session={session} />
            )}

            {activeTab === 'appearance' && (
              <div className="p-4 space-y-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  外观设置
                </h3>
                
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-base font-medium text-gray-900 dark:text-white">
                        {theme === 'light' ? '浅色模式' : '深色模式'}
                      </h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        选择您喜欢的主题模式
                      </p>
                    </div>
                    <button
                      onClick={toggleTheme}
                      className="p-2 bg-white dark:bg-gray-600 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-500 transition-colors"
                    >
                      {theme === 'light' ? (
                        <SunIcon className="w-6 h-6 text-yellow-500" />
                      ) : (
                        <MoonIcon className="w-6 h-6 text-blue-500" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <h4 className="text-base font-medium text-gray-900 dark:text-white mb-2">
                    字体设置
                  </h4>
                  <div className="space-y-2">
                    <div>
                      <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">
                        字体大小
                      </label>
                      <select className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-600 dark:border-gray-500">
                        <option value="small">小</option>
                        <option value="medium">中</option>
                        <option value="large">大</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 