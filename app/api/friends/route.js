import { NextResponse } from 'next/server'
import { Octokit } from '@octokit/rest'

// 从 GitHub 仓库中获取好友列表
async function getFriendsFromGitHub(octokit, owner, repo) {
  try {
    const response = await octokit.repos.getContent({
      owner,
      repo,
      path: 'friends.json',
      ref: 'main'
    })

    const content = Buffer.from(response.data.content, 'base64').toString()
    return JSON.parse(content)
  } catch (error) {
    if (error.status === 404) {
      return { friends: [] }
    }
    throw error
  }
}

// 更新 GitHub 仓库中的好友列表
async function updateFriendsInGitHub(octokit, owner, repo, friends) {
  const content = Buffer.from(JSON.stringify(friends, null, 2)).toString('base64')

  try {
    const currentFile = await octokit.repos.getContent({
      owner,
      repo,
      path: 'friends.json',
      ref: 'main'
    })

    await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: 'friends.json',
      message: '更新好友列表',
      content,
      sha: currentFile.data.sha,
      branch: 'main'
    })
  } catch (error) {
    if (error.status === 404) {
      await octokit.repos.createOrUpdateFileContents({
        owner,
        repo,
        path: 'friends.json',
        message: '创建好友列表',
        content,
        branch: 'main'
      })
    } else {
      throw error
    }
  }
}

// 获取好友列表
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

    // 获取用户信息
    const { data: user } = await octokit.users.getAuthenticated()

    // 从数据仓库获取好友列表
    const friendsData = await getFriendsFromGitHub(
      octokit,
      user.login,
      'dock-chat-data'
    )

    return NextResponse.json(friendsData)
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
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { error: '未授权' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const octokit = new Octokit({ auth: token })

    // 获取用户信息
    const { data: user } = await octokit.users.getAuthenticated()

    // 获取要添加的好友 ID
    const { userId } = await request.json()
    if (!userId) {
      return NextResponse.json(
        { error: '缺少用户 ID' },
        { status: 400 }
      )
    }

    // 获取好友信息
    const { data: friend } = await octokit.users.getById({ id: userId })

    // 从数据仓库获取当前好友列表
    const friendsData = await getFriendsFromGitHub(
      octokit,
      user.login,
      'dock-chat-data'
    )

    // 检查是否已经是好友
    if (friendsData.friends.some(f => f.id === userId)) {
      return NextResponse.json(
        { error: '已经是好友了' },
        { status: 400 }
      )
    }

    // 添加新好友
    friendsData.friends.push({
      id: friend.id,
      name: friend.login,
      avatar_url: friend.avatar_url
    })

    // 更新好友列表
    await updateFriendsInGitHub(
      octokit,
      user.login,
      'dock-chat-data',
      friendsData
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error adding friend:', error)
    return NextResponse.json(
      { error: '添加好友失败' },
      { status: 500 }
    )
  }
} 