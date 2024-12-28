import { NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(request) {
  const response = NextResponse.next()

  // 添加 CORS 头
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type')

  // 处理 OPTIONS 请求
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, { status: 200, headers: response.headers })
  }

  // 获取路径
  const path = request.nextUrl.pathname

  // 如果是 API 路由，直接返回
  if (path.startsWith('/api')) {
    return response
  }

  // 如果是根路径，检查是否已登录
  if (path === '/') {
    const token = await getToken({ req: request })
    if (token?.login) {
      // 如果已登录，重定向到用户的个人路径
      return NextResponse.redirect(new URL(`/${token.login}`, request.url))
    }
    return response
  }

  // 如果是用户路径，验证用户是否有权限访问
  const username = path.split('/')[1]
  if (username) {
    const token = await getToken({ req: request })
    if (!token) {
      // 未登录用户重定向到首页
      return NextResponse.redirect(new URL('/', request.url))
    }
    if (token.login !== username) {
      // 如果访问的不是自己的路径，重定向到自己的路径
      return NextResponse.redirect(new URL(`/${token.login}`, request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * 匹配所有路径，除了：
     * - api 路由
     * - _next 系统文件
     * - 静态文件（favicon.ico, images, etc）
     */
    '/((?!api|_next/static|_next/image|favicon.ico|images).*)',
  ],
} 