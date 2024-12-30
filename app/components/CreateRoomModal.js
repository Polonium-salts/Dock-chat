'use client'

import { useState } from 'react'
import { XMarkIcon } from '@heroicons/react/24/solid'

export default function CreateRoomModal({ onClose, onCreate }) {
  const [roomName, setRoomName] = useState('')
  const [roomDescription, setRoomDescription] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  
  // 聊天室配置状态
  const [config, setConfig] = useState({
    model: 'gpt-3.5-turbo',
    temperature: 0.7,
    max_tokens: 2000,
    presence_penalty: 0,
    frequency_penalty: 0,
    system_prompt: '',
    auto_title: false,
    auto_summary: false,
    save_interval: 300000,
    history_count: 20
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!roomName.trim()) return

    setIsLoading(true)
    try {
      await onCreate({
        name: roomName.trim(),
        description: roomDescription.trim(),
        isPrivate,
        type: 'room',
        config
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
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4">
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

          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
            >
              {showAdvanced ? '隐藏高级设置' : '显示高级设置'}
            </button>
          </div>

          {showAdvanced && (
            <div className="space-y-4 border rounded-lg p-4">
              <div>
                <label htmlFor="model" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  AI 模型
                </label>
                <select
                  id="model"
                  value={config.model}
                  onChange={(e) => setConfig({ ...config, model: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="gpt-3.5-turbo">GPT-3.5-Turbo</option>
                  <option value="gpt-4">GPT-4</option>
                </select>
              </div>

              <div>
                <label htmlFor="temperature" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  温度 ({config.temperature})
                </label>
                <input
                  type="range"
                  id="temperature"
                  min="0"
                  max="2"
                  step="0.1"
                  value={config.temperature}
                  onChange={(e) => setConfig({ ...config, temperature: parseFloat(e.target.value) })}
                  className="w-full"
                />
              </div>

              <div>
                <label htmlFor="max_tokens" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  最大令牌数
                </label>
                <input
                  type="number"
                  id="max_tokens"
                  value={config.max_tokens}
                  onChange={(e) => setConfig({ ...config, max_tokens: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  min="1"
                  max="4000"
                />
              </div>

              <div>
                <label htmlFor="system_prompt" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  系统提示词
                </label>
                <textarea
                  id="system_prompt"
                  value={config.system_prompt}
                  onChange={(e) => setConfig({ ...config, system_prompt: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="输入系统提示词（可选）"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="presence_penalty" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    存在惩罚 ({config.presence_penalty})
                  </label>
                  <input
                    type="range"
                    id="presence_penalty"
                    min="-2"
                    max="2"
                    step="0.1"
                    value={config.presence_penalty}
                    onChange={(e) => setConfig({ ...config, presence_penalty: parseFloat(e.target.value) })}
                    className="w-full"
                  />
                </div>

                <div>
                  <label htmlFor="frequency_penalty" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    频率惩罚 ({config.frequency_penalty})
                  </label>
                  <input
                    type="range"
                    id="frequency_penalty"
                    min="-2"
                    max="2"
                    step="0.1"
                    value={config.frequency_penalty}
                    onChange={(e) => setConfig({ ...config, frequency_penalty: parseFloat(e.target.value) })}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="auto_title"
                    checked={config.auto_title}
                    onChange={(e) => setConfig({ ...config, auto_title: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="auto_title" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                    自动生成标题
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="auto_summary"
                    checked={config.auto_summary}
                    onChange={(e) => setConfig({ ...config, auto_summary: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="auto_summary" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                    自动生成摘要
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="save_interval" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    保存间隔（毫秒）
                  </label>
                  <input
                    type="number"
                    id="save_interval"
                    value={config.save_interval}
                    onChange={(e) => setConfig({ ...config, save_interval: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    min="1000"
                    step="1000"
                  />
                </div>

                <div>
                  <label htmlFor="history_count" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    历史记录数量
                  </label>
                  <input
                    type="number"
                    id="history_count"
                    value={config.history_count}
                    onChange={(e) => setConfig({ ...config, history_count: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    min="1"
                  />
                </div>
              </div>
            </div>
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
              disabled={isLoading || !roomName.trim()}
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