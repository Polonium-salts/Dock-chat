'use client'

import { useState } from 'react'

export default function CreateRoomModal({ onClose, onCreate }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [type, setType] = useState('basic') // 'basic' 或 'extended'
  const [extensionType, setExtensionType] = useState('') // 扩展类型
  const [extensionConfig, setExtensionConfig] = useState({}) // 扩展配置

  const handleSubmit = (e) => {
    e.preventDefault()
    onCreate({
      name,
      description,
      isPrivate,
      type,
      extensionType,
      extensionConfig
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">创建聊天室</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 聊天室类型选择 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              聊天室类型
            </label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="basic"
                  checked={type === 'basic'}
                  onChange={(e) => setType(e.target.value)}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">基础聊天室</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="extended"
                  checked={type === 'extended'}
                  onChange={(e) => setType(e.target.value)}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">扩展聊天室</span>
              </label>
            </div>
          </div>

          {/* 基本信息 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              聊天室名称
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="输入聊天室名称"
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
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="输入聊天室描述"
              rows={3}
            />
          </div>

          {/* 扩展类型选择 */}
          {type === 'extended' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                扩展类型
              </label>
              <select
                value={extensionType}
                onChange={(e) => setExtensionType(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required={type === 'extended'}
              >
                <option value="">选择扩展类型</option>
                <option value="file_sharing">文件共享</option>
                <option value="code_collaboration">代码协作</option>
                <option value="whiteboard">在线白板</option>
                <option value="video_chat">视频聊天</option>
              </select>
            </div>
          )}

          {/* 扩展配置 */}
          {type === 'extended' && extensionType && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                扩展配置
              </label>
              {extensionType === 'file_sharing' && (
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={extensionConfig.allowImages}
                      onChange={(e) => setExtensionConfig(prev => ({
                        ...prev,
                        allowImages: e.target.checked
                      }))}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">允许图片</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={extensionConfig.allowDocuments}
                      onChange={(e) => setExtensionConfig(prev => ({
                        ...prev,
                        allowDocuments: e.target.checked
                      }))}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">允许文档</span>
                  </label>
                </div>
              )}
              {extensionType === 'code_collaboration' && (
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={extensionConfig.enableSyntaxHighlight}
                      onChange={(e) => setExtensionConfig(prev => ({
                        ...prev,
                        enableSyntaxHighlight: e.target.checked
                      }))}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">启用语法高亮</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={extensionConfig.enableLiveCollab}
                      onChange={(e) => setExtensionConfig(prev => ({
                        ...prev,
                        enableLiveCollab: e.target.checked
                      }))}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">启用实时协作</span>
                  </label>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center">
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="mr-2"
            />
            <label className="text-sm text-gray-700 dark:text-gray-300">
              设为私密聊天室
            </label>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-lg"
            >
              创建
            </button>
          </div>
        </form>
      </div>
    </div>
  )
} 