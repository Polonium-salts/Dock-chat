'use client'

import { Dialog } from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import GitHubStorageSettings from './GitHubStorageSettings'
import ChatStats from './ChatStats'

export default function SettingsModal({ isOpen, onClose, session }) {
  return (
    <Dialog
      as="div"
      className="fixed inset-0 z-50 overflow-y-auto"
      open={isOpen}
      onClose={onClose}
    >
      <div className="min-h-screen px-4 text-center">
        <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />

        <div className="inline-block w-full max-w-3xl p-6 my-8 text-left align-middle transition-all transform bg-white dark:bg-gray-800 shadow-xl rounded-2xl">
          <div className="flex items-center justify-between mb-6">
            <Dialog.Title
              as="h3"
              className="text-lg font-medium leading-6 text-gray-900 dark:text-white"
            >
              设置
            </Dialog.Title>
            <button
              type="button"
              className="text-gray-400 hover:text-gray-500"
              onClick={onClose}
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="space-y-8">
            {/* GitHub 存储统计 */}
            <div>
              <h4 className="text-base font-medium text-gray-900 dark:text-white mb-4">
                GitHub 存储统计
              </h4>
              <ChatStats />
            </div>

            {/* GitHub 存储设置 */}
            <div>
              <h4 className="text-base font-medium text-gray-900 dark:text-white mb-4">
                GitHub 存储设置
              </h4>
              <GitHubStorageSettings />
            </div>

            {/* 主题设置 */}
            <div>
              <h4 className="text-base font-medium text-gray-900 dark:text-white mb-4">
                主题设置
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <button
                  className="p-4 border rounded-lg text-center hover:bg-gray-50 dark:hover:bg-gray-700"
                  onClick={() => document.documentElement.classList.remove('dark')}
                >
                  浅色主题
                </button>
                <button
                  className="p-4 border rounded-lg text-center hover:bg-gray-50 dark:hover:bg-gray-700"
                  onClick={() => document.documentElement.classList.add('dark')}
                >
                  深色主题
                </button>
              </div>
            </div>

            {/* 账号信息 */}
            <div>
              <h4 className="text-base font-medium text-gray-900 dark:text-white mb-4">
                账号信息
              </h4>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <div className="flex items-center space-x-4">
                  <img
                    src={session?.user?.image}
                    alt={session?.user?.name}
                    className="h-12 w-12 rounded-full"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {session?.user?.name}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {session?.user?.email}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  )
} 