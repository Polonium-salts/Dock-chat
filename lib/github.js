// GitHub API 操作函数
export async function createDataRepository(accessToken, username) {
  try {
    // 创建仓库
    const repoResponse = await fetch('https://api.github.com/user/repos', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json'
      },
      body: JSON.stringify({
        name: 'dock-chat-data',
        description: 'Personal data storage for Dock Chat',
        private: true,
        auto_init: true
      })
    })

    if (!repoResponse.ok) {
      throw new Error(`Failed to create repository: ${repoResponse.status}`)
    }

    const repo = await repoResponse.json()

    // 创建初始配置文件
    const config = {
      version: '1.0.0',
      created_at: new Date().toISOString(),
      user: username,
      settings: {
        theme: 'light',
        language: 'zh-CN',
        notifications: true,
        activeChat: 'public'
      },
      contacts: [
        {
          id: 'public',
          name: '公共聊天室',
          type: 'room',
          unread: 0,
          lastMessage: null,
          createdAt: new Date().toISOString()
        }
      ],
      kimi_settings: {
        api_key: null,
        conversation_history: [],
        isEnabled: false
      },
      chat_history: {
        public: []
      }
    }

    // 将配置文件提交到仓库
    const content = Buffer.from(JSON.stringify(config, null, 2)).toString('base64')
    await fetch(`https://api.github.com/repos/${username}/dock-chat-data/contents/config.json`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json'
      },
      body: JSON.stringify({
        message: 'Initial config',
        content: content
      })
    })

    return repo
  } catch (error) {
    console.error('Error creating data repository:', error)
    throw error
  }
}

export async function getConfig(accessToken, username) {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${username}/dock-chat-data/contents/config.json`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    )

    if (!response.ok) {
      if (response.status === 404) {
        return null // 仓库或配置文件不存在
      }
      throw new Error(`Failed to get config: ${response.status}`)
    }

    const data = await response.json()
    const content = Buffer.from(data.content, 'base64').toString('utf-8')
    return JSON.parse(content)
  } catch (error) {
    console.error('Error getting config:', error)
    throw error
  }
}

export async function updateConfig(accessToken, username, config) {
  try {
    // 先获取当前文件的 SHA
    const currentFile = await fetch(
      `https://api.github.com/repos/${username}/dock-chat-data/contents/config.json`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    ).then(res => res.json())

    // 更新文件
    const content = Buffer.from(JSON.stringify(config, null, 2)).toString('base64')
    const response = await fetch(
      `https://api.github.com/repos/${username}/dock-chat-data/contents/config.json`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.github.v3+json'
        },
        body: JSON.stringify({
          message: 'Update config',
          content: content,
          sha: currentFile.sha
        })
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to update config: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Error updating config:', error)
    throw error
  }
}

// 检查数据仓库是否存在
export async function checkDataRepository(accessToken, username) {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${username}/dock-chat-data`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    )
    return response.ok
  } catch (error) {
    console.error('Error checking data repository:', error)
    return false
  }
}

// 保存聊天记录
export async function saveChatHistory(accessToken, username, roomId, messages) {
  try {
    const config = await getConfig(accessToken, username)
    if (!config) {
      throw new Error('Config not found')
    }

    // 更新聊天记录
    config.chat_history[roomId] = messages

    // 更新最后一条消息
    const contact = config.contacts.find(c => c.id === roomId)
    if (contact && messages.length > 0) {
      contact.lastMessage = messages[messages.length - 1]
    }

    return await updateConfig(accessToken, username, config)
  } catch (error) {
    console.error('Error saving chat history:', error)
    throw error
  }
}

// 加载聊天记录
export async function loadChatHistory(accessToken, username, roomId) {
  try {
    const config = await getConfig(accessToken, username)
    if (!config || !config.chat_history[roomId]) {
      return []
    }
    return config.chat_history[roomId]
  } catch (error) {
    console.error('Error loading chat history:', error)
    return []
  }
} 