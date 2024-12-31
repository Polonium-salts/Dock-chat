'use client'

import { useState, useEffect } from 'react'
import { Dialog } from '@headlessui/react'
import { 
  XMarkIcon,
  LockClosedIcon,
  LockOpenIcon,
  MagnifyingGlassIcon,
  ChatBubbleLeftEllipsisIcon,
  SparklesIcon,
  FolderIcon
} from '@heroicons/react/24/outline'
import { useSession } from 'next-auth/react'
import { useDebounce } from 'use-debounce'

export default function CreateRoomModal({ isOpen, onClose, onCreate }) {
  const { data: session } = useSession()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [enableAI, setEnableAI] = useState(false)
  const [repoSearch, setRepoSearch] = useState('')
  const [debouncedRepoSearch] = useDebounce(repoSearch, 500)
  const [repositories, setRepositories] = useState([])
  const [selectedRepo, setSelectedRepo] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  // 搜索用户的仓库
  useEffect(() => {
    if (!debouncedRepoSearch || !session?.accessToken) return

    const searchRepositories = async () => {
      setIsLoading(true)
      setError('')
      try {
        const response = await fetch(
          `https://api.github.com/search/repositories?q=user:${session.user.login}+${debouncedRepoSearch}`,
          {
            headers: {
              Authorization: `Bearer ${session.accessToken}`,
              Accept: 'application/vnd.github.v3+json',
            },
          }
        )
        if (!response.ok) throw new Error('Failed to fetch repositories')
        const data = await response.json()
        setRepositories(data.items || [])
      } catch (err) {
        setError('获取仓库列表失败')
        console.error(err)
      } finally {
        setIsLoading(false)
      }
    }

    searchRepositories()
  }, [debouncedRepoSearch, session])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('请输入聊天室名称')
      return
    }

    try {
      await onCreate({
        name: name.trim(),
        description: description.trim(),
        isPrivate,
        enableAI,
        configRepo: selectedRepo ? {
          id: selectedRepo.id,
          name: selectedRepo.name,
          full_name: selectedRepo.full_name,
          private: selectedRepo.private
        } : null
      })
      onClose()
      // 重置表单
      setName('')
      setDescription('')
      setIsPrivate(false)
      setEnableAI(false)
      setSelectedRepo(null)
      setError('')
    } catch (err) {
      setError('创建聊天室失败')
      console.error(err)
    }
  }

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      className="fixed inset-0 z-50 overflow-y-auto"
    >
      <div className="flex min-h-screen items-center justify-center p-4">
        <Dialog.Overlay className="fixed inset-0 bg-black/30" />

        <div className="relative w-full max-w-2xl rounded-2xl bg-white dark:bg-gray-800 shadow-xl">
          {/* 标题栏 */}
          <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-6 py-4">
            <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white">
              创建聊天室
            </Dialog.Title>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* 表单内容 */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* 基本信息 */}
            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  聊天室名称
                </label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="输入聊天室名称"
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  描述
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="描述这个聊天室的用途"
                />
              </div>
            </div>

            {/* 设置选项 */}
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="flex items-center gap-3">
                  {isPrivate ? (
                    <LockClosedIcon className="h-5 w-5 text-yellow-500" />
                  ) : (
                    <LockOpenIcon className="h-5 w-5 text-green-500" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {isPrivate ? '私密聊天室' : '公开聊天室'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {isPrivate ? '仅邀请的成员可以加入' : '任何人都可以加入'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPrivate(!isPrivate)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    isPrivate ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      isPrivate ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <SparklesIcon className="h-5 w-5 text-purple-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      AI 助手
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      启用 AI 助手来协助对话
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEnableAI(!enableAI)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    enableAI ? 'bg-purple-500' : 'bg-gray-200 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      enableAI ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* 仓库选择 */}
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                配置文件存储仓库
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={repoSearch}
                  onChange={(e) => setRepoSearch(e.target.value)}
                  className="w-full px-4 py-2 pl-10 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="搜索你的仓库..."
                />
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              </div>

              {isLoading ? (
                <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                  加载中...
                </div>
              ) : repositories.length > 0 ? (
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {repositories.map((repo) => (
                    <button
                      key={repo.id}
                      type="button"
                      onClick={() => setSelectedRepo(repo)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                        selectedRepo?.id === repo.id
                          ? 'bg-blue-50 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                      }`}
                    >
                      <FolderIcon className="h-5 w-5" />
                      <div className="flex-1 text-left">
                        <p className="text-sm font-medium">{repo.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {repo.private ? '私有' : '公开'} · 更新于 {new Date(repo.updated_at).toLocaleDateString()}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : repoSearch && !isLoading ? (
                <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                  未找到相关仓库
                </div>
              ) : null}

              {selectedRepo && (
                <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/50 rounded-lg">
                  <FolderIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                      已选择: {selectedRepo.name}
                    </p>
                    <p className="text-xs text-blue-500 dark:text-blue-300">
                      {selectedRepo.full_name}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedRepo(null)}
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
              )}
            </div>

            {error && (
              <div className="text-sm text-red-600 dark:text-red-400">
                {error}
              </div>
            )}

            {/* 操作按钮 */}
            <div className="flex justify-end gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                创建
              </button>
            </div>
          </form>
        </div>
      </div>
    </Dialog>
  )
} 