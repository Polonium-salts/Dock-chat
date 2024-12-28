import { useState, useRef } from 'react'

export default function FileUpload({ onUpload, config }) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef(null)

  const handleDragEnter = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      await handleFiles(files)
    }
  }

  const handleFileSelect = async (e) => {
    const files = e.target.files
    if (files.length > 0) {
      await handleFiles(files)
    }
  }

  const handleFiles = async (files) => {
    const file = files[0]

    // 验证文件类型
    if (config.allowImages && !file.type.startsWith('image/')) {
      alert('只允许上传图片文件')
      return
    }

    if (config.allowDocuments && !file.type.includes('document')) {
      alert('只允许上传文档文件')
      return
    }

    // 验证文件大小
    if (file.size > config.maxFileSize) {
      alert(`文件大小不能超过 ${config.maxFileSize / 1024 / 1024}MB`)
      return
    }

    try {
      setIsUploading(true)
      await onUpload(file)
    } catch (error) {
      console.error('Failed to upload file:', error)
      alert('文件上传失败')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div
      className={`relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors duration-200 ${
        isDragging
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
          : 'border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-500'
      }`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
    >
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileSelect}
        accept={config.allowImages ? 'image/*' : config.allowDocuments ? '.doc,.docx,.pdf' : undefined}
      />
      
      {isUploading ? (
        <div className="flex items-center justify-center gap-3">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-gray-600 dark:text-gray-300">
            正在上传...
          </span>
        </div>
      ) : (
        <>
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            {isDragging ? '释放文件以上传' : '点击或拖拽文件到此处上传'}
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {config.allowImages
              ? '支持的图片格式：JPG、PNG、GIF'
              : config.allowDocuments
              ? '支持的文档格式：DOC、DOCX、PDF'
              : ''}
          </p>
        </>
      )}
    </div>
  )
} 