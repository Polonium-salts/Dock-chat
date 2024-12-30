import { useState, useEffect, useRef } from 'react'
import { FaceSmileIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline'
import Image from 'next/image'

export default function EmojiPicker({ session, onSelect }) {
  const [isOpen, setIsOpen] = useState(false)
  const [emojis, setEmojis] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [source, setSource] = useState('all') // 'all', 'fabiaoqing', 或 'user'
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef(null)
  const containerRef = useRef(null)

  // 加载表情包
  const loadEmojis = async (page = 1, selectedSource = source) => {
    if (!session?.accessToken) return

    try {
      setIsLoading(true)
      const response = await fetch(
        `/api/emojis?page=${page}&source=${selectedSource}`,
        {
          headers: {
            'Authorization': `Bearer ${session.accessToken}`
          }
        }
      )
      const data = await response.json()
      
      if (page === 1) {
        setEmojis(data.emojis)
      } else {
        setEmojis(prev => [...prev, ...data.emojis])
      }
      
      setCurrentPage(page)
    } catch (error) {
      console.error('Error loading emojis:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // 处理表情包上传
  const handleFileSelect = async (event) => {
    const file = event.target.files?.[0]
    if (!file || !session?.accessToken) return

    try {
      setIsUploading(true)
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/emojis', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.accessToken}`
        },
        body: formData
      })

      if (response.ok) {
        const data = await response.json()
        setEmojis(prev => [{
          url: data.url,
          name: data.name,
          source: 'user'
        }, ...prev])
      }
    } catch (error) {
      console.error('Error uploading emoji:', error)
      alert('上传表情包失败')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  // 处理滚动加载
  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target
    if (scrollHeight - scrollTop <= clientHeight * 1.5 && !isLoading) {
      loadEmojis(currentPage + 1)
    }
  }

  // 处理点击外部关闭
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // 初始加载
  useEffect(() => {
    if (isOpen) {
      loadEmojis(1)
    }
  }, [isOpen, session])

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg transition-colors"
      >
        <FaceSmileIcon className="w-6 h-6" />
      </button>

      {isOpen && (
        <div className="absolute bottom-full mb-2 right-0 w-72 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="p-2 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setSource('all')
                    loadEmojis(1, 'all')
                  }}
                  className={`px-2 py-1 text-sm rounded-md ${
                    source === 'all'
                      ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  全部
                </button>
                <button
                  onClick={() => {
                    setSource('fabiaoqing')
                    loadEmojis(1, 'fabiaoqing')
                  }}
                  className={`px-2 py-1 text-sm rounded-md ${
                    source === 'fabiaoqing'
                      ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  表情包
                </button>
                <button
                  onClick={() => {
                    setSource('user')
                    loadEmojis(1, 'user')
                  }}
                  className={`px-2 py-1 text-sm rounded-md ${
                    source === 'user'
                      ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  我的
                </button>
              </div>
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept=".gif,.png,.jpg,.jpeg"
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-md transition-colors"
                >
                  <ArrowUpTrayIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          <div
            className="p-2 max-h-60 overflow-y-auto"
            onScroll={handleScroll}
          >
            <div className="grid grid-cols-4 gap-2">
              {emojis.map((emoji, index) => (
                <button
                  key={`${emoji.url}-${index}`}
                  onClick={() => {
                    onSelect(emoji.url)
                    setIsOpen(false)
                  }}
                  className="aspect-square flex items-center justify-center p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <Image
                    src={emoji.url}
                    alt={emoji.name || '表情包'}
                    width={40}
                    height={40}
                    className="max-w-full max-h-full object-contain"
                  />
                </button>
              ))}
            </div>
            {isLoading && (
              <div className="flex justify-center py-2">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
} 