import { useState } from 'react'
import { createDataRepository } from '@/lib/github'

export default function OnboardingModal({ isOpen, onClose, session }) {
  const [step, setStep] = useState(1)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState(null)

  const handleCreateRepository = async () => {
    try {
      setIsCreating(true)
      setError(null)
      await createDataRepository(session.accessToken, session.user.login)
      setStep(2)
    } catch (error) {
      console.error('Failed to create repository:', error)
      setError('创建数据仓库失败，请稍后重试')
    } finally {
      setIsCreating(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          欢迎使用 Dock Chat
        </h2>

        {step === 1 && (
          <div className="space-y-4">
            <p className="text-gray-600 dark:text-gray-300">
              为了更好地为您服务，我们需要在您的 GitHub 账户中创建一个私有仓库来存储您的个人数据。
              这些数据包括：
            </p>
            <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-2">
              <li>聊天室配置</li>
              <li>个人设置</li>
              <li>AI 助手配置</li>
              <li>其他自定义数据</li>
            </ul>
            {error && (
              <p className="text-red-500 dark:text-red-400 text-sm">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg"
              >
                稍后设置
              </button>
              <button
                onClick={handleCreateRepository}
                disabled={isCreating}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isCreating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    创建中...
                  </>
                ) : (
                  '创建数据仓库'
                )}
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <p className="text-gray-600 dark:text-gray-300">
              太好了！数据仓库已经创建成功。现在您可以：
            </p>
            <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-2">
              <li>创建和加入聊天室</li>
              <li>使用 AI 助手</li>
              <li>自定义个人设置</li>
              <li>所有数据都将安全地存储在您的私有仓库中</li>
            </ul>
            <div className="flex justify-end mt-6">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-lg"
              >
                开始使用
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 