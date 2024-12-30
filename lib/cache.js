// 缓存键前缀
const CACHE_PREFIX = 'dock_chat_'

// 缓存有效期（毫秒）
const CACHE_TTL = {
  MESSAGES: 10 * 60 * 1000,  // 增加到10分钟
  ROOMS: 5 * 60 * 1000,      // 增加到5分钟
  CONFIG: 2 * 60 * 1000,     // 增加到2分钟
  BATCH: 30 * 60 * 1000      // 批量数据缓存30分钟
}

// 获取缓存键
const getCacheKey = (username, type, id = '') => {
  return `${CACHE_PREFIX}${username}_${type}${id ? '_' + id : ''}`
}

// 批量设置缓存
export const setBatchCache = (username, items) => {
  try {
    const batchKey = getCacheKey(username, 'batch')
    const batchData = {
      data: items,
      timestamp: Date.now()
    }
    localStorage.setItem(batchKey, JSON.stringify(batchData))
  } catch (error) {
    console.error('Error setting batch cache:', error)
  }
}

// 批量获取缓存
export const getBatchCache = (username) => {
  try {
    const batchKey = getCacheKey(username, 'batch')
    const cached = localStorage.getItem(batchKey)
    if (!cached) return null

    const { data, timestamp } = JSON.parse(cached)
    if (Date.now() - timestamp > CACHE_TTL.BATCH) {
      localStorage.removeItem(batchKey)
      return null
    }

    return data
  } catch (error) {
    console.error('Error getting batch cache:', error)
    return null
  }
}

// 设置缓存
export const setCache = (username, type, data, id = '') => {
  try {
    const cacheData = {
      data,
      timestamp: Date.now()
    }
    localStorage.setItem(getCacheKey(username, type, id), JSON.stringify(cacheData))

    // 如果是消息或聊天室数据，也更新到批量缓存
    if (type === 'messages' || type === 'rooms') {
      const batchCache = getBatchCache(username) || {}
      batchCache[`${type}_${id || 'all'}`] = {
        data,
        timestamp: Date.now()
      }
      setBatchCache(username, batchCache)
    }
  } catch (error) {
    console.error('Error setting cache:', error)
  }
}

// 获取缓存
export const getCache = (username, type, id = '') => {
  try {
    // 首先检查单独的缓存
    const cacheKey = getCacheKey(username, type, id)
    const cached = localStorage.getItem(cacheKey)
    if (cached) {
      const { data, timestamp } = JSON.parse(cached)
      const ttl = CACHE_TTL[type.toUpperCase()] || CACHE_TTL.CONFIG
      if (Date.now() - timestamp <= ttl) {
        return data
      }
      localStorage.removeItem(cacheKey)
    }

    // 如果单独的缓存不存在或已过期，检查批量缓存
    const batchCache = getBatchCache(username)
    if (batchCache) {
      const batchData = batchCache[`${type}_${id || 'all'}`]
      if (batchData && Date.now() - batchData.timestamp <= CACHE_TTL[type.toUpperCase()]) {
        // 同时更新单独的缓存
        setCache(username, type, batchData.data, id)
        return batchData.data
      }
    }

    return null
  } catch (error) {
    console.error('Error getting cache:', error)
    return null
  }
}

// 预加载缓存
export const preloadCache = async (username, accessToken) => {
  try {
    const batchData = {}
    
    // 预加载配置
    const config = await getConfig(accessToken, username)
    if (config) {
      setCache(username, 'config', config)
      batchData.config = { data: config, timestamp: Date.now() }
    }

    // 预加载聊天室列表
    const rooms = await getChatRooms(accessToken, username)
    if (rooms) {
      setCache(username, 'rooms', rooms)
      batchData.rooms_all = { data: rooms, timestamp: Date.now() }

      // 预加载每个聊天室的最新消息
      for (const room of rooms) {
        const messages = await loadChatHistory(accessToken, username, room.id)
        if (messages) {
          setCache(username, 'messages', messages, room.id)
          batchData[`messages_${room.id}`] = { data: messages, timestamp: Date.now() }
        }
      }
    }

    // 保存批量数据
    setBatchCache(username, batchData)
  } catch (error) {
    console.error('Error preloading cache:', error)
  }
}

// 清除指定类型的缓存
export const clearCache = (username, type, id = '') => {
  try {
    if (id) {
      // 清除特定ID的缓存
      localStorage.removeItem(getCacheKey(username, type, id))
      
      // 同时更新批量缓存
      const batchCache = getBatchCache(username)
      if (batchCache) {
        delete batchCache[`${type}_${id}`]
        setBatchCache(username, batchCache)
      }
    } else {
      // 清除指定类型的所有缓存
      const prefix = getCacheKey(username, type)
      Object.keys(localStorage)
        .filter(key => key.startsWith(prefix))
        .forEach(key => localStorage.removeItem(key))
      
      // 清除批量缓存中的相关数据
      const batchCache = getBatchCache(username)
      if (batchCache) {
        Object.keys(batchCache)
          .filter(key => key.startsWith(type))
          .forEach(key => delete batchCache[key])
        setBatchCache(username, batchCache)
      }
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

    // 同时更新批量缓存
    const batchCache = getBatchCache(username)
    if (batchCache) {
      batchCache[`${type}_${id || 'all'}`] = {
        data,
        timestamp
      }
      setBatchCache(username, batchCache)
    }
  } catch (error) {
    console.error('Error updating cache:', error)
  }
} 