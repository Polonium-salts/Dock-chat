import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.accessToken || !session.user?.name) {
      return new Response('Unauthorized', { status: 401 })
    }

    const response = await fetch(
      `https://api.github.com/repos/${session.user.name}/dock-chat-data`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    )

    if (response.status === 204) {
      return new Response('Repository deleted', { status: 200 })
    } else {
      throw new Error('Failed to delete repository')
    }
  } catch (error) {
    console.error('Error deleting repository:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
} 