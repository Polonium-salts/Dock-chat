'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { 
  Cog6ToothIcon,
  KeyIcon,
  TrashIcon,
  ArrowPathIcon,
  FolderIcon,
  UserIcon,
  ArrowLeftOnRectangleIcon,
  InformationCircleIcon,
  BellIcon,
  ShieldCheckIcon,
  DocumentDuplicateIcon,
  LockClosedIcon,
  ChatBubbleLeftRightIcon,
  AdjustmentsHorizontalIcon
} from '@heroicons/react/24/outline'

export default function SettingsPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [settings, setSettings] = useState({
    githubToken: '',
    privateRepo: '',
    theme: 'system',
    language: 'zh-CN',
    notifications: {
      friendRequests: true,
      messages: true,
      updates: true,
      sound: true,
      desktop: false
    },
    privacy: {
      showOnlineStatus: true,
      showLastSeen: true,
      allowFriendRequests: true,
      allowSearchByEmail: false
    },
    data: {
      autoBackup: false,
      backupInterval: 'weekly',
      retentionPeriod: '30days'
    },
    security: {
      twoFactorAuth: false,
      loginNotifications: true,
      sessionTimeout: '30min',
      passwordChangeInterval: '90days'
    },
    messages: {
      messageRetention: '30days',
      readReceipts: true,
      typingIndicator: true,
      messagePreview: true,
      autoDelete: false,
      deleteAfter: '7days'
    },
    advanced: {
      debugMode: false,
      experimentalFeatures: false,
      apiEndpoint: '',
      customTheme: '',
      proxyEnabled: false,
      proxyServer: ''
    }
  })
  const [repoInfo, setRepoInfo] = useState(null)
  const [originalSettings, setOriginalSettings] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [currentTab, setCurrentTab] = useState('general')

  // 加载设置和存储库信息
  useEffect(() => {
    const loadData = async () => {
      if (!session?.user?.login || !session.accessToken) return

      try {
        setIsLoading(true)
        
        // 加载设置
        const settingsResponse = await fetch(
          `https://api.github.com/repos/${session.user.login}/dock-chat-data/contents/settings.json`,
          {
            headers: {
              'Authorization': `Bearer ${session.accessToken}`,
              'Accept': 'application/vnd.github.v3+json'
            }
          }
        )

        if (settingsResponse.ok) {
          const data = await settingsResponse.json()
          const content = JSON.parse(atob(data.content))
          setSettings(content)
          setOriginalSettings(content)

          // 加载存储库信息
          if (content.privateRepo) {
            const repoResponse = await fetch(
              `https://api.github.com/repos/${session.user.login}/${content.privateRepo}`,
              {
                headers: {
                  'Authorization': `Bearer ${session.accessToken}`,
                  'Accept': 'application/vnd.github.v3+json'
                }
              }
            )
            
            if (repoResponse.ok) {
              const repoData = await repoResponse.json()
              setRepoInfo(repoData)
            }
          }
        }
      } catch (error) {
        console.error('Error loading data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
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

  // 处理退出登录
  const handleSignOut = async () => {
    if (confirm('确定要退出登录吗？')) {
      await signOut({ redirect: false })
      router.push('/login')
    }
  }

  // 格式化日期
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // 格式化文件大小
  const formatSize = (bytes) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // 导出用户数据
  const exportUserData = async () => {
    if (!session?.user?.login || !session.accessToken) return

    try {
      setIsSaving(true)
      
      // 获取所有数据
      const [settingsData, messagesData, friendsData] = await Promise.all([
        fetch(`https://api.github.com/repos/${session.user.login}/dock-chat-data/contents/settings.json`),
        fetch(`https://api.github.com/repos/${session.user.login}/dock-chat-data/contents/messages`),
        fetch(`https://api.github.com/repos/${session.user.login}/dock-chat-data/contents/friends.json`)
      ].map(p => p.catch(() => ({ ok: false }))))

      const data = {
        settings: settingsData.ok ? await settingsData.json() : null,
        messages: messagesData.ok ? await messagesData.json() : null,
        friends: friendsData.ok ? await friendsData.json() : null,
        exportDate: new Date().toISOString()
      }

      // 创建并下载文件
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `dock-chat-backup-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      alert('数据导出成功')
    } catch (error) {
      console.error('Error exporting data:', error)
      alert('数据导出失败，请重试')
    } finally {
      setIsSaving(false)
    }
  }

  // 清除所有数据
  const clearAllData = async () => {
    if (!session?.user?.login || !session.accessToken) return
    
    if (!confirm('确定要清除所有数据吗？此操作无法撤销。')) {
      return
    }

    try {
      setIsSaving(true)
      
      // 删除存储库中的所有数据文件
      await Promise.all([
        fetch(`https://api.github.com/repos/${session.user.login}/dock-chat-data/contents/messages`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${session.accessToken}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        }),
        fetch(`https://api.github.com/repos/${session.user.login}/dock-chat-data/contents/friends.json`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${session.accessToken}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        })
      ])

      alert('数据已清除')
      window.location.reload()
    } catch (error) {
      console.error('Error clearing data:', error)
      alert('清除数据失败，请重试')
    } finally {
      setIsSaving(false)
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
              onClick={() => setCurrentTab('account')}
              className={`w-full flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                currentTab === 'account'
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <UserIcon className="w-5 h-5 mr-3" />
              账户管理
            </button>
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
            <button
              onClick={() => setCurrentTab('notifications')}
              className={`w-full flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                currentTab === 'notifications'
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <BellIcon className="w-5 h-5 mr-3" />
              通知设置
            </button>
            <button
              onClick={() => setCurrentTab('privacy')}
              className={`w-full flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                currentTab === 'privacy'
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <ShieldCheckIcon className="w-5 h-5 mr-3" />
              隐私设置
            </button>
            <button
              onClick={() => setCurrentTab('data')}
              className={`w-full flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                currentTab === 'data'
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <DocumentDuplicateIcon className="w-5 h-5 mr-3" />
              数据管理
            </button>
            <button
              onClick={() => setCurrentTab('security')}
              className={`w-full flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                currentTab === 'security'
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <LockClosedIcon className="w-5 h-5 mr-3" />
              安全设置
            </button>
            <button
              onClick={() => setCurrentTab('messages')}
              className={`w-full flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                currentTab === 'messages'
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <ChatBubbleLeftRightIcon className="w-5 h-5 mr-3" />
              消息设置
            </button>
            <button
              onClick={() => setCurrentTab('advanced')}
              className={`w-full flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                currentTab === 'advanced'
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <AdjustmentsHorizontalIcon className="w-5 h-5 mr-3" />
              高级设置
            </button>
          </nav>
        </div>

        {/* 设置内容 */}
        <div className="flex-1 p-6 overflow-y-auto">
          {currentTab === 'account' && (
            <div className="space-y-6">
              {/* 账户信息 */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                <div className="flex items-center">
                  <img
                    src={session?.user?.image}
                    alt={session?.user?.name}
                    className="w-16 h-16 rounded-full"
                  />
                  <div className="ml-4">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                      {session?.user?.name}
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {session?.user?.email}
                    </p>
                  </div>
                </div>

                <div className="mt-6">
                  <button
                    onClick={handleSignOut}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    <ArrowLeftOnRectangleIcon className="w-5 h-5 mr-2" />
                    退出登录
                  </button>
                </div>
              </div>

              {/* GitHub 账户信息 */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  GitHub 账户信息
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      用户名
                    </label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white">
                      {session?.user?.login}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      授权范围
                    </label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white">
                      repo, user
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentTab === 'repository' && (
            <div className="space-y-6">
              {/* 存储库信息 */}
              {repoInfo && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                    存储库信息
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        存储库名称
                      </label>
                      <p className="mt-1 text-sm text-gray-900 dark:text-white">
                        {repoInfo.name}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        创建时间
                      </label>
                      <p className="mt-1 text-sm text-gray-900 dark:text-white">
                        {formatDate(repoInfo.created_at)}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        最后更新
                      </label>
                      <p className="mt-1 text-sm text-gray-900 dark:text-white">
                        {formatDate(repoInfo.updated_at)}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        存储库大小
                      </label>
                      <p className="mt-1 text-sm text-gray-900 dark:text-white">
                        {formatSize(repoInfo.size * 1024)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* 存储库管理 */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
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

                <div className="flex space-x-4 mt-4">
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

              {/* 存储库使用提示 */}
              <div className="bg-blue-50 dark:bg-blue-900 rounded-lg p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <InformationCircleIcon className="h-5 w-5 text-blue-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                      存储库说明
                    </h3>
                    <div className="mt-2 text-sm text-blue-700 dark:text-blue-300">
                      <p>私有存储库用于存储您的：</p>
                      <ul className="list-disc list-inside mt-1">
                        <li>聊天记录</li>
                        <li>好友列表</li>
                        <li>应用设置</li>
                        <li>其他个人数据</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

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

          {currentTab === 'notifications' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  通知设置
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        好友请求通知
                      </label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        当收到新的好友请求时通知我
                      </p>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={settings.notifications.friendRequests}
                        onChange={(e) => handleSettingChange('notifications', {
                          ...settings.notifications,
                          friendRequests: e.target.checked
                        })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        消息通知
                      </label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        当收到新消息时通知我
                      </p>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={settings.notifications.messages}
                        onChange={(e) => handleSettingChange('notifications', {
                          ...settings.notifications,
                          messages: e.target.checked
                        })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        更新通知
                      </label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        当应用有新版本时通知我
                      </p>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={settings.notifications.updates}
                        onChange={(e) => handleSettingChange('notifications', {
                          ...settings.notifications,
                          updates: e.target.checked
                        })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        声音提醒
                      </label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        启用通知声音
                      </p>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={settings.notifications.sound}
                        onChange={(e) => handleSettingChange('notifications', {
                          ...settings.notifications,
                          sound: e.target.checked
                        })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        桌面通知
                      </label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        在桌面显示通知
                      </p>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={settings.notifications.desktop}
                        onChange={(e) => handleSettingChange('notifications', {
                          ...settings.notifications,
                          desktop: e.target.checked
                        })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentTab === 'privacy' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  隐私设置
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        显示在线状态
                      </label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        允许其他用户查看我的在线状态
                      </p>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={settings.privacy.showOnlineStatus}
                        onChange={(e) => handleSettingChange('privacy', {
                          ...settings.privacy,
                          showOnlineStatus: e.target.checked
                        })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        显示最后在线时间
                      </label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        允许其他用户查看我的最后在线时间
                      </p>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={settings.privacy.showLastSeen}
                        onChange={(e) => handleSettingChange('privacy', {
                          ...settings.privacy,
                          showLastSeen: e.target.checked
                        })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        允许好友请求
                      </label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        允许其他用户向我发送好友请求
                      </p>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={settings.privacy.allowFriendRequests}
                        onChange={(e) => handleSettingChange('privacy', {
                          ...settings.privacy,
                          allowFriendRequests: e.target.checked
                        })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        允许通过邮箱搜索
                      </label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        允许其他用户通过邮箱找到我
                      </p>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={settings.privacy.allowSearchByEmail}
                        onChange={(e) => handleSettingChange('privacy', {
                          ...settings.privacy,
                          allowSearchByEmail: e.target.checked
                        })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentTab === 'data' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  数据管理
                </h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        自动备份
                      </label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        定期自动备份聊天记录和设置
                      </p>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={settings.data.autoBackup}
                        onChange={(e) => handleSettingChange('data', {
                          ...settings.data,
                          autoBackup: e.target.checked
                        })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </div>
                  </div>

                  {settings.data.autoBackup && (
                    <>
                      <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          备份频率
                        </label>
                        <select
                          value={settings.data.backupInterval}
                          onChange={(e) => handleSettingChange('data', {
                            ...settings.data,
                            backupInterval: e.target.value
                          })}
                          className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                        >
                          <option value="daily">每天</option>
                          <option value="weekly">每周</option>
                          <option value="monthly">每月</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          保留期限
                        </label>
                        <select
                          value={settings.data.retentionPeriod}
                          onChange={(e) => handleSettingChange('data', {
                            ...settings.data,
                            retentionPeriod: e.target.value
                          })}
                          className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                        >
                          <option value="7days">7天</option>
                          <option value="30days">30天</option>
                          <option value="90days">90天</option>
                          <option value="forever">永久</option>
                        </select>
                      </div>
                    </>
                  )}

                  <div className="pt-4 space-y-4">
                    <button
                      onClick={exportUserData}
                      disabled={isSaving}
                      className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      <DocumentDuplicateIcon className="w-5 h-5 mr-2" />
                      导出所有数据
                    </button>

                    <button
                      onClick={clearAllData}
                      disabled={isSaving}
                      className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                    >
                      <TrashIcon className="w-5 h-5 mr-2" />
                      清除所有数据
                    </button>
                  </div>
                </div>
              </div>

              {/* 数据使用说明 */}
              <div className="bg-blue-50 dark:bg-blue-900 rounded-lg p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <InformationCircleIcon className="h-5 w-5 text-blue-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                      数据说明
                    </h3>
                    <div className="mt-2 text-sm text-blue-700 dark:text-blue-300">
                      <p>导出的数据包含：</p>
                      <ul className="list-disc list-inside mt-1">
                        <li>所有聊天记录</li>
                        <li>好友列表</li>
                        <li>应用设置</li>
                        <li>其他个人数据</li>
                      </ul>
                      <p className="mt-2">
                        注意：清除数据操作无法撤销，请谨慎操作。建议在清除数据前先导出备份。
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentTab === 'security' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  安全设置
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        两步验证
                      </label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        启用两步验证以提高账户安全性
                      </p>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={settings.security.twoFactorAuth}
                        onChange={(e) => handleSettingChange('security', {
                          ...settings.security,
                          twoFactorAuth: e.target.checked
                        })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        登录通知
                      </label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        当有新的登录活动时通知我
                      </p>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={settings.security.loginNotifications}
                        onChange={(e) => handleSettingChange('security', {
                          ...settings.security,
                          loginNotifications: e.target.checked
                        })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      会话超时
                    </label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      设置会话自动超时时间
                    </p>
                    <select
                      value={settings.security.sessionTimeout}
                      onChange={(e) => handleSettingChange('security', {
                        ...settings.security,
                        sessionTimeout: e.target.value
                      })}
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                    >
                      <option value="15min">15分钟</option>
                      <option value="30min">30分钟</option>
                      <option value="1hour">1小时</option>
                      <option value="never">永不</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      密码更改周期
                    </label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      设置定期更改密码的提醒
                    </p>
                    <select
                      value={settings.security.passwordChangeInterval}
                      onChange={(e) => handleSettingChange('security', {
                        ...settings.security,
                        passwordChangeInterval: e.target.value
                      })}
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                    >
                      <option value="30days">30天</option>
                      <option value="60days">60天</option>
                      <option value="90days">90天</option>
                      <option value="never">永不</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentTab === 'messages' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  消息设置
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      消息保留期限
                    </label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      设置消息的保留时间
                    </p>
                    <select
                      value={settings.messages.messageRetention}
                      onChange={(e) => handleSettingChange('messages', {
                        ...settings.messages,
                        messageRetention: e.target.value
                      })}
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                    >
                      <option value="7days">7天</option>
                      <option value="30days">30天</option>
                      <option value="90days">90天</option>
                      <option value="forever">永久</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        已读回执
                      </label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        显示消息的已读状态
                      </p>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={settings.messages.readReceipts}
                        onChange={(e) => handleSettingChange('messages', {
                          ...settings.messages,
                          readReceipts: e.target.checked
                        })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        输入提示
                      </label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        显示对方正在输入的提示
                      </p>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={settings.messages.typingIndicator}
                        onChange={(e) => handleSettingChange('messages', {
                          ...settings.messages,
                          typingIndicator: e.target.checked
                        })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        消息预览
                      </label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        在通知中显示消息内容预览
                      </p>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={settings.messages.messagePreview}
                        onChange={(e) => handleSettingChange('messages', {
                          ...settings.messages,
                          messagePreview: e.target.checked
                        })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        自动删除消息
                      </label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        自动删除旧消息
                      </p>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={settings.messages.autoDelete}
                        onChange={(e) => handleSettingChange('messages', {
                          ...settings.messages,
                          autoDelete: e.target.checked
                        })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </div>
                  </div>

                  {settings.messages.autoDelete && (
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        删除时间
                      </label>
                      <select
                        value={settings.messages.deleteAfter}
                        onChange={(e) => handleSettingChange('messages', {
                          ...settings.messages,
                          deleteAfter: e.target.value
                        })}
                        className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                      >
                        <option value="1day">1天后</option>
                        <option value="7days">7天后</option>
                        <option value="30days">30天后</option>
                        <option value="90days">90天后</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {currentTab === 'advanced' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  高级设置
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        调试模式
                      </label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        启用详细的调试日志
                      </p>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={settings.advanced.debugMode}
                        onChange={(e) => handleSettingChange('advanced', {
                          ...settings.advanced,
                          debugMode: e.target.checked
                        })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        实验性功能
                      </label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        启用实验性功能
                      </p>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={settings.advanced.experimentalFeatures}
                        onChange={(e) => handleSettingChange('advanced', {
                          ...settings.advanced,
                          experimentalFeatures: e.target.checked
                        })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      API 端点
                    </label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      自定义 API 服务器地址
                    </p>
                    <input
                      type="text"
                      value={settings.advanced.apiEndpoint}
                      onChange={(e) => handleSettingChange('advanced', {
                        ...settings.advanced,
                        apiEndpoint: e.target.value
                      })}
                      placeholder="https://api.example.com"
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      自定义主题
                    </label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      自定义 CSS 主题
                    </p>
                    <textarea
                      value={settings.advanced.customTheme}
                      onChange={(e) => handleSettingChange('advanced', {
                        ...settings.advanced,
                        customTheme: e.target.value
                      })}
                      rows={4}
                      placeholder=":root { --primary-color: #3b82f6; }"
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        启用代理
                      </label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        使用代理服务器
                      </p>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={settings.advanced.proxyEnabled}
                        onChange={(e) => handleSettingChange('advanced', {
                          ...settings.advanced,
                          proxyEnabled: e.target.checked
                        })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </div>
                  </div>

                  {settings.advanced.proxyEnabled && (
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        代理服务器
                      </label>
                      <input
                        type="text"
                        value={settings.advanced.proxyServer}
                        onChange={(e) => handleSettingChange('advanced', {
                          ...settings.advanced,
                          proxyServer: e.target.value
                        })}
                        placeholder="http://proxy.example.com:8080"
                        className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* 高级设置警告 */}
              <div className="bg-yellow-50 dark:bg-yellow-900 rounded-lg p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <InformationCircleIcon className="h-5 w-5 text-yellow-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                      注意事项
                    </h3>
                    <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                      <p>修改高级设置可能会影响应用的稳定性和性能。请谨慎操作。</p>
                      <ul className="list-disc list-inside mt-1">
                        <li>调试模式会降低应用性能</li>
                        <li>实验性功能可能不稳定</li>
                        <li>自定义 API 端点需要确保服务器兼容性</li>
                        <li>代理设置可能影响连接速度</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 