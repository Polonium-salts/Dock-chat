import { useState, useEffect } from 'react'
import { getRepositoryStats, getConfig, updateConfig } from '@/lib/github'

export default function GitHubStorageSettings({ session }) {
  const [stats, setStats] = useState(null)
  const [config, setConfig] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [settings, setSettings] = useState({
    autoSync: true,
    syncInterval: 5,
    maxHistorySize: 100,
    compressOldMessages: true
  })

  useEffect(() => {
    if (session?.user?.login && session.accessToken) {
      loadSettings()
    }
  }, [session])

  const loadSettings = async () => {
    try {
      setIsLoading(true)
      const [repoStats, globalConfig] = await Promise.all([
        getRepositoryStats(session.accessToken, session.user.login),
        getConfig(session.accessToken, session.user.login)
      ])

      setStats(repoStats)
      setConfig(globalConfig)

      if (globalConfig?.github_settings) {
        setSettings(prev => ({
          ...prev,
          ...globalConfig.github_settings
        }))
      }
    } catch (error) {
      console.error('Error loading GitHub settings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setIsSaving(true)
      const updatedConfig = {
        ...config,
        github_settings: settings,
        last_updated: new Date().toISOString()
      }

      await updateConfig(session.accessToken, session.user.login, updatedConfig)
      setConfig(updatedConfig)
    } catch (error) {
      console.error('Error saving GitHub settings:', error)
    } finally {
      setIsSaving(false)
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
    <div className="space-y-6 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          GitHub 私有数据库设置
        </h3>

        {stats && (
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <p className="text-sm text-gray-500 dark:text-gray-400">仓库大小</p>
              <p className="text-lg font-medium text-gray-900 dark:text-white">
                {(stats.size / 1024).toFixed(2)} MB
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <p className="text-sm text-gray-500 dark:text-gray-400">最后更新</p>
              <p className="text-lg font-medium text-gray-900 dark:text-white">
                {new Date(stats.updated_at).toLocaleString()}
              </p>
            </div>
          </div>
        )}

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

        <div className="mt-6 flex justify-end">
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
      </div>
    </div>
  )
} 