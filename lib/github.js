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