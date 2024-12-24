'use client'

import { useState } from 'react'
import Image from 'next/image'
import { 
  LinkIcon,
  DocumentTextIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline'

export default function ProfilePage({ session }) {
  const [readmeUrl, setReadmeUrl] = useState('')
  const [readmeContent, setReadmeContent] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const importReadme = async (e) => {
    e.preventDefault()
    if (!readmeUrl) return

    setIsLoading(true)
    try {
      // 从 URL 中提取用户名和仓库名
      const match = readmeUrl.match(/github\.com\/([^/]+)(?:\/([^/]+))?/)
      if (!match) {
        throw new Error('无效的 GitHub URL')
      }

      const [, username, repo] = match
      const apiUrl = repo 
        ? `https://api.github.com/repos/${username}/${repo}/readme`
        : `https://api.github.com/users/${username}/readme`

      const response = await fetch(apiUrl)
      if (response.ok) {
        const data = await response.json()
        const content = atob(data.content)
        setReadmeContent(content)
      } else {
        throw new Error('无法获取 README 文件')
      }
    } catch (error) {
      console.error('导入 README 失败:', error)
      alert(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
      {/* 个人信息头部 */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-6">
          {session?.user?.image && (
            <Image
              src={session.user.image}
              alt={session.user.name || '用户头像'}
              width={120}
              height={120}
              className="rounded-full ring-4 ring-white dark:ring-gray-700 shadow-lg"
            />
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {session?.user?.name}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {session?.user?.email}
            </p>
            {session?.user?.login && (
              <a
                href={`https://github.com/${session.user.login}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 mt-3 text-blue-600 dark:text-blue-400 hover:underline"
              >
                <LinkIcon className="w-4 h-4" />
                {session.user.login}
              </a>
            )}
          </div>
        </div>
      </div>

      {/* README 导入区域 */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          导入 GitHub README
        </h2>
        <form onSubmit={importReadme} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              GitHub 链接
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={readmeUrl}
                onChange={(e) => setReadmeUrl(e.target.value)}
                placeholder="例如：https://github.com/username 或 https://github.com/username/repo"
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    导入中...
                  </>
                ) : (
                  <>
                    <ArrowDownTrayIcon className="w-4 h-4" />
                    导入
                  </>
                )}
              </button>
            </div>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              输入 GitHub 用户或仓库链接以导入 README 文件
            </p>
          </div>
        </form>
      </div>

      {/* README 内容显示区域 */}
      <div className="flex-1 p-6 overflow-y-auto">
        {readmeContent ? (
          <div className="prose dark:prose-invert max-w-none">
            <div dangerouslySetInnerHTML={{ __html: readmeContent }} />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <DocumentTextIcon className="w-16 h-16 mb-4" />
            <p>导入 README 文件以显示内容</p>
          </div>
        )}
      </div>
    </div>
  )
} 