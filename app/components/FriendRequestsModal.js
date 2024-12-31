'use client'

import { useState } from 'react'
import { XMarkIcon, CheckIcon, XCircleIcon } from '@heroicons/react/24/solid'
import Image from 'next/image'

export default function FriendRequestsModal({ onClose, requests, onAccept, onReject }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">好友申请</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          {requests.length === 0 ? (
            <p className="text-center text-gray-500 dark:text-gray-400">暂无好友申请</p>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <Image
                      src={request.user.image || '/default-avatar.png'}
                      alt={request.user.name}
                      width={40}
                      height={40}
                      className="rounded-full"
                    />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {request.user.name}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {request.note || '无验证消息'}
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => onAccept(request.id)}
                      className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/50 rounded-full"
                      title="接受"
                    >
                      <CheckIcon className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => onReject(request.id)}
                      className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/50 rounded-full"
                      title="拒绝"
                    >
                      <XCircleIcon className="w-5 h-5" />
                    </button>
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