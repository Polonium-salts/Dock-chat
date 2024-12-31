'use client'

import { signIn, useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Image from 'next/image'

export default function Login() {
  const { data: session, status } = useSession()
  const router = useRouter()

  // 如果已登录，重定向到主页
  useEffect(() => {
    if (session?.user?.login) {
      router.push(`/${session.user.login}`)
    }
  }, [session, router])

  // 处理 GitHub 登录
  const handleGitHubLogin = async () => {
    try {
      await signIn('github', {
        callbackUrl: '/'
      })
    } catch (error) {
      console.error('Login error:', error)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md w-full space-y-8 p-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            欢迎使用 Dock Chat
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            请使用 GitHub 账号登录以继续
          </p>
        </div>

        <div className="mt-8">
          <button
            onClick={handleGitHubLogin}
            className="w-full flex items-center justify-center px-4 py-3 border border-transparent text-base font-medium rounded-md text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 0C4.477 0 0 4.477 0 10c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V19c0 .27.16.59.67.5C17.14 18.16 20 14.42 20 10A10 10 0 0010 0z"
                clipRule="evenodd"
              />
            </svg>
            使用 GitHub 登录
          </button>
        </div>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                或者
              </span>
            </div>
          </div>

          <div className="mt-6">
            <div className="space-y-4 text-center text-sm text-gray-600 dark:text-gray-400">
              <p>
                登录即表示您同意我们的
                <a href="#" className="text-blue-500 hover:text-blue-600">
                  服务条款
                </a>
                和
                <a href="#" className="text-blue-500 hover:text-blue-600">
                  隐私政策
                </a>
              </p>
              <p>
                遇到问题？
                <a href="#" className="text-blue-500 hover:text-blue-600">
                  联系支持
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}