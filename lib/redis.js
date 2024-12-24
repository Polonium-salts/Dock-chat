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
  const messages = await redis.lrange(`chat:${roomId}:messages`, 0, limit - 1)
  return messages.map(msg => JSON.parse(msg)).reverse()
}

export async function addChatMessage(roomId, message) {
  await redis.lpush(`chat:${roomId}:messages`, JSON.stringify(message))
  // 保持消息数量在限制范围内
  await redis.ltrim(`chat:${roomId}:messages`, 0, 99) // 保留最新的100条消息
  return message
}

// 在线用户相关的操作
export async function addOnlineUser(roomId, userId) {
  await redis.sadd(`chat:${roomId}:online`, userId)
}

export async function removeOnlineUser(roomId, userId) {
  await redis.srem(`chat:${roomId}:online`, userId)
}

export async function getOnlineUsers(roomId) {
  return await redis.smembers(`chat:${roomId}:online`)
}

// 聊天室相关的操作
export async function createChatRoom(roomId, name) {
  await redis.hset(`chat:rooms`, {
    [roomId]: JSON.stringify({
      id: roomId,
      name,
      createdAt: new Date().toISOString()
    })
  })
}

export async function getChatRoom(roomId) {
  const room = await redis.hget(`chat:rooms`, roomId)
  return room ? JSON.parse(room) : null
}

export async function getAllChatRooms() {
  const rooms = await redis.hgetall(`chat:rooms`)
  return Object.values(rooms).map(room => JSON.parse(room))
} 