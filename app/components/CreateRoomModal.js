'use client'

import { useState, useEffect } from 'react'
import { XMarkIcon, SparklesIcon } from '@heroicons/react/24/solid'
import { useSession } from 'next-auth/react'

export default function CreateRoomModal({ onClose, onCreate }) {
  const { data: session } = useSession()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [type, setType] = useState('room') // 'room' 或 'ai'
  const [configRepo, setConfigRepo] = useState('')
  const [repositories, setRepositories] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [aiModel, setAiModel] = useState('gpt-3.5-turbo')
  const [aiApiKey, setAiApiKey] = useState('')

  // 加载用户的仓库列表
  useEffect(() => {
    const loadRepositories = async () => {
      if (!session?.accessToken) return

      try {
        const response = await fetch('https://api.github.com/user/repos?visibility=private&sort=updated', {
          headers: {
            'Authorization': `Bearer ${session.accessToken}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        })
        
        if (response.ok) {
          const repos = await response.json()
          setRepositories(repos.filter(repo => repo.permissions?.push))
          if (repos.length > 0) {
            setConfigRepo(repos[0].full_name)
          }
        }
      } catch (error) {
        console.error('Error loading repositories:', error)
      }
    }

    loadRepositories()
  }, [session])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) return

    setIsLoading(true)
    try {
      await onCreate({
        name: name.trim(),
        description: description.trim(),
        isPrivate,
        type,
        configRepo,
        settings: type === 'ai' ? {
          model: aiModel,
          apiKey: aiApiKey
        } : undefined
      })
      onClose()
    } catch (error) {
      console.error('Error creating room:', error)
      alert('创建聊天室失败，请重试')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            创建{type === 'ai' ? ' AI 助手' : '聊天室'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* 类型选择 */}
          <div className="flex space-x-4">
            <button
              type="button"
              onClick={() => setType('room')}
              className={`flex-1 py-2 px-4 rounded-lg border ${
                type === 'room'
                  ? 'border-blue-500 bg-blue-50 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400'
                  : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              普通聊天室
            </button>
            <button
              type="button"
              onClick={() => setType('ai')}
              className={`flex-1 py-2 px-4 rounded-lg border ${
                type === 'ai'
                  ? 'border-purple-500 bg-purple-50 text-purple-600 dark:bg-purple-900/50 dark:text-purple-400'
                  : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              AI 助手
            </button>
          </div>

          {/* 基本信息 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              名称
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder={type === 'ai' ? 'AI 助手名称' : '聊天室名称'}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              描述
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="添加描述（可选）"
              rows={3}
            />
          </div>

          {/* AI 助手特有设置 */}
          {type === 'ai' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  AI 模型
                </label>
                <select
                  value={aiModel}
                  onChange={(e) => setAiModel(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                  <option value="gpt-4">GPT-4</option>
                  <option value="claude-2">Claude 2</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  API Key
                </label>
                <input
                  type="password"
                  value={aiApiKey}
                  onChange={(e) => setAiApiKey(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white"
                  placeholder="输入 API Key"
                  required={type === 'ai'}
                />
              </div>
            </>
          )}

          {/* 配置仓库选择 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              配置文件存储位置
            </label>
            <select
              value={configRepo}
              onChange={(e) => setConfigRepo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            >
              {repositories.map(repo => (
                <option key={repo.id} value={repo.full_name}>
                  {repo.full_name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              选择用于存储聊天室配置的私有仓库
            </p>
          </div>

          {/* 私密设置 */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isPrivate"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label
              htmlFor="isPrivate"
              className="ml-2 block text-sm text-gray-700 dark:text-gray-300"
            >
              设为私密
            </label>
          </div>

          {/* 提交按钮 */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isLoading || !name.trim() || (type === 'ai' && !aiApiKey)}
              className={`px-4 py-2 text-sm font-medium text-white rounded-md ${
                type === 'ai'
                  ? 'bg-purple-600 hover:bg-purple-700'
                  : 'bg-blue-600 hover:bg-blue-700'
              } disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2`}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  创建中...
                </>
              ) : (
                <>
                  {type === 'ai' && <SparklesIcon className="w-5 h-5" />}
                  创建{type === 'ai' ? ' AI 助手' : '聊天室'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
} 