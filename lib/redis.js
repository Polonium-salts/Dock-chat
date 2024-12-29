import { Redis } from '@upstash/redis'

if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
  throw new Error('Redis configuration is incomplete')
}

export const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
})

// 聊天室消息相关的操作
export async function getChatMessages(roomId, limit = 50) {
  try {
    const messages = await redis.lrange(`chat:${roomId}:messages`, 0, limit - 1)
    return messages.map(msg => JSON.parse(msg)).reverse()
  } catch (error) {
    console.error('Error getting chat messages:', error)
    return []
  }
}

export async function addChatMessage(roomId, message) {
  try {
    const messageWithTimestamp = {
      ...message,
      timestamp: new Date().toISOString()
    }
    await redis.lpush(`chat:${roomId}:messages`, JSON.stringify(messageWithTimestamp))
    await redis.ltrim(`chat:${roomId}:messages`, 0, 99)
    return messageWithTimestamp
  } catch (error) {
    console.error('Error adding chat message:', error)
    throw error
  }
}

// 在线用户相关的操作
export async function addOnlineUser(roomId, userId) {
  try {
    await redis.sadd(`chat:${roomId}:online`, userId)
  } catch (error) {
    console.error('Error adding online user:', error)
  }
}

export async function removeOnlineUser(roomId, userId) {
  try {
    await redis.srem(`chat:${roomId}:online`, userId)
  } catch (error) {
    console.error('Error removing online user:', error)
  }
}

export async function getOnlineUsers(roomId) {
  try {
    return await redis.smembers(`chat:${roomId}:online`)
  } catch (error) {
    console.error('Error getting online users:', error)
    return []
  }
}

// 聊天室相关的操作
export async function createChatRoom(roomId, name) {
  try {
    await redis.hset(`chat:rooms`, {
      [roomId]: JSON.stringify({
        id: roomId,
        name,
        createdAt: new Date().toISOString()
      })
    })
  } catch (error) {
    console.error('Error creating chat room:', error)
    throw error
  }
}

export async function getChatRoom(roomId) {
  try {
    const room = await redis.hget(`chat:rooms`, roomId)
    return room ? JSON.parse(room) : null
  } catch (error) {
    console.error('Error getting chat room:', error)
    return null
  }
}

export async function getAllChatRooms() {
  try {
    const rooms = await redis.hgetall(`chat:rooms`)
    return Object.values(rooms).map(room => JSON.parse(room))
  } catch (error) {
    console.error('Error getting all chat rooms:', error)
    return []
  }
} 