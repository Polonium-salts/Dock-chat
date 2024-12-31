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

    // 从用户的私有仓库中获取好友列表
    const { data: friends } = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
      owner: session.user.login,
      repo: 'dock-chat-data',
      path: 'friends.json',
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    })

    // 解码并解析好友列表
    const content = Buffer.from(friends.content, 'base64').toString('utf8')
    const friendsList = JSON.parse(content)

    return NextResponse.json(friendsList)
  } catch (error) {
    console.error('Failed to get friends:', error)
    return new NextResponse('Failed to get friends', { status: 500 })
  }
} 