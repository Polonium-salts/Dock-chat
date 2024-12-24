import { Server } from 'socket.io'
import prisma from '../../../app/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'

const getBaseUrl = () => {
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return process.env.NEXTAUTH_URL || 'http://localhost:3000'
}

const ioHandler = async (request, response) => {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return new Response('Unauthorized', { status: 401 })
    }

    if (!response.socket.server.io) {
      console.log('Initializing Socket.IO server...')
      const io = new Server(response.socket.server, {
        path: '/api/socket',
        addTrailingSlash: false,
        cors: {
          origin: getBaseUrl(),
          methods: ['GET', 'POST'],
          credentials: true
        },
        transports: ['websocket', 'polling'],
        pingTimeout: 60000,
        pingInterval: 25000,
        secure: true,
        rejectUnauthorized: false,
        cookie: {
          secure: true,
          sameSite: 'none'
        }
      })

      io.on('connection', (socket) => {
        console.log('Client connected:', socket.id)

        socket.on('message', async (message) => {
          try {
            console.log('Message received:', message)
            
            // 保存消息到数据库
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

            // 广播消息给所有客户端
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

      response.socket.server.io = io
    }

    return new Response('OK')
  } catch (error) {
    console.error('Socket handler error:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}

export const GET = ioHandler
export const POST = ioHandler 