'use client'

import { useState, useEffect } from 'react'
import { XMarkIcon, SparklesIcon, FolderIcon } from '@heroicons/react/24/solid'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { useSession } from 'next-auth/react'

export default function CreateRoomModal({ onClose, onCreate }) {
  const { data: session } = useSession()
  const [step, setStep] = useState(1)
  const [roomType, setRoomType] = useState('')
  const [roomName, setRoomName] = useState('')
  const [description, setDescription] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [selectedRepo, setSelectedRepo] = useState('')
  const [repositories, setRepositories] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [aiModel, setAiModel] = useState('gpt-3.5-turbo')
  const [apiKey, setApiKey] = useState('')

  useEffect(() => {
    const loadRepositories = async () => {
      if (!session?.accessToken) return
      try {
        const response = await fetch('https://api.github.com/user/repos?visibility=private', {
          headers: {
            'Authorization': `Bearer ${session.accessToken}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        })
        const data = await response.json()
        setRepositories(data)
      } catch (error) {
        console.error('Error loading repositories:', error)
      }
    }
    loadRepositories()
  }, [session])

  const handleSubmit = async () => {
    if (!roomName.trim()) return

    setIsLoading(true)
    try {
      const roomData = {
        name: roomName.trim(),
        description: description.trim(),
        type: roomType,
        isPrivate,
        repository: selectedRepo,
        ...(roomType === 'ai' && {
          ai_settings: {
            model: aiModel,
            api_key: apiKey
          }
        })
      }
      await onCreate(roomData)
      onClose()
    } catch (error) {
      console.error('Error creating room:', error)
      alert('创建聊天室失败，请重试')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: "spring", duration: 0.3 }}
        className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl max-w-2xl w-full mx-4"
        onClick={e => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-google-sans text-gray-900 dark:text-white">
              {step === 1 ? '选择类型' : step === 2 ? '基本信息' : '选择仓库'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
          {/* 进度指示器 */}
          <div className="flex items-center mt-4 space-x-2">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-1 rounded-full flex-1 transition-colors ${
                  s <= step ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              />
            ))}
          </div>
        </div>

        {/* 内容区域 */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <motion.button
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setRoomType('chat')
                      setStep(2)
                    }}
                    className="flex flex-col items-center gap-4 p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-md transition-all"
                  >
                    <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                      <Image
                        src="/chat-icon.png"
                        alt="Chat"
                        width={32}
                        height={32}
                        className="text-blue-600 dark:text-blue-400"
                      />
                    </div>
                    <div className="text-center">
                      <h3 className="text-lg font-google-sans text-gray-900 dark:text-white">
                        聊天室
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        创建一个普通的聊天室
                      </p>
                    </div>
                  </motion.button>

                  <motion.button
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setRoomType('ai')
                      setStep(2)
                    }}
                    className="flex flex-col items-center gap-4 p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-md transition-all"
                  >
                    <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                      <SparklesIcon className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="text-center">
                      <h3 className="text-lg font-google-sans text-gray-900 dark:text-white">
                        AI 助手
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        创建一个 AI 助手聊天室
                      </p>
                    </div>
                  </motion.button>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      名称
                    </label>
                    <input
                      type="text"
                      value={roomName}
                      onChange={(e) => setRoomName(e.target.value)}
                      className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:text-white transition-all"
                      placeholder={roomType === 'ai' ? '输入 AI 助手名称' : '输入聊天室名称'}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      描述
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:text-white transition-all"
                      placeholder="添加描述（可选）"
                      rows={3}
                    />
                  </div>

                  {roomType === 'ai' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          AI 模型
                        </label>
                        <select
                          value={aiModel}
                          onChange={(e) => setAiModel(e.target.value)}
                          className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:text-white transition-all"
                        >
                          <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                          <option value="gpt-4">GPT-4</option>
                          <option value="claude-2">Claude 2</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          API Key
                        </label>
                        <input
                          type="password"
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                          className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:text-white transition-all"
                          placeholder="输入 API Key"
                        />
                      </div>
                    </>
                  )}

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isPrivate"
                      checked={isPrivate}
                      onChange={(e) => setIsPrivate(e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label
                      htmlFor="isPrivate"
                      className="ml-2 text-sm text-gray-700 dark:text-gray-300"
                    >
                      设为私密
                    </label>
                  </div>
                </div>

                <div className="flex gap-3">
                  <motion.button
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setStep(1)}
                    className="flex-1 py-2 px-4 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
                  >
                    上一步
                  </motion.button>
                  <motion.button
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setStep(3)}
                    disabled={!roomName.trim()}
                    className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    下一步
                  </motion.button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                    选择配置文件存储仓库
                  </label>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {repositories.map(repo => (
                      <motion.button
                        key={repo.id}
                        whileHover={{ y: -1 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setSelectedRepo(repo.full_name)}
                        className={`w-full flex items-center gap-3 p-4 rounded-lg border transition-all ${
                          selectedRepo === repo.full_name
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                            : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
                        }`}
                      >
                        <FolderIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                        <div className="flex-1 text-left">
                          <p className="font-medium text-gray-900 dark:text-white">
                            {repo.name}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {repo.full_name}
                          </p>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3">
                  <motion.button
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setStep(2)}
                    className="flex-1 py-2 px-4 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
                  >
                    上一步
                  </motion.button>
                  <motion.button
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSubmit}
                    disabled={!roomName.trim() || !selectedRepo || isLoading}
                    className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? '创建中...' : '创建'}
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  )
} 