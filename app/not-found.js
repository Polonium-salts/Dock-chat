import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md w-full space-y-8 p-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            404 - 页面不存在
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            抱歉，您访问的页面不存在或已被删除
          </p>
        </div>

        <div className="mt-8">
          <Link
            href="/"
            className="block w-full px-4 py-2 bg-blue-500 text-white text-center rounded-lg hover:bg-blue-600"
          >
            返回首页
          </Link>
        </div>
      </div>
    </div>
  )
}
