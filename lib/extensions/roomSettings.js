import { ChatRoomExtension } from '../extensionApi'
import { useState } from 'react'
import { extensionManager } from '../extensionApi'

export class RoomSettingsExtension extends ChatRoomExtension {
  constructor() {
    super({
      id: 'room-settings',
      name: '聊天室设置',
      version: '1.0.0',
      author: 'Dock Chat',
      description: '管理聊天室设置和配置',
      type: 'room_settings',
      config: {
        enableHistory: true,
        enableNotification: true,
        enableMemberManagement: true
      }
    })

    this.onMessage(this.handleMessage.bind(this))
    this.onRender(this.renderUI.bind(this))
    this.registerComponent('RoomSettings', RoomSettingsWrapper)
  }

  handleMessage(message) {
    if (message.type === 'room_settings') {
      // 处理聊天室设置消息
      console.log('Received room settings message:', message)
    }
  }

  updateRoomSettings(settings) {
    this.sendMessage({
      type: 'room_settings',
      settings,
      timestamp: new Date().toISOString()
    })
  }

  renderUI({ message, currentUser }) {
    if (message.type !== 'room_settings') return null

    return (
      <RoomSettingsMessage
        message={message}
        currentUser={currentUser}
        config={this.config}
      />
    )
  }
}

const RoomSettingsWrapper = ({ onClose, room }) => {
  const extension = extensionManager.getExtension('room-settings')
  const [settings, setSettings] = useState({
    name: room.name,
    description: room.description,
    isPrivate: room.isPrivate,
    enableHistory: true,
    enableNotification: true,
    members: room.members || []
  })

  const handleSubmit = async () => {
    try {
      await extension.updateRoomSettings(settings)
      onClose()
    } catch (error) {
      console.error('Failed to update room settings:', error)
    }
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium">聊天室设置</h3>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            聊天室名称
          </label>
          <input
            type="text"
            value={settings.name}
            onChange={(e) => setSettings({ ...settings, name: e.target.value })}
            className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            聊天室描述
          </label>
          <textarea
            value={settings.description}
            onChange={(e) => setSettings({ ...settings, description: e.target.value })}
            className="w-full h-24 p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-center">
          <input
            type="checkbox"
            id="isPrivate"
            checked={settings.isPrivate}
            onChange={(e) => setSettings({ ...settings, isPrivate: e.target.checked })}
            className="h-4 w-4 text-blue-500 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label
            htmlFor="isPrivate"
            className="ml-2 block text-sm text-gray-700 dark:text-gray-300"
          >
            私密聊天室
          </label>
        </div>
        <div className="flex items-center">
          <input
            type="checkbox"
            id="enableHistory"
            checked={settings.enableHistory}
            onChange={(e) => setSettings({ ...settings, enableHistory: e.target.checked })}
            className="h-4 w-4 text-blue-500 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label
            htmlFor="enableHistory"
            className="ml-2 block text-sm text-gray-700 dark:text-gray-300"
          >
            保存聊天记录
          </label>
        </div>
        <div className="flex items-center">
          <input
            type="checkbox"
            id="enableNotification"
            checked={settings.enableNotification}
            onChange={(e) => setSettings({ ...settings, enableNotification: e.target.checked })}
            className="h-4 w-4 text-blue-500 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label
            htmlFor="enableNotification"
            className="ml-2 block text-sm text-gray-700 dark:text-gray-300"
          >
            开启消息通知
          </label>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            成员管理
          </label>
          <div className="space-y-2">
            {settings.members.map((member, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {member.name}
                </span>
                <button
                  onClick={() => {
                    const newMembers = [...settings.members]
                    newMembers.splice(index, 1)
                    setSettings({ ...settings, members: newMembers })
                  }}
                  className="text-red-500 hover:text-red-600"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-6">
        <button
          onClick={handleSubmit}
          className="w-full py-2 px-4 text-white bg-blue-500 rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          保存设置
        </button>
      </div>
    </div>
  )
}

const RoomSettingsMessage = ({ message, currentUser, config }) => {
  return (
    <div className="flex justify-center mb-4">
      <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
        <svg
          className="w-5 h-5 text-blue-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
        <span className="text-sm text-gray-600 dark:text-gray-300">
          {message.settings.name
            ? `聊天室设置已更新：${message.settings.name}`
            : '聊天室设置已更新'}
        </span>
      </div>
    </div>
  )
} 