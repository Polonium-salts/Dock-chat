import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { octokit } from '@/lib/github'

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // 获取搜索查询参数
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')

    if (!query) {
      return NextResponse.json([])
    }

    // 使用GitHub API搜索用户
    const { data } = await octokit.request('GET /search/users', {
      q: query,
      per_page: 10,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    })

    // 获取用户详细信息
    const users = await Promise.all(
      data.items.map(async (user) => {
        const { data: userDetails } = await octokit.request('GET /users/{username}', {
          username: user.login,
          headers: {
            'X-GitHub-Api-Version': '2022-11-28'
          }
        })
        return {
          id: userDetails.id,
          login: userDetails.login,
          name: userDetails.name || userDetails.login,
          image: userDetails.avatar_url
        }
      })
    )

    return NextResponse.json(users)
  } catch (error) {
    console.error('Failed to search users:', error)
    return new NextResponse('Failed to search users', { status: 500 })
  }
} 