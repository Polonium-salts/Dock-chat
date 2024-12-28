import { ChatRoomExtension } from '../extensionApi'
import { useState } from 'react'
import FileUpload from '@/app/components/FileUpload'
import { extensionManager } from '../extensionApi'

export class FileShareExtension extends ChatRoomExtension {
  constructor() {
    super({
      id: 'file-share',
      name: '文件共享',
      version: '1.0.0',
      author: 'Dock Chat',
      description: '支持文件上传和共享的扩展',
      type: 'file_sharing',
      config: {
        allowImages: true,
        allowDocuments: true,
        maxFileSize: 10 * 1024 * 1024 // 10MB
      }
    })

    this.onMessage(this.handleMessage.bind(this))
    this.onRender(this.renderUI.bind(this))
    this.registerComponent('FileUpload', FileUploadWrapper)
  }

  handleMessage(message) {
    if (message.type === 'file') {
      // 处理文件消息
      console.log('Received file message:', message)
    }
  }

  async uploadFile(file) {
    try {
      // 创建 FormData
      const formData = new FormData()
      formData.append('file', file)

      // 上传文件到服务器
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error('Failed to upload file')
      }

      const data = await response.json()

      // 发送文件消息
      this.sendMessage({
        type: 'file',
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        fileUrl: data.url,
        timestamp: new Date().toISOString()
      })

      return data
    } catch (error) {
      console.error('Failed to upload file:', error)
      throw error
    }
  }

  renderUI({ message, currentUser }) {
    if (message.type !== 'file') return null

    return (
      <FileMessage
        message={message}
        currentUser={currentUser}
        config={this.config}
      />
    )
  }
}

const FileUploadWrapper = ({ onClose }) => {
  const extension = extensionManager.getExtension('file-share')
  const [isUploading, setIsUploading] = useState(false)

  const handleUpload = async (file) => {
    try {
      setIsUploading(true)
      await extension.uploadFile(file)
      onClose()
    } catch (error) {
      console.error('Failed to upload file:', error)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium">上传文件</h3>
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
      <FileUpload
        onUpload={handleUpload}
        config={extension.config}
      />
    </div>
  )
}

const FileMessage = ({ message, currentUser, config }) => {
  const [isLoading, setIsLoading] = useState(false)

  const handleDownload = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(message.fileUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = message.fileName
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Failed to download file:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const isOwner = message.sender.id === currentUser.id
  const fileSize = (message.fileSize / 1024).toFixed(2) + ' KB'

  return (
    <div className={`flex ${isOwner ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-sm rounded-lg p-4 ${
        isOwner ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-700'
      }`}>
        <div className="flex items-center gap-3 mb-2">
          <svg
            className="w-8 h-8"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {message.fileName}
            </p>
            <p className="text-xs opacity-75">
              {fileSize}
            </p>
          </div>
        </div>
        <button
          onClick={handleDownload}
          disabled={isLoading}
          className={`w-full py-2 px-4 rounded ${
            isOwner
              ? 'bg-white/10 hover:bg-white/20'
              : 'bg-blue-500 text-white hover:bg-blue-600'
          } transition-colors duration-200 flex items-center justify-center gap-2`}
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
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
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              下载文件
            </>
          )}
        </button>
      </div>
    </div>
  )
} 