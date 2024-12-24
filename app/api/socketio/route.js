import SocketHandler from '@/lib/socket'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req, res) {
  try {
    await SocketHandler(req, res)
    return new Response('Socket is running', { status: 200 })
  } catch (error) {
    console.error('Socket error:', error)
    return new Response('Socket error', { status: 500 })
  }
}

export async function POST(req, res) {
  try {
    await SocketHandler(req, res)
    return new Response('Socket is running', { status: 200 })
  } catch (error) {
    console.error('Socket error:', error)
    return new Response('Socket error', { status: 500 })
  }
} 