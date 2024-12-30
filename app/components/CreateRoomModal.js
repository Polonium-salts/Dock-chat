'use client'

import { useState, useRef, useEffect } from 'react'
import { XMarkIcon, FolderIcon, CodeBracketIcon } from '@heroicons/react/24/solid'

export default function CreateRoomModal({ onClose, onCreate, session }) {
  const [roomName, setRoomName] = useState('')
  const [roomDescription, setRoomDescription] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [roomType, setRoomType] = useState('basic')
  const [kimiApiKey, setKimiApiKey] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [extensionType, setExtensionType] = useState('')
  const [extensionConfig, setExtensionConfig] = useState({})
  const [sourceCode, setSourceCode] = useState(null)
  const [selectedRepo, setSelectedRepo] = useState('')
  const [customRepo, setCustomRepo] = useState('')
  const [repositories, setRepositories] = useState([])
  const fileInputRef = useRef(null)

  // 加载用户的仓库列表
  const loadRepositories = async () => {
    try {
      const response = await fetch(
        `https://api.github.com/user/repos?type=owner&sort=updated&per_page=100`,
        {
          headers: {
            'Authorization': `Bearer ${session.accessToken}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      )
      const repos = await response.json()
      setRepositories(repos.map(repo => ({
        name: repo.name,
        full_name: repo.full_name,
        private: repo.private
      })))
    } catch (error) {
      console.error('Error loading repositories:', error)
    }
  }

  // 处理源代码文件选择
  const handleFileSelect = (event) => {
    const file = event.target.files[0]
    if (file && file.type === 'application/zip') {
      setSourceCode(file)
    } else {
      alert('请选择 ZIP 格式的源代码文件')
      event.target.value = null
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!roomName.trim()) return
    if (roomType === 'ai' && !kimiApiKey.trim()) {
      alert('请输入 Kimi AI API Key')
      return
    }

    setIsLoading(true)
    try {
      await onCreate({
        name: roomName.trim(),
        description: roomDescription.trim(),
        isPrivate,
        type: roomType,
        extension: roomType === 'ai' ? {
          type: 'kimi_ai',
          api_key: kimiApiKey
        } : null
      })
      onClose()
    } catch (error) {
      console.error('Error creating room:', error)
      alert('创建聊天室失败')
    } finally {
      setIsLoading(false)
    }
  }

  // 在组件加载时获取仓库列表
  useEffect(() => {
    if (session?.accessToken) {
      loadRepositories()
    }
  }, [session])

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            创建聊天室
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              聊天室类型
            </label>
            <select
              value={roomType}
              onChange={(e) => setRoomType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="basic">基础聊天室</option>
              <option value="ai">AI 助手聊天室</option>
              <option value="extended">扩展聊天室</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              聊天室名称 *
            </label>
            <input
              type="text"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="输入聊天室名称"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              描述
            </label>
            <textarea
              value={roomDescription}
              onChange={(e) => setRoomDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="输入聊天室描述"
              rows={3}
            />
          </div>

          {roomType === 'ai' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Kimi AI API Key *
              </label>
              <input
                type="password"
                value={kimiApiKey}
                onChange={(e) => setKimiApiKey(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="输入 Kimi AI API Key"
              />
            </div>
          )}

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
              设为私密聊天室
            </label>
          </div>

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
              disabled={isLoading || !roomName.trim() || (roomType === 'ai' && !kimiApiKey.trim())}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? '创建中...' : '创建'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
} 