import { Server } from 'socket.io'
import { addChatMessage, addOnlineUser, removeOnlineUser } from '@/lib/redis'

const ioHandler = (req, res) => {
  if (!res.socket.server.io) {
    const io = new Server(res.socket.server, {
      path: '/api/socket',
      addTrailingSlash: false,
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
      transports: ['websocket', 'polling'],
    })

    io.on('connection', (socket) => {
      console.log('Client connected:', socket.id)

      socket.on('join', async (data) => {
        const { room, userId } = data
        socket.join(room)
        if (userId) {
          await addOnlineUser(room, userId)
          io.to(room).emit('userJoined', { userId, socketId: socket.id })
        }
        console.log(`Client ${socket.id} joined room: ${room}`)
      })

      socket.on('leave', async (data) => {
        const { room, userId } = data
        socket.leave(room)
        if (userId) {
          await removeOnlineUser(room, userId)
          io.to(room).emit('userLeft', { userId, socketId: socket.id })
        }
        console.log(`Client ${socket.id} left room: ${room}`)
      })

      socket.on('message', async (message) => {
        const room = message.room || 'public'
        try {
          // 将消息保存到Redis
          const savedMessage = await addChatMessage(room, {
            ...message,
            timestamp: new Date().toISOString()
          })
          // 广播消息给房间内的所有用户
          io.to(room).emit('message', savedMessage)
        } catch (error) {
          console.error('Error saving message:', error)
          socket.emit('error', { message: 'Failed to save message' })
        }
      })

      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id)
      })
    })

    res.socket.server.io = io
  }

  res.end()
}

export const GET = ioHandler
export const POST = ioHandler 