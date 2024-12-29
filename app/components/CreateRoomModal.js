'use client'

import { useState, useRef, useEffect } from 'react'
import { XMarkIcon, FolderIcon, CodeBracketIcon } from '@heroicons/react/24/solid'

export default function CreateRoomModal({ onClose, onCreate, session }) {
  const [roomName, setRoomName] = useState('')
  const [roomDescription, setRoomDescription] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [roomType, setRoomType] = useState('basic')
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
    if (roomType === 'extended' && !sourceCode) {
      alert('请选择源代码文件')
      return
    }

    setIsLoading(true)
    try {
      // 如果是扩展聊天室，先上传源代码
      let sourceCodeUrl = null
      if (roomType === 'extended' && sourceCode) {
        const formData = new FormData()
        formData.append('file', sourceCode)
        formData.append('repo', selectedRepo === 'custom' ? customRepo : selectedRepo)
        
        const uploadResponse = await fetch('/api/upload-source-code', {
          method: 'POST',
          body: formData,
          headers: {
            'Authorization': `Bearer ${session.accessToken}`
          }
        })
        
        if (!uploadResponse.ok) {
          throw new Error('源代码上传失败')
        }
        
        const { url } = await uploadResponse.json()
        sourceCodeUrl = url
      }

      await onCreate({
        name: roomName.trim(),
        description: roomDescription.trim(),
        isPrivate,
        type: roomType,
        extension: roomType === 'extended' ? {
          type: extensionType,
          sourceCode: sourceCodeUrl,
          config: extensionConfig,
          repository: selectedRepo === 'custom' ? customRepo : selectedRepo
        } : null
      })
      onClose()
    } catch (error) {
      console.error('Error creating room:', error)
      alert('创建聊天室失败，请重试')
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
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">创建聊天室</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label htmlFor="roomType" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              聊天室类型 *
            </label>
            <select
              id="roomType"
              value={roomType}
              onChange={(e) => {
                setRoomType(e.target.value)
                if (e.target.value === 'basic') {
                  setExtensionType('')
                  setExtensionConfig({})
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="basic">基础聊天室</option>
              <option value="extended">扩展聊天室</option>
            </select>
          </div>

          {roomType === 'extended' && (
            <div>
              <label htmlFor="extensionType" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                扩展类型 *
              </label>
              <select
                id="extensionType"
                value={extensionType}
                onChange={(e) => {
                  setExtensionType(e.target.value)
                  setExtensionConfig({})
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                required={roomType === 'extended'}
              >
                <option value="">选择扩展类型</option>
                <option value="file_sharing">文件共享</option>
                <option value="code_collaboration">代码协作</option>
                <option value="whiteboard">在线白板</option>
                <option value="video_chat">视频聊天</option>
                <option value="game_room">游戏房间</option>
              </select>
            </div>
          )}

          {roomType === 'extended' && extensionType && (
            <div className="space-y-4">
              {extensionType === 'file_sharing' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      最大文件大小 (MB)
                    </label>
                    <input
                      type="number"
                      value={extensionConfig.maxFileSize || ''}
                      onChange={(e) => setExtensionConfig(prev => ({
                        ...prev,
                        maxFileSize: parseInt(e.target.value)
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md"
                      min="1"
                      max="1000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      允许的文件类型
                    </label>
                    <input
                      type="text"
                      value={extensionConfig.allowedTypes || ''}
                      onChange={(e) => setExtensionConfig(prev => ({
                        ...prev,
                        allowedTypes: e.target.value
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md"
                      placeholder="例如: .pdf,.doc,.txt"
                    />
                  </div>
                </>
              )}

              {extensionType === 'code_collaboration' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      支持的编程语言
                    </label>
                    <input
                      type="text"
                      value={extensionConfig.languages || ''}
                      onChange={(e) => setExtensionConfig(prev => ({
                        ...prev,
                        languages: e.target.value
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md"
                      placeholder="例如: javascript,python,java"
                    />
                  </div>
                </>
              )}

              {extensionType === 'game_room' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      游戏类型
                    </label>
                    <select
                      value={extensionConfig.gameType || ''}
                      onChange={(e) => setExtensionConfig(prev => ({
                        ...prev,
                        gameType: e.target.value
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md"
                    >
                      <option value="">选择游戏类型</option>
                      <option value="chess">国际象棋</option>
                      <option value="gobang">五子棋</option>
                      <option value="cards">扑克游戏</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      最大玩家数
                    </label>
                    <input
                      type="number"
                      value={extensionConfig.maxPlayers || ''}
                      onChange={(e) => setExtensionConfig(prev => ({
                        ...prev,
                        maxPlayers: parseInt(e.target.value)
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md"
                      min="2"
                      max="10"
                    />
                  </div>
                </>
              )}
            </div>
          )}

          <div>
            <label htmlFor="roomName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              聊天室名称 *
            </label>
            <input
              type="text"
              id="roomName"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="输入聊天室名称"
              required
            />
          </div>

          <div>
            <label htmlFor="roomDescription" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              描述
            </label>
            <textarea
              id="roomDescription"
              value={roomDescription}
              onChange={(e) => setRoomDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="聊天室描述（可选）"
              rows={3}
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="isPrivate"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="isPrivate" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
              设为私密聊天室
            </label>
          </div>

          {roomType === 'extended' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  源代码文件 (ZIP) *
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept=".zip"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md"
                  >
                    <CodeBracketIcon className="w-5 h-5" />
                    选择文件
                  </button>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {sourceCode ? sourceCode.name : '未选择文件'}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  存储仓库 *
                </label>
                <select
                  value={selectedRepo}
                  onChange={(e) => setSelectedRepo(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white mb-2"
                >
                  <option value="">选择仓库</option>
                  <option value="dock-chat-data">默认数据仓库</option>
                  {repositories.map(repo => (
                    <option key={repo.full_name} value={repo.full_name}>
                      {repo.name} {repo.private ? '(私有)' : '(公开)'}
                    </option>
                  ))}
                  <option value="custom">自定义仓库</option>
                </select>

                {selectedRepo === 'custom' && (
                  <input
                    type="text"
                    value={customRepo}
                    onChange={(e) => setCustomRepo(e.target.value)}
                    placeholder="输入仓库全名 (例如: username/repo)"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                )}
              </div>
            </>
          )}

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
              disabled={
                isLoading || 
                !roomName.trim() || 
                (roomType === 'extended' && (!sourceCode || !selectedRepo)) ||
                (selectedRepo === 'custom' && !customRepo.trim())
              }
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