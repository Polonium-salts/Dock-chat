import { NextResponse } from 'next/server'
import { Octokit } from '@octokit/rest'

export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { error: '未授权' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const octokit = new Octokit({ auth: token })

    // 获取搜索查询
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    if (!query) {
      return NextResponse.json(
        { error: '缺少搜索关键词' },
        { status: 400 }
      )
    }

    // 搜索用户
    const { data } = await octokit.search.users({
      q: query,
      per_page: 10,
      page: 1
    })

    // 获取当前用户信息
    const { data: currentUser } = await octokit.users.getAuthenticated()

    // 过滤掉当前用户
    const users = data.items
      .filter(user => user.id !== currentUser.id)
      .map(user => ({
        id: user.id,
        name: user.login,
        avatar_url: user.avatar_url
      }))

    return NextResponse.json({ users })
  } catch (error) {
    console.error('Error searching users:', error)
    return NextResponse.json(
      { error: '搜索用户失败' },
      { status: 500 }
    )
  }
} 