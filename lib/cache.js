// 缓存管理工具
const cache = new Map()

// 设置缓存
export function setCache(key, value, ttl = 5 * 60 * 1000) { // 默认5分钟
  cache.set(key, {
    value,
    expiry: Date.now() + ttl
  })
}

// 获取缓存
export function getCache(key) {
  const item = cache.get(key)
  if (!item) return null

  if (Date.now() > item.expiry) {
    cache.delete(key)
    return null
  }

  return item.value
}

// 清除缓存
export function clearCache(key) {
  if (key) {
    cache.delete(key)
  } else {
    cache.clear()
  }
}

// 生成缓存键
export function generateCacheKey(userId, type, id = '') {
  return `${userId}:${type}:${id}`
}

// 预加载数据到缓存
export async function preloadCache(userId, accessToken) {
  try {
    const octokit = new Octokit({ auth: accessToken })
    const { data: user } = await octokit.users.getAuthenticated()

    // 加载配置
    try {
      const { data: configFile } = await octokit.repos.getContent({
        owner: user.login,
        repo: 'dock-chat-data',
        path: 'config.json',
        ref: 'main'
      })
      const config = JSON.parse(Buffer.from(configFile.content, 'base64').toString())
      setCache(generateCacheKey(userId, 'config'), config)
    } catch (error) {
      if (error.status !== 404) {
        console.error('Error preloading config:', error)
      }
    }

    // 加载聊天室列表
    try {
      const { data: roomsFile } = await octokit.repos.getContent({
        owner: user.login,
        repo: 'dock-chat-data',
        path: 'rooms.json',
        ref: 'main'
      })
      const { rooms } = JSON.parse(Buffer.from(roomsFile.content, 'base64').toString())
      setCache(generateCacheKey(userId, 'rooms'), rooms)

      // 预加载每个聊天室的消息
      for (const room of rooms) {
        try {
          const { data: messagesFile } = await octokit.repos.getContent({
            owner: user.login,
            repo: 'dock-chat-data',
            path: `chats/${room.id}.json`,
            ref: 'main'
          })
          const messages = JSON.parse(Buffer.from(messagesFile.content, 'base64').toString())
          setCache(generateCacheKey(userId, 'messages', room.id), messages)
        } catch (error) {
          if (error.status !== 404) {
            console.error(`Error preloading messages for room ${room.id}:`, error)
          }
        }
      }
    } catch (error) {
      if (error.status !== 404) {
        console.error('Error preloading rooms:', error)
      }
    }
  } catch (error) {
    console.error('Error preloading cache:', error)
  }
}

// 更新缓存中的消息
export function updateCachedMessages(userId, roomId, messages) {
  setCache(generateCacheKey(userId, 'messages', roomId), messages)
}

// 更新缓存中的聊天室列表
export function updateCachedRooms(userId, rooms) {
  setCache(generateCacheKey(userId, 'rooms'), rooms)
}

// 更新缓存中的配置
export function updateCachedConfig(userId, config) {
  setCache(generateCacheKey(userId, 'config'), config)
} 