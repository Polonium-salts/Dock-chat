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

    // 删除 GitHub 仓库
    const response = await fetch(
      `https://api.github.com/repos/${session.user.login}/dock-chat-data`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
        },
      }
    )

    if (!response.ok && response.status !== 404) {
      throw new Error('Failed to delete repository')
    }

    return new NextResponse(JSON.stringify({ success: true }))
  } catch (error) {
    console.error('Error deleting repository:', error)
    return new NextResponse(
      JSON.stringify({ error: 'Failed to delete repository' }),
      { status: 500 }
    )
  }
} 