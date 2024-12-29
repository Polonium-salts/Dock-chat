import { NextResponse } from 'next/server'
import { getOctokit, getFriendsList, addFriend, removeFriend } from '@/lib/github'
import { getSession } from '@/lib/auth'

// 获取好友列表
export async function GET(request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const octokit = getOctokit(session.accessToken)
    const friends = await getFriendsList(octokit, session.user.login)

    return NextResponse.json(friends)
  } catch (error) {
    console.error('Error getting friends list:', error)
    return NextResponse.json(
      { error: '获取好友列表失败' },
      { status: 500 }
    )
  }
}

// 添加好友
export async function POST(request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const { username } = await request.json()
    if (!username) {
      return NextResponse.json(
        { error: '用户名不能为空' },
        { status: 400 }
      )
    }

    const octokit = getOctokit(session.accessToken)
    const friend = await addFriend(octokit, session.user.login, username)

    return NextResponse.json(friend)
  } catch (error) {
    console.error('Error adding friend:', error)
    return NextResponse.json(
      { error: error.message || '添加好友失败' },
      { status: error.status || 500 }
    )
  }
}

// 删除好友
export async function DELETE(request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const { username } = await request.json()
    if (!username) {
      return NextResponse.json(
        { error: '用户名不能为空' },
        { status: 400 }
      )
    }

    const octokit = getOctokit(session.accessToken)
    await removeFriend(octokit, session.user.login, username)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing friend:', error)
    return NextResponse.json(
      { error: '删除好友失败' },
      { status: 500 }
    )
  }
} 