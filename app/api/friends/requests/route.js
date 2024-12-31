import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { octokit } from '@/lib/github'

// 获取好友请求列表
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // 从用户的私有仓库中获取好友请求列表
    const { data: requests } = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
      owner: session.user.login,
      repo: 'dock-chat-data',
      path: 'friend_requests.json',
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    })

    // 解码并解析好友请求列表
    const content = Buffer.from(requests.content, 'base64').toString('utf8')
    const requestsList = JSON.parse(content)

    return NextResponse.json(requestsList)
  } catch (error) {
    console.error('Failed to get friend requests:', error)
    return new NextResponse('Failed to get friend requests', { status: 500 })
  }
}

// 发送好友请求
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const body = await request.json()
    const { userId } = body

    // 生成请求ID
    const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    // 创建好友请求
    const requestData = {
      id: requestId,
      from: session.user.login,
      to: userId,
      status: 'pending',
      createdAt: new Date().toISOString()
    }

    // 将请求保存到目标用户的仓库中
    await octokit.request('PUT /repos/{owner}/{repo}/contents/{path}', {
      owner: userId,
      repo: 'dock-chat-data',
      path: `friend_requests/${requestId}.json`,
      message: 'Add friend request',
      content: Buffer.from(JSON.stringify(requestData)).toString('base64'),
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to send friend request:', error)
    return new NextResponse('Failed to send friend request', { status: 500 })
  }
}

// 处理好友请求（接受/拒绝）
export async function PUT(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const body = await request.json()
    const { requestId, action } = body // action: 'accept' | 'reject'

    // 获取请求详情
    const { data: requestFile } = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
      owner: session.user.login,
      repo: 'dock-chat-data',
      path: `friend_requests/${requestId}.json`,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    })

    // 解码并解析请求数据
    const content = Buffer.from(requestFile.content, 'base64').toString('utf8')
    const requestData = JSON.parse(content)

    // 更新请求状态
    requestData.status = action === 'accept' ? 'accepted' : 'rejected'
    requestData.updatedAt = new Date().toISOString()

    // 保存更新后的请求
    await octokit.request('PUT /repos/{owner}/{repo}/contents/{path}', {
      owner: session.user.login,
      repo: 'dock-chat-data',
      path: `friend_requests/${requestId}.json`,
      message: `${action} friend request`,
      content: Buffer.from(JSON.stringify(requestData)).toString('base64'),
      sha: requestFile.sha,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    })

    // 如果接受请求，则添加到好友列表
    if (action === 'accept') {
      // 获取当前用户的好友列表
      const { data: friendsFile } = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
        owner: session.user.login,
        repo: 'dock-chat-data',
        path: 'friends.json',
        headers: {
          'X-GitHub-Api-Version': '2022-11-28'
        }
      })

      // 解码并解析好友列表
      const friendsContent = Buffer.from(friendsFile.content, 'base64').toString('utf8')
      const friendsList = JSON.parse(friendsContent)

      // 添加新好友
      friendsList.push({
        id: requestData.from,
        addedAt: new Date().toISOString()
      })

      // 保存更新后的好友列表
      await octokit.request('PUT /repos/{owner}/{repo}/contents/{path}', {
        owner: session.user.login,
        repo: 'dock-chat-data',
        path: 'friends.json',
        message: 'Add new friend',
        content: Buffer.from(JSON.stringify(friendsList)).toString('base64'),
        sha: friendsFile.sha,
        headers: {
          'X-GitHub-Api-Version': '2022-11-28'
        }
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to handle friend request:', error)
    return new NextResponse('Failed to handle friend request', { status: 500 })
  }
} 