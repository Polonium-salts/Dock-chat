'use client'

import { useState } from 'react'
import { XMarkIcon, UserPlusIcon, HeartIcon } from '@heroicons/react/24/solid'
import Image from 'next/image'

export default function UserProfileModal({ user, onClose, onAddFriend, onFollow, isFriend, isFollowing }) {
  const [note, setNote] = useState('')

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">用户资料</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          <div className="flex items-center space-x-4 mb-4">
            <Image
              src={user.image || '/default-avatar.png'}
              alt={user.name}
              width={80}
              height={80}
              className="rounded-full"
            />
            <div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                {user.name}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                @{user.login}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {user.bio && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  个人简介
                </h4>
                <p className="text-gray-600 dark:text-gray-400">{user.bio}</p>
              </div>
            )}

            <div className="flex space-x-4">
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">关注</span>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {user.following_count || 0}
                </p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">粉丝</span>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {user.followers_count || 0}
                </p>
              </div>
            </div>

            <div className="flex space-x-3">
              {!isFriend && (
                <button
                  onClick={onAddFriend}
                  className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
                >
                  <UserPlusIcon className="w-5 h-5" />
                  添加好友
                </button>
              )}
              <button
                onClick={onFollow}
                className={`flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-md ${
                  isFollowing
                    ? 'text-gray-700 bg-gray-100 hover:bg-gray-200 dark:text-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600'
                    : 'text-white bg-pink-600 hover:bg-pink-700'
                }`}
              >
                <HeartIcon className="w-5 h-5" />
                {isFollowing ? '已关注' : '关注'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 