import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return new Response(JSON.stringify({ message: '未授权' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const { searchParams } = new URL(request.url)
    const username = searchParams.get('username')

    if (!username) {
      return new Response(JSON.stringify({ message: '请提供用户名' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // 调用 GitHub API 搜索用户
    const response = await fetch(`https://api.github.com/users/${username}`, {
      headers: {
        'Authorization': `Bearer ${session.accessToken}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    })

    if (!response.ok) {
      if (response.status === 404) {
        return new Response(JSON.stringify({ message: '未找到该用户' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        })
      }
      throw new Error('搜索用户失败')
    }

    const userData = await response.json()
    
    // 格式化用户数据
    const user = {
      login: userData.login,
      name: userData.name || userData.login,
      image: userData.avatar_url,
      bio: userData.bio,
      location: userData.location,
      email: userData.email
    }

    return new Response(JSON.stringify({ user }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Error searching user:', error)
    return new Response(JSON.stringify({ message: error.message || '搜索用户失败' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
} 