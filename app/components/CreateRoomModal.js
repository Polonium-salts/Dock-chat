'use client'

import { useState, useEffect } from 'react'
import { Dialog } from '@headlessui/react'
import { 
  XMarkIcon, 
  ChatBubbleLeftRightIcon,
  SparklesIcon,
  LockClosedIcon,
  FolderIcon,
  KeyIcon
} from '@heroicons/react/24/outline'

export default function CreateRoomModal({ isOpen, onClose, onCreate, session }) {
  const [type, setType] = useState('chat') // 'chat' or 'ai'
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [aiModel, setAiModel] = useState('gpt-3.5-turbo')
  const [apiKey, setApiKey] = useState('')
  const [selectedRepo, setSelectedRepo] = useState('')
  const [repos, setRepos] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen && session) {
      loadUserRepos()
    }
  }, [isOpen, session])

  const loadUserRepos = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`https://api.github.com/user/repos?type=private`, {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          Accept: 'application/vnd.github.v3+json'
        }
      })
      const data = await response.json()
      setRepos(data.filter(repo => repo.permissions?.push))
    } catch (err) {
      console.error('Failed to load repos:', err)
      setError('加载仓库列表失败')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('请输入聊天室名称')
      return
    }
    if (!selectedRepo) {
      setError('请选择配置文件存储仓库')
      return
    }
    if (type === 'ai' && !apiKey) {
      setError('请输入 API Key')
      return
    }

    const roomData = {
      type,
      name: name.trim(),
      description: description.trim(),
      isPrivate,
      configRepo: selectedRepo,
      ...(type === 'ai' && {
        aiSettings: {
          model: aiModel,
          apiKey
        }
      })
    }

    try {
      await onCreate(roomData)
      onClose()
      resetForm()
    } catch (err) {
      setError('创建聊天室失败')
    }
  }

  const resetForm = () => {
    setType('chat')
    setName('')
    setDescription('')
    setIsPrivate(false)
    setAiModel('gpt-3.5-turbo')
    setApiKey('')
    setSelectedRepo('')
    setError('')
  }

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      className="fixed inset-0 z-50 overflow-y-auto"
    >
      <div className="flex min-h-screen items-center justify-center p-4">
        <Dialog.Overlay className="fixed inset-0 bg-black/30" />

        <div className="relative w-full max-w-2xl bg-white dark:bg-gray-800 rounded-2xl shadow-xl">
          {/* 标题栏 */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <Dialog.Title className="text-xl font-semibold text-gray-900 dark:text-white">
              创建聊天室
            </Dialog.Title>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* 类型选择 */}
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setType('chat')}
                className={`flex flex-col items-center gap-3 p-4 rounded-lg border-2 transition-colors ${
                  type === 'chat'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-800'
                }`}
              >
                <ChatBubbleLeftRightIcon className={`w-8 h-8 ${
                  type === 'chat' ? 'text-blue-500' : 'text-gray-400'
                }`} />
                <span className={`font-medium ${
                  type === 'chat' ? 'text-blue-700 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'
                }`}>
                  普通聊天室
                </span>
              </button>
              <button
                type="button"
                onClick={() => setType('ai')}
                className={`flex flex-col items-center gap-3 p-4 rounded-lg border-2 transition-colors ${
                  type === 'ai'
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-purple-200 dark:hover:border-purple-800'
                }`}
              >
                <SparklesIcon className={`w-8 h-8 ${
                  type === 'ai' ? 'text-purple-500' : 'text-gray-400'
                }`} />
                <span className={`font-medium ${
                  type === 'ai' ? 'text-purple-700 dark:text-purple-400' : 'text-gray-700 dark:text-gray-300'
                }`}>
                  AI 助手
                </span>
              </button>
            </div>

            {/* 基本信息 */}
            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  聊天室名称
                </label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                  placeholder="输入聊天室名称"
                />
              </div>
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  描述
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                  placeholder="输入聊天室描述（可选）"
                />
              </div>
            </div>

            {/* AI 设置 */}
            {type === 'ai' && (
              <div className="space-y-4">
                <div>
                  <label htmlFor="model" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    AI 模型
                  </label>
                  <select
                    id="model"
                    value={aiModel}
                    onChange={(e) => setAiModel(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                  >
                    <option value="gpt-3.5-turbo">GPT-3.5-Turbo</option>
                    <option value="gpt-4">GPT-4</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    API Key
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <KeyIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="password"
                      id="apiKey"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="block w-full pl-10 rounded-md border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                      placeholder="输入 OpenAI API Key"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 仓库选择 */}
            <div>
              <label htmlFor="repo" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                配置文件存储仓库
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FolderIcon className="h-5 w-5 text-gray-400" />
                </div>
                <select
                  id="repo"
                  value={selectedRepo}
                  onChange={(e) => setSelectedRepo(e.target.value)}
                  className="block w-full pl-10 rounded-md border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                  disabled={isLoading}
                >
                  <option value="">选择仓库</option>
                  {repos.map(repo => (
                    <option key={repo.id} value={repo.full_name}>
                      {repo.full_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 隐私设置 */}
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => setIsPrivate(!isPrivate)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  isPrivate ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    isPrivate ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
              <span className="ml-3 flex items-center gap-2">
                <LockClosedIcon className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-700 dark:text-gray-300">私密聊天室</span>
              </span>
            </div>

            {/* 错误提示 */}
            {error && (
              <div className="text-sm text-red-600 dark:text-red-400">
                {error}
              </div>
            )}

            {/* 操作按钮 */}
            <div className="flex justify-end gap-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
              >
                取消
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
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