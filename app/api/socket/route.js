import { Server } from 'socket.io'
import { getRedisClient } from '@/lib/redis'

const redis = getRedisClient()
const ioHandler = new Server({
  path: '/api/socket',
})

ioHandler.on('connection', (socket) => {
  console.log('Client connected')

  socket.on('join', async ({ room, userId }) => {
    try {
      await redis.hset('socket_rooms', socket.id, room)
      socket.join(room)
      console.log(`User ${userId} joined room ${room}`)
    } catch (error) {
      console.error('Error joining room:', error)
    }
  })

  socket.on('leave', async ({ room }) => {
    try {
      await redis.hdel('socket_rooms', socket.id)
      socket.leave(room)
      console.log(`User left room ${room}`)
    } catch (error) {
      console.error('Error leaving room:', error)
    }
  })

  socket.on('message', async (message) => {
    try {
      const room = await redis.hget('socket_rooms', socket.id)
      if (room) {
        ioHandler.to(room).emit('message', message)
        console.log(`Message sent to room ${room}:`, message)
      }
    } catch (error) {
      console.error('Error sending message:', error)
    }
  })

  socket.on('disconnect', async () => {
    try {
      const room = await redis.hget('socket_rooms', socket.id)
      if (room) {
        await redis.hdel('socket_rooms', socket.id)
        console.log(`User disconnected from room ${room}`)
      }
    } catch (error) {
      console.error('Error handling disconnect:', error)
    }
  })
})

export const GET = async (req, res) => {
  try {
    ioHandler.emit('ping', { data: 'ping' })
    return new Response('Socket is running')
  } catch (error) {
    console.error('Socket error:', error)
    return new Response('Socket error', { status: 500 })
  }
}

export const POST = async (req, res) => {
  try {
    const data = await req.json()
    ioHandler.emit(data.event, data.payload)
    return new Response('Message sent')
  } catch (error) {
    console.error('Socket error:', error)
    return new Response('Socket error', { status: 500 })
  }
} 