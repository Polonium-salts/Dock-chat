import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'
import { initSocket } from '../../lib/socket'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const res = new NextResponse(
      new ReadableStream({
        start(controller) {
          controller.close()
        },
      }),
      {
        status: 200,
        headers: {
          'content-type': 'text/event-stream',
          'connection': 'keep-alive',
          'cache-control': 'no-cache, no-transform',
        },
      }
    )

    if (!res.socket?.server?.io) {
      initSocket(res.socket.server)
    }

    return res
  } catch (error) {
    console.error('Socket handler error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(request) {
  return GET(request)
} 