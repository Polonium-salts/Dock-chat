'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.accessToken || !session.user?.name) {
      return new Response('Unauthorized', { status: 401 })
    }

    const { repo } = await req.json()
    if (!repo) {
      return new Response('Repository name is required', { status: 400 })
    }

    // 删除存储库
    const response = await fetch(
      `https://api.github.com/repos/${session.user.name}/${repo}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    )

    if (!response.ok) {
      throw new Error('Failed to delete repository')
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Error deleting repository:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}