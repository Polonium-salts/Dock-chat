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
        { error: '请提供搜索关键词' },
        { status: 400 }
      )
    }

    // 搜索用户
    const { data } = await octokit.search.users({
      q: query,
      per_page: 10
    })

    // 获取详细的用户信息
    const users = await Promise.all(
      data.items.map(async (user) => {
        try {
          const { data: userDetail } = await octokit.users.getByUsername({
            username: user.login
          })
          return {
            id: userDetail.id,
            login: userDetail.login,
            name: userDetail.name || userDetail.login,
            avatar_url: userDetail.avatar_url,
            bio: userDetail.bio
          }
        } catch (error) {
          console.error(`Error fetching user details for ${user.login}:`, error)
          return null
        }
      })
    )

    // 过滤掉获取失败的用户
    const validUsers = users.filter(user => user !== null)

    return NextResponse.json({
      users: validUsers
    })
  } catch (error) {
    console.error('Error searching users:', error)
    return NextResponse.json(
      { error: '搜索用户失败' },
      { status: 500 }
    )
  }
} 