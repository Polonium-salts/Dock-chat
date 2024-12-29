import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { Octokit } from '@octokit/rest'

// 获取好友列表
export async function GET(request) {
  try {
    const session = await getServerSession()
    if (!session?.accessToken) {
      return NextResponse.json({ error: '未授权' }, { status: 401 })
    }

    const octokit = new Octokit({ auth: session.accessToken })
    const { data: user } = await octokit.users.getAuthenticated()

    try {
      // 从私有仓库获取好友列表
      const { data: friendsFile } = await octokit.repos.getContent({
        owner: user.login,
        repo: 'dock-chat-data',
        path: 'friends.json',
        ref: 'main'
      })

      const content = Buffer.from(friendsFile.content, 'base64').toString()
      const { friends } = JSON.parse(content)
      return NextResponse.json({ friends })
    } catch (error) {
      if (error.status === 404) {
        // 如果文件不存在，创建空的好友列表
        const content = Buffer.from(JSON.stringify({ friends: [] })).toString('base64')
        await octokit.repos.createOrUpdateFileContents({
          owner: user.login,
          repo: 'dock-chat-data',
          path: 'friends.json',
          message: '初始化好友列表',
          content,
          branch: 'main'
        })
        return NextResponse.json({ friends: [] })
      }
      throw error
    }
  } catch (error) {
    console.error('Error getting friends:', error)
    return NextResponse.json(
      { error: '获取好友列表失败' },
      { status: 500 }
    )
  }
}

// 添加好友
export async function POST(request) {
  try {
    const session = await getServerSession()
    if (!session?.accessToken) {
      return NextResponse.json({ error: '未授权' }, { status: 401 })
    }

    const { friendId, friendName, friendAvatar } = await request.json()
    if (!friendId || !friendName) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 })
    }

    const octokit = new Octokit({ auth: session.accessToken })
    const { data: user } = await octokit.users.getAuthenticated()

    // 获取现有好友列表
    let friendsData = { friends: [] }
    try {
      const { data: friendsFile } = await octokit.repos.getContent({
        owner: user.login,
        repo: 'dock-chat-data',
        path: 'friends.json',
        ref: 'main'
      })
      const content = Buffer.from(friendsFile.content, 'base64').toString()
      friendsData = JSON.parse(content)

      // 检查是否已经是好友
      if (friendsData.friends.some(friend => friend.id === friendId)) {
        return NextResponse.json({ error: '已经是好友了' }, { status: 400 })
      }

      // 添加新好友
      friendsData.friends.push({
        id: friendId,
        name: friendName,
        avatar: friendAvatar,
        addedAt: new Date().toISOString()
      })

      // 保存更新后的好友列表
      const updatedContent = Buffer.from(JSON.stringify(friendsData, null, 2)).toString('base64')
      await octokit.repos.createOrUpdateFileContents({
        owner: user.login,
        repo: 'dock-chat-data',
        path: 'friends.json',
        message: '添加新好友',
        content: updatedContent,
        sha: friendsFile.sha,
        branch: 'main'
      })

      return NextResponse.json({ success: true, friend: friendsData.friends[friendsData.friends.length - 1] })
    } catch (error) {
      if (error.status === 404) {
        // 如果文件不存在，创建新的好友列表
        friendsData.friends.push({
          id: friendId,
          name: friendName,
          avatar: friendAvatar,
          addedAt: new Date().toISOString()
        })

        const content = Buffer.from(JSON.stringify(friendsData, null, 2)).toString('base64')
        await octokit.repos.createOrUpdateFileContents({
          owner: user.login,
          repo: 'dock-chat-data',
          path: 'friends.json',
          message: '创建好友列表并添加好友',
          content,
          branch: 'main'
        })

        return NextResponse.json({ success: true, friend: friendsData.friends[0] })
      }
      throw error
    }
  } catch (error) {
    console.error('Error adding friend:', error)
    return NextResponse.json(
      { error: '添加好友失败' },
      { status: 500 }
    )
  }
} 