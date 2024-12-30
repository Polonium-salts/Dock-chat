export const CACHE_KEYS = {
  CHAT_MESSAGES: 'dock_chat_messages',
  CHAT_ROOMS: 'dock_chat_rooms',
  USER_CONFIG: 'dock_chat_user_config',
  CACHE_VERSION: 'dock_chat_cache_version'
}

export const CACHE_VERSION = '1.0.0'

// 设置缓存
export function setCache(key, data, username) {
  try {
    const cacheKey = `${key}_${username}`
    localStorage.setItem(cacheKey, JSON.stringify({
      data,
      timestamp: Date.now(),
      version: CACHE_VERSION
    }))
  } catch (error) {
    console.error('Error setting cache:', error)
  }
}

// 获取缓存
export function getCache(key, username, maxAge = 5 * 60 * 1000) { // 默认5分钟过期
  try {
    const cacheKey = `${key}_${username}`
    const cached = localStorage.getItem(cacheKey)
    if (!cached) return null

    const { data, timestamp, version } = JSON.parse(cached)
    
    // 检查缓存版本
    if (version !== CACHE_VERSION) {
      localStorage.removeItem(cacheKey)
      return null
    }

    // 检查缓存是否过期
    if (Date.now() - timestamp > maxAge) {
      localStorage.removeItem(cacheKey)
      return null
    }

    return data
  } catch (error) {
    console.error('Error getting cache:', error)
    return null
  }
}

// 清除指定用户的所有缓存
export function clearUserCache(username) {
  try {
    Object.values(CACHE_KEYS).forEach(key => {
      localStorage.removeItem(`${key}_${username}`)
    })
  } catch (error) {
    console.error('Error clearing user cache:', error)
  }
}

// 更新聊天记录缓存
export function updateChatMessagesCache(username, roomId, messages) {
  try {
    const cacheKey = `${CACHE_KEYS.CHAT_MESSAGES}_${username}`
    const cached = localStorage.getItem(cacheKey)
    let chatMessages = {}

    if (cached) {
      const { data } = JSON.parse(cached)
      chatMessages = data
    }

    chatMessages[roomId] = messages

    setCache(CACHE_KEYS.CHAT_MESSAGES, chatMessages, username)
  } catch (error) {
    console.error('Error updating chat messages cache:', error)
  }
}

// 获取聊天记录缓存
export function getChatMessagesCache(username, roomId) {
  try {
    const cached = getCache(CACHE_KEYS.CHAT_MESSAGES, username)
    if (!cached) return null
    return cached[roomId] || null
  } catch (error) {
    console.error('Error getting chat messages cache:', error)
    return null
  }
}

// 更新聊天室列表缓存
export function updateChatRoomsCache(username, rooms) {
  setCache(CACHE_KEYS.CHAT_ROOMS, rooms, username)
}

// 获取聊天室列表缓存
export function getChatRoomsCache(username) {
  return getCache(CACHE_KEYS.CHAT_ROOMS, username)
}

// 更新用户配置缓存
export function updateUserConfigCache(username, config) {
  setCache(CACHE_KEYS.USER_CONFIG, config, username)
}

// 获取用户配置缓存
export function getUserConfigCache(username) {
  return getCache(CACHE_KEYS.USER_CONFIG, username)
} 