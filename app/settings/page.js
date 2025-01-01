'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { 
  Cog6ToothIcon,
  KeyIcon,
  TrashIcon,
  ArrowPathIcon,
  FolderIcon
} from '@heroicons/react/24/outline'

export default function SettingsPage() {
  const { data: session } = useSession()
  const [settings, setSettings] = useState({
    githubToken: '',
    privateRepo: '',
    theme: 'system',
    language: 'zh-CN'
  })
  const [originalSettings, setOriginalSettings] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [currentTab, setCurrentTab] = useState('general')

  // 加载设置
  useEffect(() => {
    const loadSettings = async () => {
      if (!session?.user?.login || !session.accessToken) return

      try {
        setIsLoading(true)
        const response = await fetch(
          `https://api.github.com/repos/${session.user.login}/dock-chat-data/contents/settings.json`,
          {
            headers: {
              'Authorization': `Bearer ${session.accessToken}`,
              'Accept': 'application/vnd.github.v3+json'
            }
          }
        )

        if (response.ok) {
          const data = await response.json()
          const content = JSON.parse(atob(data.content))
          setSettings(content)
          setOriginalSettings(content) // 保存原始设置用于比较
        }
      } catch (error) {
        console.error('Error loading settings:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadSettings()
  }, [session])

  // 检查设置是否有变化
  useEffect(() => {
    if (!originalSettings) return

    const hasSettingsChanged = JSON.stringify(settings) !== JSON.stringify(originalSettings)
    setHasChanges(hasSettingsChanged)
  }, [settings, originalSettings])

  // 处理设置变更
  const handleSettingChange = useCallback((key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }))
  }, [])

  // 保存设置
  const saveSettings = async () => {
    if (!session?.user?.login || !session.accessToken) return
    if (!hasChanges) return // 如果没有变化，不进行保存

    try {
      setIsSaving(true)
      const content = JSON.stringify(settings, null, 2)
      const encodedContent = btoa(unescape(encodeURIComponent(content)))

      // 获取文件的 SHA
      const fileResponse = await fetch(
        `https://api.github.com/repos/${session.user.login}/dock-chat-data/contents/settings.json`,
        {
          headers: {
            'Authorization': `Bearer ${session.accessToken}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      )

      let sha = ''
      if (fileResponse.ok) {
        const fileData = await fileResponse.json()
        sha = fileData.sha
      }

      // 保存设置
      const response = await fetch(
        `https://api.github.com/repos/${session.user.login}/dock-chat-data/contents/settings.json`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${session.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: 'Update settings',
            content: encodedContent,
            sha: sha
          })
        }
      )

      if (response.ok) {
        setOriginalSettings(settings) // 更新原始设置
        setHasChanges(false)
        alert('设置已保存')
      } else {
        throw new Error('Failed to save settings')
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      alert('保存设置失败,请重试')
    } finally {
      setIsSaving(false)
    }
  }

  // 删除私有存储库
  const deletePrivateRepo = async () => {
    if (!session?.user?.login || !session.accessToken || !settings.privateRepo) return

    if (!confirm('确定要删除私有存储库吗？这将删除所有聊天记录和设置。')) {
      return
    }

    try {
      setIsSaving(true)
      await fetch(
        `https://api.github.com/repos/${session.user.login}/${settings.privateRepo}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${session.accessToken}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      )

      const newSettings = { ...settings, privateRepo: '' }
      setSettings(newSettings)
      setOriginalSettings(newSettings)
      setHasChanges(false)
      alert('私有存储库已删除')
    } catch (error) {
      console.error('Error deleting private repo:', error)
      alert('删除私有存储库失败,请重试')
    } finally {
      setIsSaving(false)
    }
  }

  // 重新创建私有存储库
  const recreatePrivateRepo = async () => {
    if (!session?.user?.login || !session.accessToken) return

    try {
      setIsSaving(true)
      const repoName = 'dock-chat-data'
      
      // 创建私有仓库
      await fetch('https://api.github.com/user/repos', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: repoName,
          private: true,
          auto_init: true
        })
      })

      // 更新设置
      const newSettings = { ...settings, privateRepo: repoName }
      setSettings(newSettings)
      setOriginalSettings(newSettings)
      setHasChanges(false)
      alert('私有存储库已创建')
    } catch (error) {
      console.error('Error creating private repo:', error)
      alert('创建私有存储库失败,请重试')
    } finally {
      setIsSaving(false)
    }
  }

  // 放弃更改
  const discardChanges = () => {
    if (originalSettings) {
      setSettings(originalSettings)
      setHasChanges(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* 顶部栏 */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">设置</h1>
        {hasChanges && (
          <div className="flex items-center space-x-4">
            <button
              onClick={discardChanges}
              className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            >
              放弃更改
            </button>
            <button
              onClick={saveSettings}
              disabled={isSaving}
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isSaving ? '保存中...' : '保存更改'}
            </button>
          </div>
        )}
      </div>

      {/* 主要内容区域 */}
      <div className="flex h-[calc(100vh-4rem)]">
        {/* 侧边栏 */}
        <div className="w-64 border-r border-gray-200 dark:border-gray-700">
          <nav className="p-4 space-y-2">
            <button
              onClick={() => setCurrentTab('general')}
              className={`w-full flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                currentTab === 'general'
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <Cog6ToothIcon className="w-5 h-5 mr-3" />
              基本设置
            </button>
            <button
              onClick={() => setCurrentTab('repository')}
              className={`w-full flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                currentTab === 'repository'
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <FolderIcon className="w-5 h-5 mr-3" />
              存储库管理
            </button>
            <button
              onClick={() => setCurrentTab('appearance')}
              className={`w-full flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                currentTab === 'appearance'
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <KeyIcon className="w-5 h-5 mr-3" />
              外观设置
            </button>
          </nav>
        </div>

        {/* 设置内容 */}
        <div className="flex-1 p-6">
          {currentTab === 'general' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  GitHub 访问令牌
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  用于访问 GitHub API 的个人访问令牌
                </p>
                <div className="mt-2">
                  <input
                    type="password"
                    value={settings.githubToken}
                    onChange={(e) => handleSettingChange('githubToken', e.target.value)}
                    className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                  />
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  语言设置
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  选择界面显示语言
                </p>
                <div className="mt-2">
                  <select
                    value={settings.language}
                    onChange={(e) => handleSettingChange('language', e.target.value)}
                    className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                  >
                    <option value="zh-CN">简体中文</option>
                    <option value="en-US">English</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {currentTab === 'repository' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  私有存储库
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  用于存储聊天记录和设置的私有 GitHub 仓库
                </p>
                <div className="mt-2">
                  <input
                    type="text"
                    value={settings.privateRepo}
                    readOnly
                    className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                  />
                </div>
              </div>

              <div className="flex space-x-4">
                <button
                  onClick={recreatePrivateRepo}
                  disabled={isSaving}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  <ArrowPathIcon className="w-5 h-5 mr-2" />
                  重新创建
                </button>
                <button
                  onClick={deletePrivateRepo}
                  disabled={isSaving || !settings.privateRepo}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                >
                  <TrashIcon className="w-5 h-5 mr-2" />
                  删除存储库
                </button>
              </div>
            </div>
          )}

          {currentTab === 'appearance' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  主题设置
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  选择界面主题
                </p>
                <div className="mt-2">
                  <select
                    value={settings.theme}
                    onChange={(e) => handleSettingChange('theme', e.target.value)}
                    className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                  >
                    <option value="system">跟随系统</option>
                    <option value="light">浅色主题</option>
                    <option value="dark">深色主题</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 