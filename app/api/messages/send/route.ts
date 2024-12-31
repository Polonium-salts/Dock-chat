import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '../../auth/[...nextauth]/options'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.login || !session.accessToken) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
      })
    }

    const { roomId, message } = await request.json()

    // 从 GitHub 仓库加载现有消息
    const getResponse = await fetch(
      `https://api.github.com/repos/${session.user.login}/dock-chat-data/contents/chats/${roomId}.json`,
      {
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
          'Accept': 'application/vnd.github.v3.raw',
        },
      }
    )

    let messages = []
    let sha = null

    if (getResponse.ok) {
      const data = await getResponse.json()
      messages = data.messages || []
      sha = data.sha
    }

    // 添加新消息
    messages.push(message)

    // 更新 GitHub 仓库
    const content = JSON.stringify({ messages }, null, 2)
    const encodedContent = Buffer.from(content).toString('base64')

    const updateResponse = await fetch(
      `https://api.github.com/repos/${session.user.login}/dock-chat-data/contents/chats/${roomId}.json`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `Update chat history for ${roomId}`,
          content: encodedContent,
          sha: sha,
        }),
      }
    )

    if (!updateResponse.ok) {
      throw new Error('Failed to save message')
    }

    return new NextResponse(JSON.stringify({ success: true }))
  } catch (error) {
    console.error('Error sending message:', error)
    return new NextResponse(
      JSON.stringify({ error: 'Failed to send message' }),
      { status: 500 }
    )
  }
}