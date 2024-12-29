'use client'

import { useState, useRef, useEffect } from 'react'
import { FaceSmileIcon, ArrowUpTrayIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { Octokit } from '@octokit/rest'

export default function EmojiPicker({ session, onSelect }) {
  const [isOpen, setIsOpen] = useState(false)
  const [emojis, setEmojis] = useState([])
  const [loading, setLoading] = useState(false)
  const [source, setSource] = useState('all')
  const [page, setPage] = useState(1)
  const [showUploadForm, setShowUploadForm] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const containerRef = useRef(null)
  const scrollRef = useRef(null)

  // 加载表情包
  const loadEmojis = async (reset = false) => {
    if (loading) return
    setLoading(true)

    try {
      let newEmojis = []
      const currentPage = reset ? 1 : page

      if (source === 'fabiaoqing' || source === 'all') {
        // 从表情包网站加载
        const response = await fetch(`/api/emojis/search?q=${searchQuery}&page=${currentPage}`)
        const data = await response.json()
        newEmojis = [...newEmojis, ...data.emojis]
      }

      if (source === 'user' || source === 'all') {
        // 从用户的 GitHub 仓库加载
        const octokit = new Octokit({ auth: session.accessToken })
        try {
          const { data } = await octokit.repos.getContent({
            owner: session.user.login,
            repo: 'dock-chat-data',
            path: 'emojis',
            ref: 'main'
          })

          if (Array.isArray(data)) {
            const userEmojis = data
              .filter(file => file.type === 'file' && /\.(gif|png|jpg|jpeg)$/i.test(file.name))
              .map(file => ({
                id: file.sha,
                title: file.name.replace(/\.[^/.]+$/, ''),
                url: file.download_url,
                source: 'user'
              }))
            newEmojis = [...newEmojis, ...userEmojis]
          }
        } catch (error) {
          if (error.status !== 404) {
            console.error('Error loading user emojis:', error)
          }
        }
      }

      // 过滤搜索结果
      if (searchQuery) {
        newEmojis = newEmojis.filter(emoji => 
          emoji.title.toLowerCase().includes(searchQuery.toLowerCase())
        )
      }

      setEmojis(reset ? newEmojis : [...emojis, ...newEmojis])
      if (!reset) {
        setPage(currentPage + 1)
      }
    } catch (error) {
      console.error('Error loading emojis:', error)
    } finally {
      setLoading(false)
    }
  }

  // 上传表情包
  const handleUpload = async (file) => {
    if (!file || !session?.accessToken) return

    try {
      const octokit = new Octokit({ auth: session.accessToken })
      const content = await file.arrayBuffer()
      const base64Content = Buffer.from(content).toString('base64')

      await octokit.repos.createOrUpdateFileContents({
        owner: session.user.login,
        repo: 'dock-chat-data',
        path: `emojis/${file.name}`,
        message: '上传表情包',
        content: base64Content,
        branch: 'main'
      })

      // 重新加载表情包
      setSource('user')
      loadEmojis(true)
      setShowUploadForm(false)
    } catch (error) {
      console.error('Error uploading emoji:', error)
      alert('上传失败，请重试')
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
  }, [isOpen, source, searchQuery])

  // 滚动加载更多
  useEffect(() => {
    if (!scrollRef.current) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
      if (scrollHeight - scrollTop <= clientHeight * 1.5) {
        loadEmojis()
      }
    }

    scrollRef.current.addEventListener('scroll', handleScroll)
    return () => scrollRef.current?.removeEventListener('scroll', handleScroll)
  }, [emojis])

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

            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索表情..."
                className="w-full px-3 py-1.5 pl-9 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <MagnifyingGlassIcon className="absolute left-2.5 top-2 w-4 h-4 text-gray-400" />
            </div>

            {showUploadForm && (
              <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-700 rounded">
                <input
                  type="file"
                  accept="image/gif,image/png,image/jpeg"
                  onChange={(e) => handleUpload(e.target.files[0])}
                  className="text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-1 file:px-3 file:text-xs file:font-medium file:border-0 file:rounded-md file:bg-blue-50 file:text-blue-600 dark:file:bg-blue-900/50 dark:file:text-blue-400"
                />
              </div>
            )}
          </div>

          <div ref={scrollRef} className="max-h-60 overflow-y-auto p-2">
            <div className="grid grid-cols-4 gap-2">
              {emojis.map((emoji) => (
                <button
                  key={emoji.id}
                  onClick={() => onSelect(emoji)}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                >
                  <img
                    src={emoji.url}
                    alt={emoji.title}
                    className="w-full h-auto object-contain"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
            {loading && (
              <div className="text-center py-2">
                <div className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-blue-600"></div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
} 