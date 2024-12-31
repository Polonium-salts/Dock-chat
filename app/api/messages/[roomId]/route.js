'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'

export async function GET(req, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.accessToken || !session.user?.name) {
      return new Response('Unauthorized', { status: 401 })
    }

    const { roomId } = params
    const response = await fetch(
      `https://api.github.com/repos/${session.user.name}/dock-chat-data/contents/chats/${roomId}/messages.json`,
      {
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    )

    if (response.status === 404) {
      return new Response(JSON.stringify({ messages: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    if (!response.ok) {
      throw new Error('Failed to fetch messages')
    }

    const data = await response.json()
    const content = JSON.parse(Buffer.from(data.content, 'base64').toString())

    return new Response(JSON.stringify(content), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Error fetching messages:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}