'use server'

// 更新用户配置
export async function updateConfig(accessToken, username, config) {
  try {
    const content = JSON.stringify(config, null, 2)
    const encodedContent = btoa(unescape(encodeURIComponent(content)))

    const response = await fetch(
      `https://api.github.com/repos/${username}/dock-chat-data/contents/config.json`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'Update config',
          content: encodedContent,
          sha: config.sha // 如果文件已存在，需要提供 SHA
        })
      }
    )

    if (!response.ok) {
      throw new Error('Failed to update config')
    }

    return await response.json()
  } catch (error) {
    console.error('Error updating config:', error)
    throw error
  }
}

// 保存聊天记录
export async function saveChatHistory(accessToken, username, roomId, messages) {
  try {
    const content = JSON.stringify(messages, null, 2)
    const encodedContent = btoa(unescape(encodeURIComponent(content)))

    const response = await fetch(
      `https://api.github.com/repos/${username}/dock-chat-data/contents/chats/${roomId}.json`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `Update chat history for ${roomId}`,
          content: encodedContent
        })
      }
    )

    if (!response.ok) {
      throw new Error('Failed to save chat history')
    }

    return await response.json()
  } catch (error) {
    console.error('Error saving chat history:', error)
    throw error
  }
}

// 更新聊天室缓存
export function updateChatRoomsCache(username, rooms) {
  try {
    localStorage.setItem(`chat_rooms_${username}`, JSON.stringify(rooms))
  } catch (error) {
    console.error('Error updating chat rooms cache:', error)
  }
}

// 更新用户配置缓存
export function updateUserConfigCache(username, config) {
  try {
    localStorage.setItem(`user_config_${username}`, JSON.stringify(config))
  } catch (error) {
    console.error('Error updating user config cache:', error)
  }
}

// 获取聊天室缓存
export function getChatRoomsCache(username) {
  try {
    const cached = localStorage.getItem(`chat_rooms_${username}`)
    return cached ? JSON.parse(cached) : null
  } catch (error) {
    console.error('Error getting chat rooms cache:', error)
    return null
  }
}

// 获取用户配置缓存
export function getUserConfigCache(username) {
  try {
    const cached = localStorage.getItem(`user_config_${username}`)
    return cached ? JSON.parse(cached) : null
  } catch (error) {
    console.error('Error getting user config cache:', error)
    return null
  }
}

// 清除用户缓存
export function clearUserCache(username) {
  try {
    localStorage.removeItem(`chat_rooms_${username}`)
    localStorage.removeItem(`user_config_${username}`)
  } catch (error) {
    console.error('Error clearing user cache:', error)
  }
}