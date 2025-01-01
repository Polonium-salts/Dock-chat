'use client'

import { useState } from 'react'
import { 
  Cog6ToothIcon, 
  PaintBrushIcon, 
  BellIcon, 
  ShieldCheckIcon,
  TrashIcon,
  CloudIcon,
  UserIcon,
  PlusCircleIcon
} from '@heroicons/react/24/outline'
import { useTheme } from 'next-themes'
import { signOut } from 'next-auth/react'

export default function SettingsPage({ config, onSave, onDeleteRepo, onCreateRepo }) {
  const { theme, setTheme } = useTheme()
  const [activeTab, setActiveTab] = useState('general')
  const [isSaving, setIsSaving] = useState(false)
  const [settings, setSettings] = useState(config?.settings || {})

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onSave({
        ...config,
        settings: {
          ...settings,
          theme
        }
      })
    } catch (error) {
      console.error('保存设置失败:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteRepo = async () => {
    if (window.confirm('确定要删除所有聊天记录和设置吗？此操作不可恢复。')) {
      try {
        await onDeleteRepo()
      } catch (error) {
        console.error('删除仓库失败:', error)
      }
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut({ callbackUrl: '/' })
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const tabs = [
    { id: 'general', name: '通用', icon: Cog6ToothIcon },
    { id: 'appearance', name: '外观', icon: PaintBrushIcon },
    { id: 'notifications', name: '通知', icon: BellIcon },
    { id: 'privacy', name: '隐私与安全', icon: ShieldCheckIcon },
    { id: 'storage', name: '存储', icon: CloudIcon },
    { id: 'account', name: '账号', icon: UserIcon }
  ]

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-800">
      {/* 顶部标题 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">设置</h1>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {isSaving ? '保存中...' : '保存设置'}
        </button>
      </div>

      <div className="flex-1 flex">
        {/* 左侧导航栏 */}
        <div className="w-64 border-r border-gray-200 dark:border-gray-700">
          <nav className="p-4 space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center px-4 py-2 text-sm font-medium rounded-lg ${
                  activeTab === tab.id
                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400'
                    : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                <tab.icon className="w-5 h-5 mr-3" />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* 右侧设置内容 */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">基本设置</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  配置应用的基本行为
                </p>
                <div className="mt-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        消息提醒
                      </label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        接收新消息时显示通知
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.notifications}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          notifications: e.target.checked
                        }))}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">主题设置</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  自定义应用的外观
                </p>
                <div className="mt-4 space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      颜色主题
                    </label>
                    <select
                      value={theme}
                      onChange={(e) => setTheme(e.target.value)}
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md dark:bg-gray-700 dark:text-white"
                    >
                      <option value="light">浅色</option>
                      <option value="dark">深色</option>
                      <option value="system">跟随系统</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'storage' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">存储管理</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  管理聊天记录和应用数据
                </p>
                <div className="mt-4 space-y-4">
                  <button
                    onClick={onCreateRepo}
                    className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700"
                  >
                    <PlusCircleIcon className="w-5 h-5 mr-2" />
                    创建私有存储库
                  </button>
                  <button
                    onClick={handleDeleteRepo}
                    className="flex items-center px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 dark:text-red-400 dark:bg-red-900/50 dark:hover:bg-red-900"
                  >
                    <TrashIcon className="w-5 h-5 mr-2" />
                    删除所有数据
                  </button>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    此操作将删除所有聊天记录和设置，且不可恢复
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'account' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">账号管理</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  管理你的账号设置
                </p>
                <div className="mt-4 space-y-4">
                  <button
                    onClick={handleSignOut}
                    className="flex items-center px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 dark:text-red-400 dark:bg-red-900/50 dark:hover:bg-red-900"
                  >
                    退出登录
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 