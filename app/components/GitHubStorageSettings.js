import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Switch } from '@headlessui/react'
import { toast } from 'react-hot-toast'
import { getConfig, updateConfig } from '@/lib/github'

export default function GitHubStorageSettings() {
  const { data: session } = useSession()
  const [settings, setSettings] = useState({
    autoSavePrivateChats: false,
    excludeGroupChats: true,
    privateChatsOnly: true,
    maxHistorySize: 1000,
    compressOldMessages: true
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (session?.accessToken) {
      loadSettings()
    }
  }, [session])

  const loadSettings = async () => {
    try {
      const config = await getConfig(session.accessToken, session.user.login)
      if (config?.github_settings) {
        setSettings(config.github_settings)
      }
      setLoading(false)
    } catch (error) {
      console.error('Error loading GitHub settings:', error)
      toast.error('加载设置失败')
      setLoading(false)
    }
  }

  const handleSettingChange = async (key, value) => {
    try {
      const newSettings = { ...settings, [key]: value }
      setSettings(newSettings)
      
      await updateConfig(session.accessToken, session.user.login, {
        github_settings: newSettings
      })
      
      toast.success('设置已更新')
    } catch (error) {
      console.error('Error updating settings:', error)
      toast.error('更新设置失败')
      // 回滚设置
      setSettings(settings)
    }
  }

  if (loading) {
    return <div className="p-4">加载中...</div>
  }

  return (
    <div className="p-4 space-y-6">
      <h2 className="text-lg font-semibold">GitHub 存储设置</h2>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium">自动保存私聊记录</h3>
            <p className="text-sm text-gray-500">自动将私聊消息保存到 GitHub 私有仓库</p>
          </div>
          <Switch
            checked={settings.autoSavePrivateChats}
            onChange={(checked) => handleSettingChange('autoSavePrivateChats', checked)}
            className={`${
              settings.autoSavePrivateChats ? 'bg-blue-600' : 'bg-gray-200'
            } relative inline-flex h-6 w-11 items-center rounded-full transition-colors`}
          >
            <span className={`${
              settings.autoSavePrivateChats ? 'translate-x-6' : 'translate-x-1'
            } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />
          </Switch>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium">排除群聊消息</h3>
            <p className="text-sm text-gray-500">不保存群聊消息到 GitHub</p>
          </div>
          <Switch
            checked={settings.excludeGroupChats}
            onChange={(checked) => handleSettingChange('excludeGroupChats', checked)}
            className={`${
              settings.excludeGroupChats ? 'bg-blue-600' : 'bg-gray-200'
            } relative inline-flex h-6 w-11 items-center rounded-full transition-colors`}
          >
            <span className={`${
              settings.excludeGroupChats ? 'translate-x-6' : 'translate-x-1'
            } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />
          </Switch>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium">仅保存私聊和 AI 对话</h3>
            <p className="text-sm text-gray-500">只保存私聊和 AI 对话记录</p>
          </div>
          <Switch
            checked={settings.privateChatsOnly}
            onChange={(checked) => handleSettingChange('privateChatsOnly', checked)}
            className={`${
              settings.privateChatsOnly ? 'bg-blue-600' : 'bg-gray-200'
            } relative inline-flex h-6 w-11 items-center rounded-full transition-colors`}
          >
            <span className={`${
              settings.privateChatsOnly ? 'translate-x-6' : 'translate-x-1'
            } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />
          </Switch>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium">压缩旧消息</h3>
            <p className="text-sm text-gray-500">自动压缩一个月前的消息以节省空间</p>
          </div>
          <Switch
            checked={settings.compressOldMessages}
            onChange={(checked) => handleSettingChange('compressOldMessages', checked)}
            className={`${
              settings.compressOldMessages ? 'bg-blue-600' : 'bg-gray-200'
            } relative inline-flex h-6 w-11 items-center rounded-full transition-colors`}
          >
            <span className={`${
              settings.compressOldMessages ? 'translate-x-6' : 'translate-x-1'
            } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />
          </Switch>
        </div>

        <div className="space-y-2">
          <label className="block font-medium">最大历史记录数量</label>
          <input
            type="number"
            value={settings.maxHistorySize}
            onChange={(e) => handleSettingChange('maxHistorySize', parseInt(e.target.value))}
            min="100"
            max="10000"
            step="100"
            className="w-full px-3 py-2 border rounded-md"
          />
          <p className="text-sm text-gray-500">每个聊天室保存的最大消息数量（100-10000）</p>
        </div>
      </div>
    </div>
  )
} 