'use client'

import { useState } from 'react'
import { PlusIcon, PencilIcon, TrashIcon, FolderIcon, UserGroupIcon } from '@heroicons/react/24/outline'
import Image from 'next/image'

export default function FriendGroups({ friends, groups, onCreateGroup, onEditGroup, onDeleteGroup, onMoveFriend, onEditFriend, onDeleteFriend }) {
  const [selectedGroup, setSelectedGroup] = useState('all')
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [editingGroup, setEditingGroup] = useState(null)
  const [showFriendActions, setShowFriendActions] = useState(null)

  // 处理创建分组
  const handleCreateGroup = (e) => {
    e.preventDefault()
    if (!newGroupName.trim()) return
    
    onCreateGroup({
      id: `group-${Date.now()}`,
      name: newGroupName.trim()
    })
    
    setNewGroupName('')
    setShowCreateGroup(false)
  }

  // 处理编辑分组
  const handleEditGroup = (group) => {
    if (editingGroup?.id === group.id) {
      onEditGroup(editingGroup)
      setEditingGroup(null)
    } else {
      setEditingGroup({ ...group })
    }
  }

  // 获取分组中的好友
  const getFriendsInGroup = (groupId) => {
    if (groupId === 'all') return friends
    return friends.filter(friend => friend.groupId === groupId)
  }

  return (
    <div className="flex h-full">
      {/* 左侧分组列表 */}
      <div className="w-64 border-r border-gray-200 dark:border-gray-700">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">好友分组</h3>
            <button
              onClick={() => setShowCreateGroup(true)}
              className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <PlusIcon className="w-5 h-5" />
            </button>
          </div>

          {/* 创建分组表单 */}
          {showCreateGroup && (
            <form onSubmit={handleCreateGroup} className="mb-4">
              <input
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                placeholder="输入分组名称..."
                autoFocus
              />
              <div className="flex justify-end mt-2 space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCreateGroup(false)}
                  className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={!newGroupName.trim()}
                  className="px-3 py-1 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  创建
                </button>
              </div>
            </form>
          )}

          {/* 分组列表 */}
          <div className="space-y-1">
            <button
              onClick={() => setSelectedGroup('all')}
              className={`w-full flex items-center px-3 py-2 rounded-md ${
                selectedGroup === 'all'
                  ? 'bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-300'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <UserGroupIcon className="w-5 h-5 mr-2" />
              <span className="text-sm">全部好友</span>
              <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">
                {friends.length}
              </span>
            </button>

            {groups.map((group) => (
              <div
                key={group.id}
                className={`group flex items-center px-3 py-2 rounded-md ${
                  selectedGroup === group.id
                    ? 'bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-300'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <button
                  onClick={() => setSelectedGroup(group.id)}
                  className="flex-1 flex items-center min-w-0"
                >
                  <FolderIcon className="w-5 h-5 mr-2 flex-shrink-0" />
                  {editingGroup?.id === group.id ? (
                    <input
                      type="text"
                      value={editingGroup.name}
                      onChange={(e) => setEditingGroup({ ...editingGroup, name: e.target.value })}
                      className="flex-1 bg-transparent border-none focus:ring-0 p-0 text-sm"
                      autoFocus
                    />
                  ) : (
                    <span className="text-sm truncate">{group.name}</span>
                  )}
                  <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">
                    {getFriendsInGroup(group.id).length}
                  </span>
                </button>
                
                <div className="ml-2 flex items-center space-x-1 opacity-0 group-hover:opacity-100">
                  <button
                    onClick={() => handleEditGroup(group)}
                    className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    <PencilIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDeleteGroup(group.id)}
                    className="p-1 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 右侧好友列表 */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            {selectedGroup === 'all' ? '全部好友' : groups.find(g => g.id === selectedGroup)?.name}
          </h3>

          <div className="space-y-2">
            {getFriendsInGroup(selectedGroup).map((friend) => (
              <div
                key={friend.id}
                className="group flex items-center p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <Image
                  src={friend.avatar}
                  alt={friend.name}
                  width={40}
                  height={40}
                  className="rounded-full"
                />
                <div className="ml-3 flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {friend.name}
                  </p>
                  {friend.note && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {friend.note}
                    </p>
                  )}
                </div>

                <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100">
                  <button
                    onClick={() => setShowFriendActions(friend.id)}
                    className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    <PencilIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDeleteFriend(friend.id)}
                    className="p-1 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>

                {/* 好友操作下拉菜单 */}
                {showFriendActions === friend.id && (
                  <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5">
                    <div className="py-1">
                      <button
                        onClick={() => onEditFriend(friend)}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        编辑备注
                      </button>
                      <div className="border-t border-gray-100 dark:border-gray-700 my-1" />
                      {groups.map((group) => (
                        <button
                          key={group.id}
                          onClick={() => {
                            onMoveFriend(friend.id, group.id)
                            setShowFriendActions(null)
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          移动到 {group.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
} 