import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '../../auth/[...nextauth]/options'

export async function GET(
  request: Request,
  { params }: { params: { roomId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.login || !session.accessToken) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
      })
    }

    const { roomId } = params

    // 从 GitHub 仓库加载消息
    const response = await fetch(
      `https://api.github.com/repos/${session.user.login}/dock-chat-data/contents/chats/${roomId}.json`,
      {
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
          'Accept': 'application/vnd.github.v3.raw',
        },
      }
    )

    if (!response.ok) {
      if (response.status === 404) {
        // 如果文件不存在，返回空消息列表
        return new NextResponse(JSON.stringify({ messages: [] }))
      }
      throw new Error('Failed to load messages')
    }

    const messages = await response.json()

    return new NextResponse(JSON.stringify({ messages }))
  } catch (error) {
    console.error('Error loading messages:', error)
    return new NextResponse(
      JSON.stringify({ error: 'Failed to load messages' }),
      { status: 500 }
    )
  }
}