import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'
import { initSocket } from '../../lib/socket'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return new Response('Unauthorized', { status: 401 })
    }

    const response = new Response('Socket initialized')
    
    if (!response.socket?.server) {
      response.socket = { server: {} }
    }

    initSocket(response.socket.server)
    return response
  } catch (error) {
    console.error('Socket handler error:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}

export async function POST(request) {
  return GET(request)
} 