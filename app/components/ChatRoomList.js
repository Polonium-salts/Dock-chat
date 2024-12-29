'use client'

import { PlusCircleIcon } from '@heroicons/react/24/solid'

export default function ChatRoomList({ rooms, currentRoom, onSelectRoom, onCreateRoom }) {
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">聊天室</h2>
        <button
          onClick={onCreateRoom}
          className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
        >
          <PlusCircleIcon className="w-6 h-6" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {rooms.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
            <p>还没有聊天室</p>
            <button
              onClick={onCreateRoom}
              className="mt-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              创建聊天室
            </button>
          </div>
        ) : (
          rooms.map(room => (
            <div
              key={room.id}
              onClick={() => onSelectRoom(room)}
              className={`p-3 rounded-lg cursor-pointer ${
                currentRoom?.id === room.id
                  ? 'bg-blue-50 dark:bg-blue-900/50'
                  : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <h3 className="font-medium text-gray-900 dark:text-white">{room.name}</h3>
              {room.description && (
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                  {room.description}
                </p>
              )}
              <div className="mt-2 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <span>{room.type === 'original' ? '原版' : '扩展版'}</span>
                <span>•</span>
                <span>{room.messageCount || 0} 条消息</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
} 