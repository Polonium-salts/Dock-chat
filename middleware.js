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

  // 获取主机名和子域名
  const host = request.headers.get('host')
  const subdomain = host?.split('.')[0]
  const isCustomDomain = host && !host.includes('localhost') && !host.includes('127.0.0.1')

  // 如果是自定义域名，检查用户登录状态
  if (isCustomDomain && subdomain !== 'www') {
    const token = await getToken({ req: request })
    
    // 如果用户未登录或子域名与用户名不匹配，重定向到主域名
    if (!token || (token.login && token.login !== subdomain)) {
      const url = new URL(request.url)
      const mainDomain = host.split('.').slice(1).join('.')
      return NextResponse.redirect(`https://${mainDomain}${url.pathname}`)
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
} 