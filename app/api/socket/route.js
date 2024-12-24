import { Server } from 'socket.io'
import { prisma } from '@/lib/prisma'

const ioHandler = (req, res) => {
  if (!res.socket.server.io) {
    const io = new Server(res.socket.server, {
      path: '/api/socket',
      addTrailingSlash: false,
      cors: {
        origin: ['https://dock-chat.vercel.app', 'http://localhost:3000'],
        methods: ['GET', 'POST', 'OPTIONS'],
        credentials: true,
        allowedHeaders: ['Content-Type']
      },
      transports: ['polling', 'websocket'],
      pingTimeout: 60000,
      pingInterval: 25000,
      allowEIO3: true,
      allowUpgrades: true,
      cookie: {
        name: 'io',
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production'
      }
    })

    io.on('connection', socket => {
      console.log('Socket connected:', socket.id)

      // 加入默认房间
      socket.join('public')

      socket.on('message', async (message) => {
        try {
          // 保存消息到数据库
          const savedMessage = await prisma.message.create({
            data: {
              content: message.content,
              userId: message.user.id,
              roomId: 'public'
            },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  image: true
                }
              }
            }
          })

          // 广播消息给所有客户端
          io.to('public').emit('message', savedMessage)
        } catch (error) {
          console.error('Failed to save message:', error)
          socket.emit('error', { message: 'Failed to save message' })
        }
      })

      socket.on('error', (error) => {
        console.error('Socket error:', error)
      })

      socket.on('disconnect', () => {
        console.log('Socket disconnected:', socket.id)
        socket.leave('public')
      })
    })

    res.socket.server.io = io
  }

  res.end()
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req, res) {
  try {
    await ioHandler(req, res)
    return new Response('Socket is running', { status: 200 })
  } catch (error) {
    console.error('Socket error:', error)
    return new Response('Socket error', { status: 500 })
  }
}

export async function POST(req, res) {
  try {
    await ioHandler(req, res)
    return new Response('Socket is running', { status: 200 })
  } catch (error) {
    console.error('Socket error:', error)
    return new Response('Socket error', { status: 500 })
  }
} 