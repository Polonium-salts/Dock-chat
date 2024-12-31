'use client'

import { XMarkIcon, CheckIcon, XCircleIcon } from '@heroicons/react/24/outline'
import Image from 'next/image'

export default function FriendRequestsModal({ isOpen, onClose, requests, onAccept, onReject }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">好友请求</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          {requests.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">暂无好友请求</p>
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-start space-x-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                >
                  <Image
                    src={request.user?.image || '/default-avatar.png'}
                    alt={request.user?.name || request.from}
                    width={40}
                    height={40}
                    className="rounded-full"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {request.user?.name || request.from}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(request.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {request.note}
                    </p>
                    <div className="mt-3 flex items-center space-x-2">
                      <button
                        onClick={() => onAccept(request.id)}
                        className="flex items-center px-3 py-1 text-sm font-medium text-green-700 bg-green-100 hover:bg-green-200 dark:text-green-400 dark:bg-green-900/50 dark:hover:bg-green-900 rounded-md transition-colors"
                      >
                        <CheckIcon className="w-4 h-4 mr-1" />
                        接受
                      </button>
                      <button
                        onClick={() => onReject(request.id)}
                        className="flex items-center px-3 py-1 text-sm font-medium text-red-700 bg-red-100 hover:bg-red-200 dark:text-red-400 dark:bg-red-900/50 dark:hover:bg-red-900 rounded-md transition-colors"
                      >
                        <XCircleIcon className="w-4 h-4 mr-1" />
                        拒绝
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 