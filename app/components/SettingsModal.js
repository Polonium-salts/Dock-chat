'use client'

import { useState, useEffect } from 'react'
import { useTheme } from '../providers/ThemeProvider'
import { MoonIcon, SunIcon } from '@heroicons/react/24/outline'
import { signOut } from 'next-auth/react'
import { getConfig, updateConfig } from '@/lib/github'
import LogoutButton from './LogoutButton'

export default function SettingsModal({ isOpen, onClose, session }) {
  const [activeTab, setActiveTab] = useState('general')
  const { theme, setTheme } = useTheme()
  const [generalSettings, setGeneralSettings] = useState({
    autoSaveToGitHub: false,
    saveInterval: 5,
    notificationsEnabled: true
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

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
    } catch (error) {
      console.error('Error saving settings:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light')
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
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
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
                    className={`px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-lg ${
                      isSaving ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'
                    }`}
                  >
                    {isSaving ? '保存中...' : '保存设置'}
                  </button>
                </div>
              </div>
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
              </div>
            )}
          </div>

          <LogoutButton />
        </div>
      </div>
    </div>
  )
} 