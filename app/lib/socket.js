import { Server } from 'socket.io'
import prisma from './prisma'

export const config = {
  api: {
    bodyParser: false,
  },
}

export const initSocket = (server) => {
  if (!server.io) {
    console.log('Initializing Socket.IO server...')
    const io = new Server(server, {
      path: '/api/socket',
      addTrailingSlash: false,
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
        credentials: true
      },
      transports: ['websocket', 'polling'],
    })

    io.on('connection', (socket) => {
      console.log('Client connected:', socket.id)

      socket.on('message', async (message) => {
        try {
          console.log('Message received:', message)
          
          const savedMessage = await prisma.message.create({
            data: {
              content: message.content,
              user: {
                connectOrCreate: {
                  where: { id: message.user.id },
                  create: {
                    id: message.user.id,
                    name: message.user.name
                  }
                }
              }
            },
            include: {
              user: true
            }
          })

          io.emit('message', {
            ...message,
            id: savedMessage.id
          })
        } catch (error) {
          console.error('Error saving message:', error)
          socket.emit('error', 'Failed to save message')
        }
      })

      socket.on('error', (error) => {
        console.error('Socket error:', error)
      })

      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id)
      })
    })

    server.io = io
  }
  return server.io
} 