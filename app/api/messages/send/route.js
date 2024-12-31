'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.accessToken || !session.user?.name) {
      return new Response('Unauthorized', { status: 401 })
    }

    const { roomId, message } = await req.json()

    // 获取现有消息
    const getResponse = await fetch(
      `https://api.github.com/repos/${session.user.name}/dock-chat-data/contents/chats/${roomId}/messages.json`,
      {
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    )

    let existingMessages = []
    let sha = null

    if (getResponse.ok) {
      const data = await getResponse.json()
      existingMessages = JSON.parse(Buffer.from(data.content, 'base64').toString()).messages
      sha = data.sha
    }

    // 添加新消息
    const updatedMessages = {
      roomId,
      messages: [...existingMessages, message],
      updated_at: new Date().toISOString()
    }

    // 保存更新后的消息
    const content = Buffer.from(JSON.stringify(updatedMessages, null, 2)).toString('base64')
    const saveResponse = await fetch(
      `https://api.github.com/repos/${session.user.name}/dock-chat-data/contents/chats/${roomId}/messages.json`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.github.v3+json'
        },
        body: JSON.stringify({
          message: `Add message to ${roomId}`,
          content,
          ...(sha ? { sha } : {})
        })
      }
    )

    if (!saveResponse.ok) {
      throw new Error('Failed to save message')
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Error sending message:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}