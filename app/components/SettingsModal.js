'use client'

import { useState, useEffect } from 'react'
import { XMarkIcon } from '@heroicons/react/24/solid'
import { useTheme } from 'next-themes'
import { getConfig, updateConfig } from '@/lib/github'

export default function SettingsModal({ isOpen, onClose, session }) {
  const { theme, setTheme } = useTheme()
  const [activeTab, setActiveTab] = useState('general')
  const [generalSettings, setGeneralSettings] = useState({
    autoSaveToGitHub: true,
    saveInterval: 5,
    notificationsEnabled: true
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // 加载设置
  useEffect(() => {
    if (session?.user?.login && session.accessToken) {
      loadSettings()
    }
  }, [session])

  const loadSettings = async () => {
    try {
      setIsLoading(true)
      const config = await getConfig(session.accessToken, session.user.login)
      if (config?.general_settings) {
        setGeneralSettings(prev => ({
          ...prev,
          ...config.general_settings
        }))
      }
    } catch (error) {
      console.error('Error loading settings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // 保存设置
  const saveGeneralSettings = async () => {
    try {
      setIsSaving(true)
      const config = await getConfig(session.accessToken, session.user.login)
      const updatedConfig = {
        ...config,
        general_settings: generalSettings,
        last_updated: new Date().toISOString()
      }
      await updateConfig(session.accessToken, session.user.login, updatedConfig)
      onClose()
    } catch (error) {
      console.error('Error saving settings:', error)
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen) return null

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
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {/* 标签页导航 */}
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

          {/* 设置内容区域 */}
          <div className="flex-1 overflow-y-auto">
            {/* 常规设置 */}
            {activeTab === 'general' && (
              <div className="p-4 space-y-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  常规设置
                </h3>

                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-4">
                  <div>
                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={generalSettings.autoSaveToGitHub}
                        onChange={(e) => setGeneralSettings(prev => ({
                          ...prev,
                          autoSaveToGitHub: e.target.checked
                        }))}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-gray-700 dark:text-gray-300">自动保存聊天记录到 GitHub</span>
                    </label>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 ml-7">
                      开启后将自动将聊天记录保存到您的 GitHub 私人仓库中
                    </p>
                  </div>

                  {generalSettings.autoSaveToGitHub && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        保存间隔（分钟）
                      </label>
                      <input
                        type="number"
                        value={generalSettings.saveInterval}
                        onChange={(e) => setGeneralSettings(prev => ({
                          ...prev,
                          saveInterval: parseInt(e.target.value) || 5
                        }))}
                        min="1"
                        max="60"
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                    </div>
                  )}

                  <div>
                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={generalSettings.notificationsEnabled}
                        onChange={(e) => setGeneralSettings(prev => ({
                          ...prev,
                          notificationsEnabled: e.target.checked
                        }))}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-gray-700 dark:text-gray-300">启用通知提醒</span>
                    </label>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={saveGeneralSettings}
                    disabled={isSaving}
                    className={`px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg ${
                      isSaving ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'
                    }`}
                  >
                    {isSaving ? '保存中...' : '保存设置'}
                  </button>
                </div>
              </div>
            )}

            {/* GitHub 存储设置 */}
            {activeTab === 'github' && (
              <div className="p-4 space-y-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  GitHub 存储设置
                </h3>

                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-base font-medium text-gray-900 dark:text-white">
                        数据存储位置
                      </h4>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        您的聊天记录和设置将存储在 GitHub 私人仓库：
                        <code className="ml-1 px-2 py-1 bg-gray-100 dark:bg-gray-600 rounded">
                          {session?.user?.login}/dock-chat-data
                        </code>
                      </p>
                    </div>

                    <div>
                      <h4 className="text-base font-medium text-gray-900 dark:text-white">
                        数据安全
                      </h4>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        所有数据都存储在您的私人仓库中，只有您能够访问。我们不会在其他地方存储您的数据。
                      </p>
                    </div>

                    <div>
                      <h4 className="text-base font-medium text-gray-900 dark:text-white">
                        数据导出
                      </h4>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        您可以随时通过 GitHub 仓库下载或导出您的所有数据。
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 外观设置 */}
            {activeTab === 'appearance' && (
              <div className="p-4 space-y-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  外观设置
                </h3>

                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      主题设置
                    </label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setTheme('light')}
                        className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg ${
                          theme === 'light'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                            : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                        }`}
                      >
                        浅色
                      </button>
                      <button
                        onClick={() => setTheme('dark')}
                        className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg ${
                          theme === 'dark'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                            : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                        }`}
                      >
                        深色
                      </button>
                      <button
                        onClick={() => setTheme('system')}
                        className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg ${
                          theme === 'system'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                            : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                        }`}
                      >
                        跟随系统
                      </button>
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