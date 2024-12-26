'use client'

import { useState, useEffect } from 'react'
import { getRepositoryStats, createDataRepository, getConfig, updateConfig } from '@/lib/github'

export default function GitHubStorageSettings({ session }) {
  const [repoStats, setRepoStats] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [settings, setSettings] = useState({
    autoSync: true,
    syncInterval: 5,
    maxHistorySize: 100,
    compressOldMessages: true
  })

  useEffect(() => {
    loadSettings()
  }, [session])

  const loadSettings = async () => {
    if (!session?.user?.login || !session.accessToken) return

    try {
      setIsLoading(true)
      const [stats, config] = await Promise.all([
        getRepositoryStats(session.accessToken, session.user.login),
        getConfig(session.accessToken, session.user.login)
      ])

      setRepoStats(stats)

      if (config?.github_settings) {
        setSettings(prev => ({
          ...prev,
          ...config.github_settings
        }))
      }
    } catch (error) {
      console.error('Error loading GitHub settings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    if (!session?.user?.login || !session.accessToken) return

    try {
      setIsSaving(true)
      const config = await getConfig(session.accessToken, session.user.login)
      const updatedConfig = {
        ...config,
        github_settings: settings,
        last_updated: new Date().toISOString()
      }
      await updateConfig(session.accessToken, session.user.login, updatedConfig)
    } catch (error) {
      console.error('Error saving GitHub settings:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCreateRepository = async () => {
    if (!session?.user?.login || !session.accessToken) return

    try {
      setIsLoading(true)
      await createDataRepository(session.accessToken, session.user.login)
      await loadSettings()
    } catch (error) {
      console.error('Error creating repository:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-6">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
        GitHub 存储设置
      </h3>

      {!repoStats ? (
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
            未找到数据存储仓库，需要创建一个新的私有仓库来存储您的聊天记录。
          </p>
          <button
            onClick={handleCreateRepository}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-lg"
          >
            创建数据仓库
          </button>
        </div>
      ) : (
        <>
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-4">
            <div>
              <h4 className="text-base font-medium text-gray-900 dark:text-white mb-2">
                仓库状态
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">仓库大小</p>
                  <p className="text-base font-medium text-gray-900 dark:text-white">
                    {(repoStats.size / 1024).toFixed(2)} MB
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">最后更新</p>
                  <p className="text-base font-medium text-gray-900 dark:text-white">
                    {new Date(repoStats.updated_at).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={settings.autoSync}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      autoSync: e.target.checked
                    }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-gray-700 dark:text-gray-300">自动同步消息</span>
                </label>
              </div>

              {settings.autoSync && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    同步间隔（分钟）
                  </label>
                  <input
                    type="number"
                    value={settings.syncInterval}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      syncInterval: parseInt(e.target.value) || 5
                    }))}
                    min="1"
                    max="60"
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  最大历史记录数量
                </label>
                <input
                  type="number"
                  value={settings.maxHistorySize}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    maxHistorySize: parseInt(e.target.value) || 100
                  }))}
                  min="50"
                  max="1000"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                />
              </div>

              <div>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={settings.compressOldMessages}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      compressOldMessages: e.target.checked
                    }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-gray-700 dark:text-gray-300">压缩旧消息以节省空间</span>
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className={`px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-lg ${
                isSaving ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'
              }`}
            >
              {isSaving ? '保存中...' : '保存设置'}
            </button>
          </div>
        </>
      )}
    </div>
  )
} 