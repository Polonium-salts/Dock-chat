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

  // 如果是 API 路由或静态资源，直接返回
  if (path.startsWith('/api') || 
      path.startsWith('/_next') || 
      path.includes('/favicon.ico') || 
      path.includes('/images/')) {
    return response
  }

  // 如果是根路径，检查是否已登录
  if (path === '/') {
    const token = await getToken({ req: request })
    if (token?.login) {
      // 只在用户已登录且明确需要重定向时才进行重定向
      const userPath = `/${token.login}`
      if (path !== userPath && !request.cookies.get('no_redirect')) {
        const redirectUrl = new URL(userPath, request.url)
        const redirectResponse = NextResponse.redirect(redirectUrl)
        // 设置一个 cookie 来防止循环重定向
        redirectResponse.cookies.set('no_redirect', 'true', { maxAge: 60 })
        return redirectResponse
      }
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