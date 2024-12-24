import { Server } from 'socket.io'
import { prisma } from '@/lib/prisma'

const ioHandler = (req, res) => {
  if (!res.socket.server.io) {
    const io = new Server(res.socket.server, {
      path: '/api/socket',
      addTrailingSlash: false,
    })

    io.on('connection', socket => {
      console.log('Socket connected')

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
          io.emit('message', savedMessage)
        } catch (error) {
          console.error('Failed to save message:', error)
        }
      })

      socket.on('disconnect', () => {
        console.log('Socket disconnected')
      })
    })

    res.socket.server.io = io
  }

  res.end()
}

export const GET = ioHandler
export const POST = ioHandler 