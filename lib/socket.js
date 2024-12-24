import { Server } from 'socket.io'
import { prisma } from '@/lib/prisma'

export const config = {
  api: {
    bodyParser: false,
  },
}

export default async function SocketHandler(req, res) {
  if (res.socket.server.io) {
    res.end()
    return
  }

  const io = new Server(res.socket.server, {
    path: '/api/socketio',
    addTrailingSlash: false,
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    transports: ['polling'],
    connectTimeout: 10000,
    pingTimeout: 5000,
    pingInterval: 10000,
  })

  // 加载最近的消息
  const recentMessages = await prisma.message.findMany({
    take: 50,
    orderBy: {
      createdAt: 'desc'
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

  io.on('connection', async (socket) => {
    console.log('Client connected:', socket.id)

    // 发送历史消息给新连接的客户端
    socket.emit('recent_messages', recentMessages.reverse())

    socket.on('message', async (msg) => {
      try {
        // 保存消息到数据库
        const savedMessage = await prisma.message.create({
          data: {
            content: msg.content,
            userId: msg.user.id,
            roomId: msg.roomId || 'public'
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
        io.emit('message', savedMessage)
      } catch (error) {
        console.error('Error saving message:', error)
        socket.emit('error', { message: 'Failed to save message' })
      }
    })

    socket.on('error', (error) => {
      console.error('Socket error:', error)
    })

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id)
    })
  })

  res.socket.server.io = io
  res.end()
} 