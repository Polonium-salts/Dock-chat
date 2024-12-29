import { NextResponse } from 'next/server'
import { getOctokit, getPrivateMessages, sendPrivateMessage } from '@/lib/github'
import { getSession } from '@/lib/auth'

// 获取私聊消息
export async function GET(request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const friendUsername = searchParams.get('friend')
    const before = searchParams.get('before')
    const limit = parseInt(searchParams.get('limit') || '50')

    if (!friendUsername) {
      return NextResponse.json(
        { error: '好友用户名不能为空' },
        { status: 400 }
      )
    }

    const octokit = getOctokit(session.accessToken)
    const { messages, hasMore } = await getPrivateMessages(
      octokit,
      session.user.login,
      friendUsername,
      before,
      limit
    )

    // 添加 isSelf 标记
    const processedMessages = messages.map(message => ({
      ...message,
      isSelf: message.sender === session.user.login
    }))

    return NextResponse.json({ messages: processedMessages, hasMore })
  } catch (error) {
    console.error('Error getting private messages:', error)
    return NextResponse.json(
      { error: '获取私聊消息失败' },
      { status: 500 }
    )
  }
}

// 发送私聊消息
export async function POST(request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const { friendUsername, content } = await request.json()
    if (!friendUsername || !content) {
      return NextResponse.json(
        { error: '好友用户名和消息内容不能为空' },
        { status: 400 }
      )
    }

    const octokit = getOctokit(session.accessToken)
    const message = await sendPrivateMessage(
      octokit,
      session.user.login,
      friendUsername,
      content
    )

    return NextResponse.json({
      ...message,
      isSelf: true
    })
  } catch (error) {
    console.error('Error sending private message:', error)
    return NextResponse.json(
      { error: '发送私聊消息失败' },
      { status: 500 }
    )
  }
} 