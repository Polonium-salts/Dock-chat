'use client'

import { useState, useEffect } from 'react'
import { signOut } from 'next-auth/react'
import { 
  MoonIcon, 
  SunIcon,
  UserCircleIcon,
  DocumentTextIcon,
  ArrowLeftOnRectangleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import Image from 'next/image'

export default function SettingsModal({ isOpen, onClose, session }) {
  const [theme, setTheme] = useState('light')
  const [activeTab, setActiveTab] = useState('theme')
  const [githubReadme, setGithubReadme] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    // 从 localStorage 获取主题设置
    const savedTheme = localStorage.getItem('theme') || 'light'
    setTheme(savedTheme)
    document.documentElement.classList.toggle('dark', savedTheme === 'dark')
  }, [])

  useEffect(() => {
    if (session?.user?.login) {
      fetchGithubReadme()
    }
  }, [session])

  const fetchGithubReadme = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`https://api.github.com/users/${session.user.login}/readme`)
      if (response.ok) {
        const data = await response.json()
        const decodedContent = atob(data.content)
        setGithubReadme(decodedContent)
      }
    } catch (error) {
      console.error('Failed to fetch GitHub README:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
    document.documentElement.classList.toggle('dark', newTheme === 'dark')
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">设置</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <XMarkIcon className="w-6 h-6 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <div className="flex h-[calc(80vh-4rem)]">
          {/* 侧边栏 */}
          <div className="w-48 border-r border-gray-200 dark:border-gray-700">
            <nav className="p-4 space-y-2">
              <button
                onClick={() => setActiveTab('theme')}
                className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors ${
                  activeTab === 'theme'
                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {theme === 'light' ? (
                  <SunIcon className="w-5 h-5" />
                ) : (
                  <MoonIcon className="w-5 h-5" />
                )}
                <span>主题设置</span>
              </button>
              <button
                onClick={() => setActiveTab('profile')}
                className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors ${
                  activeTab === 'profile'
                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <UserCircleIcon className="w-5 h-5" />
                <span>个人信息</span>
              </button>
              <button
                onClick={() => setActiveTab('github')}
                className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors ${
                  activeTab === 'github'
                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <DocumentTextIcon className="w-5 h-5" />
                <span>GitHub 主页</span>
              </button>
              <button
                onClick={() => signOut()}
                className="w-full flex items-center gap-3 p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/50 rounded-lg transition-colors"
              >
                <ArrowLeftOnRectangleIcon className="w-5 h-5" />
                <span>退出登录</span>
              </button>
            </nav>
          </div>

          {/* 主内容区域 */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'theme' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">主题设置</h3>
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {theme === 'light' ? '浅色模式' : '深色模式'}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      选择您喜欢的主题模式
                    </p>
                  </div>
                  <button
                    onClick={toggleTheme}
                    className="p-2 bg-white dark:bg-gray-600 rounded-lg shadow-sm"
                  >
                    {theme === 'light' ? (
                      <SunIcon className="w-6 h-6 text-yellow-500" />
                    ) : (
                      <MoonIcon className="w-6 h-6 text-blue-500" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'profile' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">个人信息</h3>
                <div className="flex items-center gap-4">
                  {session?.user?.image && (
                    <Image
                      src={session.user.image}
                      alt={session.user.name || '用户头像'}
                      width={80}
                      height={80}
                      className="rounded-full"
                    />
                  )}
                  <div>
                    <p className="text-xl font-medium text-gray-900 dark:text-white">
                      {session?.user?.name}
                    </p>
                    <p className="text-gray-500 dark:text-gray-400">
                      {session?.user?.email}
                    </p>
                  </div>
                </div>
                <div className="grid gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      GitHub 用户名
                    </label>
                    <input
                      type="text"
                      value={session?.user?.login || ''}
                      readOnly
                      className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'github' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">GitHub 主页</h3>
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  </div>
                ) : githubReadme ? (
                  <div className="prose dark:prose-invert max-w-none">
                    <div dangerouslySetInnerHTML={{ __html: githubReadme }} />
                  </div>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400">
                    未找到 GitHub README 文件
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 