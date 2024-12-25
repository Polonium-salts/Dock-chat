import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { getRepositoryStats } from '@/lib/github'

export default function ChatStats() {
  const { data: session } = useSession()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadStats = async () => {
      if (session?.accessToken && session?.user?.login) {
        try {
          const repoStats = await getRepositoryStats(session.accessToken, session.user.login)
          setStats(repoStats)
        } catch (error) {
          console.error('Error loading stats:', error)
        } finally {
          setLoading(false)
        }
      }
    }

    loadStats()
  }, [session])

  if (loading) {
    return (
      <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  if (!stats) {
    return null
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">存储大小</h3>
        <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
          {(stats.size / 1024).toFixed(2)} MB
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">创建时间</h3>
        <p className="mt-1 text-lg font-medium text-gray-900 dark:text-white">
          {new Date(stats.created_at).toLocaleDateString()}
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">最后更新</h3>
        <p className="mt-1 text-lg font-medium text-gray-900 dark:text-white">
          {new Date(stats.updated_at).toLocaleString()}
        </p>
      </div>
    </div>
  )
} 