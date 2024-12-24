import { Server } from 'socket.io'
import { addChatMessage, addOnlineUser, removeOnlineUser } from '@/lib/redis'

const ioHandler = (req, res) => {
  if (!res.socket.server.io) {
    const io = new Server(res.socket.server, {
      path: '/api/socket',
      addTrailingSlash: false,
      cors: {
        origin: '*',
        methods: ['GET', 'POST', 'OPTIONS'],
        allowedHeaders: ['Content-Type'],
        credentials: true
      },
      connectionStateRecovery: {
        maxDisconnectionDuration: 2 * 60 * 1000,
        skipMiddlewares: true,
      },
    })

    io.on('connection', (socket) => {
      console.log('Client connected:', socket.id)

      socket.on('join', async (data) => {
        try {
          const { room, userId } = data
          await socket.join(room)
          if (userId) {
            await addOnlineUser(room, userId)
            io.to(room).emit('userJoined', { userId, socketId: socket.id })
          }
          console.log(`Client ${socket.id} joined room: ${room}`)
        } catch (error) {
          console.error('Error joining room:', error)
          socket.emit('error', { message: 'Failed to join room' })
        }
      })

      socket.on('leave', async (data) => {
        try {
          const { room, userId } = data
          await socket.leave(room)
          if (userId) {
            await removeOnlineUser(room, userId)
            io.to(room).emit('userLeft', { userId, socketId: socket.id })
          }
          console.log(`Client ${socket.id} left room: ${room}`)
        } catch (error) {
          console.error('Error leaving room:', error)
          socket.emit('error', { message: 'Failed to leave room' })
        }
      })

      socket.on('message', async (message) => {
        try {
          const room = message.room || 'public'
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

      socket.on('error', (error) => {
        console.error('Socket error:', error)
      })

      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id)
      })
    })

    res.socket.server.io = io
  }

  res.end()
}

const config = {
  api: {
    bodyParser: false,
  },
}

export const runtime = 'nodejs'
export { config }
export const GET = ioHandler
export const POST = ioHandler 