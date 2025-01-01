'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { XMarkIcon, UserGroupIcon, TrashIcon } from '@heroicons/react/24/solid'

export default function ChatRoomSettings({ isOpen, onClose, roomId, onDelete, members = [] }) {
  const { data: session } = useSession();
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  // 检查是否是系统聊天室
  const isSystemRoom = roomId === 'public' || roomId === 'kimi-ai' || roomId === 'system';

  // 处理删除聊天室
  const handleDelete = () => {
    if (isSystemRoom) {
      alert('系统聊天室不能删除');
      return;
    }
    onDelete(roomId);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-md">
        {/* 标题栏 */}
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">聊天室设置</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* 设置内容 */}
        <div className="p-4 space-y-4">
          {/* 聊天室信息 */}
          <div className="space-y-2">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">聊天室信息</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              ID: {roomId}
            </p>
          </div>

          {/* 成员列表 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">聊天室成员</h3>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {members.length} 人
              </span>
            </div>
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-200 dark:divide-gray-700 max-h-60 overflow-y-auto">
              {members.map((member, index) => (
                <div key={index} className="flex items-center space-x-3 p-3">
                  <img
                    src={member.image || '/default-avatar.png'}
                    alt={member.name}
                    className="w-8 h-8 rounded-full"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {member.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      @{member.login}
                    </p>
                  </div>
                </div>
              ))}
              {members.length === 0 && (
                <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                  暂无成员
                </div>
              )}
            </div>
          </div>

          {/* 危险操作区域 */}
          {!isSystemRoom && (
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-red-600 dark:text-red-400 mb-2">
                危险操作
              </h3>
              {!showConfirmDelete ? (
                <button
                  onClick={() => setShowConfirmDelete(true)}
                  className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md"
                >
                  <TrashIcon className="h-5 w-5 mr-2" />
                  删除聊天室
                </button>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    确定要删除这个聊天室吗？此操作不可撤销。
                  </p>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setShowConfirmDelete(false)}
                      className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:text-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-md"
                    >
                      取消
                    </button>
                    <button
                      onClick={handleDelete}
                      className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md"
                    >
                      确认删除
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 