'use client'

import { Fragment, useState } from 'react'
import { Dialog, Transition } from '@headlessui/react'

export default function OnboardingModal({ isOpen, onClose, session }) {
  const [step, setStep] = useState(1)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState('')

  const handleCreateRepository = async () => {
    try {
      setIsCreating(true)
      setError('')

      const response = await fetch('/api/setup/repository', {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('创建数据仓库失败')
      }

      setStep(2)
    } catch (err) {
      console.error('Failed to create repository:', err)
      setError(err.message)
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="fixed inset-0 z-50 overflow-y-auto" onClose={onClose}>
        <div className="min-h-screen px-4 text-center">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <Dialog.Overlay className="fixed inset-0 bg-black bg-opacity-30" />
          </Transition.Child>

          <span className="inline-block h-screen align-middle" aria-hidden="true">&#8203;</span>

          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white dark:bg-gray-800 shadow-xl rounded-2xl">
              <Dialog.Title as="h3" className="text-xl font-semibold text-gray-900 dark:text-white">
                欢迎使用 Dock Chat
              </Dialog.Title>

              {step === 1 && (
                <div className="mt-4 space-y-4">
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
                <div className="mt-4 space-y-4">
                  <p className="text-gray-600 dark:text-gray-300">
                    数据仓库创建成功！现在您可以开始使用 Dock Chat 了。
                  </p>
                  <div className="flex justify-end">
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
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  )
} 