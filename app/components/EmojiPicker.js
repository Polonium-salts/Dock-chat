import { useState, useEffect, useRef } from 'react'
import { FaceSmileIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline'
import Image from 'next/image'

export default function EmojiPicker({ session, onSelect }) {
  const [isOpen, setIsOpen] = useState(false)
  const [emojis, setEmojis] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [source, setSource] = useState('all')
  const [uploadTitle, setUploadTitle] = useState('')
  const [showUploadForm, setShowUploadForm] = useState(false)
  const fileInputRef = useRef(null)
  const containerRef = useRef(null)

  // 加载表情包
  const loadEmojis = async (reset = false) => {
    if (isLoading) return
    
    try {
      setIsLoading(true)
      const response = await fetch(
        `/api/emojis?page=${reset ? 1 : page}&source=${source}`,
        {
          headers: {
            'Authorization': `Bearer ${session.accessToken}`
          }
        }
      )
      const data = await response.json()
      
      if (reset) {
        setEmojis(data.emojis)
        setPage(1)
      } else {
        setEmojis(prev => [...prev, ...data.emojis])
      }
    } catch (error) {
      console.error('Error loading emojis:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // 处理表情包上传
  const handleUpload = async (e) => {
    e.preventDefault()
    const file = fileInputRef.current?.files?.[0]
    if (!file || !uploadTitle) return

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('title', uploadTitle)

      const response = await fetch('/api/emojis', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.accessToken}`
        },
        body: formData
      })

      if (response.ok) {
        const data = await response.json()
        setEmojis(prev => [
          {
            title: data.title,
            url: data.url,
            source: 'user'
          },
          ...prev
        ])
        setShowUploadForm(false)
        setUploadTitle('')
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      }
    } catch (error) {
      console.error('Error uploading emoji:', error)
      alert('上传表情包失败，请重试')
    }
  }

  // 处理滚动加载
  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target
    if (scrollHeight - scrollTop <= clientHeight * 1.5 && !isLoading) {
      setPage(prev => prev + 1)
    }
  }

  // 监听点击外部关闭选择器
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // 加载表情包
  useEffect(() => {
    if (isOpen) {
      loadEmojis(true)
    }
  }, [isOpen, source])

  // 滚动加载更多
  useEffect(() => {
    if (isOpen && page > 1) {
      loadEmojis()
    }
  }, [page])

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg transition-colors"
      >
        <FaceSmileIcon className="w-6 h-6" />
      </button>

      {isOpen && (
        <div className="absolute bottom-12 left-0 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="p-3 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              >
                <option value="all">全部表情</option>
                <option value="fabiaoqing">表情包库</option>
                <option value="user">我的表情</option>
              </select>
              <button
                onClick={() => setShowUploadForm(!showUploadForm)}
                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1"
              >
                <ArrowUpTrayIcon className="w-4 h-4" />
                上传表情
              </button>
            </div>

            {showUploadForm && (
              <form onSubmit={handleUpload} className="space-y-2 mb-2">
                <input
                  type="text"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="表情包名称"
                  className="w-full px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".gif,.png,.jpg,.jpeg"
                  className="w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-1 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/50 dark:file:text-blue-400"
                />
                <button
                  type="submit"
                  disabled={!uploadTitle}
                  className="w-full px-3 py-1 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50"
                >
                  上传
                </button>
              </form>
            )}
          </div>

          <div
            className="p-2 max-h-60 overflow-y-auto grid grid-cols-4 gap-2"
            onScroll={handleScroll}
          >
            {emojis.map((emoji, index) => (
              <button
                key={`${emoji.url}-${index}`}
                onClick={() => {
                  onSelect(emoji)
                  setIsOpen(false)
                }}
                className="aspect-square rounded hover:bg-gray-100 dark:hover:bg-gray-700 p-1"
              >
                <Image
                  src={emoji.url}
                  alt={emoji.title}
                  width={60}
                  height={60}
                  className="w-full h-full object-contain"
                />
              </button>
            ))}
            {isLoading && (
              <div className="col-span-4 py-4 text-center">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-blue-600"></div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
} 