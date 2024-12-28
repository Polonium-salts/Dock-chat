// 缓存键前缀
const CACHE_PREFIX = 'dock_chat_'

// 缓存有效期（毫秒）
const CACHE_TTL = {
  MESSAGES: 5 * 60 * 1000, // 5分钟
  ROOMS: 2 * 60 * 1000,    // 2分钟
  CONFIG: 1 * 60 * 1000    // 1分钟
}

// 获取缓存键
const getCacheKey = (username, type, id = '') => {
  return `${CACHE_PREFIX}${username}_${type}${id ? '_' + id : ''}`
}

// 设置缓存
export const setCache = (username, type, data, id = '') => {
  try {
    const cacheData = {
      data,
      timestamp: Date.now()
    }
    localStorage.setItem(getCacheKey(username, type, id), JSON.stringify(cacheData))
  } catch (error) {
    console.error('Error setting cache:', error)
  }
}

// 获取缓存
export const getCache = (username, type, id = '') => {
  try {
    const cacheKey = getCacheKey(username, type, id)
    const cached = localStorage.getItem(cacheKey)
    if (!cached) return null

    const { data, timestamp } = JSON.parse(cached)
    const ttl = CACHE_TTL[type.toUpperCase()] || CACHE_TTL.CONFIG

    // 检查缓存是否过期
    if (Date.now() - timestamp > ttl) {
      localStorage.removeItem(cacheKey)
      return null
    }

    return data
  } catch (error) {
    console.error('Error getting cache:', error)
    return null
  }
}

// 清除指定类型的缓存
export const clearCache = (username, type, id = '') => {
  try {
    if (id) {
      // 清除特定ID的缓存
      localStorage.removeItem(getCacheKey(username, type, id))
    } else {
      // 清除指定类型的所有缓存
      const prefix = getCacheKey(username, type)
      Object.keys(localStorage)
        .filter(key => key.startsWith(prefix))
        .forEach(key => localStorage.removeItem(key))
    }
  } catch (error) {
    console.error('Error clearing cache:', error)
  }
}

// 清除用户的所有缓存
export const clearAllCache = (username) => {
  try {
    const prefix = `${CACHE_PREFIX}${username}_`
    Object.keys(localStorage)
      .filter(key => key.startsWith(prefix))
      .forEach(key => localStorage.removeItem(key))
  } catch (error) {
    console.error('Error clearing all cache:', error)
  }
}

// 更新缓存
export const updateCache = (username, type, data, id = '') => {
  try {
    const cacheKey = getCacheKey(username, type, id)
    const cached = localStorage.getItem(cacheKey)
    if (!cached) {
      setCache(username, type, data, id)
      return
    }

    const { timestamp } = JSON.parse(cached)
    const cacheData = {
      data,
      timestamp // 保持原有时间戳
    }
    localStorage.setItem(cacheKey, JSON.stringify(cacheData))
  } catch (error) {
    console.error('Error updating cache:', error)
  }
} 