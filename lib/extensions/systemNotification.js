import { ChatRoomExtension } from '../extensionApi'

export class SystemNotificationExtension extends ChatRoomExtension {
  constructor() {
    super({
      id: 'system-notification',
      name: '系统通知',
      version: '1.0.0',
      author: 'Dock Chat',
      description: '系统通知和事件提醒',
      type: 'system_notification',
      config: {
        enableSound: true,
        enableDesktopNotification: true
      }
    })

    this.onMessage(this.handleMessage.bind(this))
    this.onRender(this.renderUI.bind(this))
  }

  handleMessage(message) {
    if (message.type === 'system') {
      // 处理系统消息
      console.log('Received system message:', message)

      // 播放提示音
      if (this.config.enableSound) {
        this.playNotificationSound()
      }

      // 显示桌面通知
      if (this.config.enableDesktopNotification) {
        this.showDesktopNotification(message)
      }
    }
  }

  playNotificationSound() {
    try {
      const audio = new Audio('/notification.mp3')
      audio.play()
    } catch (error) {
      console.error('Failed to play notification sound:', error)
    }
  }

  async showDesktopNotification(message) {
    try {
      if (!('Notification' in window)) {
        console.warn('This browser does not support desktop notification')
        return
      }

      if (Notification.permission === 'granted') {
        new Notification('Dock Chat', {
          body: message.content,
          icon: '/logo.png'
        })
      } else if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission()
        if (permission === 'granted') {
          new Notification('Dock Chat', {
            body: message.content,
            icon: '/logo.png'
          })
        }
      }
    } catch (error) {
      console.error('Failed to show desktop notification:', error)
    }
  }

  sendSystemNotification(content, type = 'info') {
    this.sendMessage({
      type: 'system',
      content,
      notificationType: type,
      timestamp: new Date().toISOString()
    })
  }

  renderUI({ message, currentUser }) {
    if (message.type !== 'system') return null

    return (
      <SystemMessage
        message={message}
        currentUser={currentUser}
        config={this.config}
      />
    )
  }
}

const SystemMessage = ({ message, currentUser, config }) => {
  const getIcon = () => {
    switch (message.notificationType) {
      case 'success':
        return (
          <svg
            className="w-5 h-5 text-green-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        )
      case 'warning':
        return (
          <svg
            className="w-5 h-5 text-yellow-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        )
      case 'error':
        return (
          <svg
            className="w-5 h-5 text-red-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        )
      default:
        return (
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
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        )
    }
  }

  return (
    <div className="flex justify-center mb-4">
      <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
        {getIcon()}
        <span className="text-sm text-gray-600 dark:text-gray-300">
          {message.content}
        </span>
      </div>
    </div>
  )
} 