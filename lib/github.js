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

    // 创建初始目录结构和配置文件
    const initialFiles = [
      {
        path: 'config.json',
        content: {
          version: '1.0.0',
          created_at: new Date().toISOString(),
          user: username,
          settings: {
            theme: 'light',
            language: 'zh-CN',
            notifications: true,
            activeChat: 'public'
          }
        }
      },
      {
        path: 'chats/public/config.json',
        content: {
          id: 'public',
          name: '公共聊天室',
          type: 'room',
          created_at: new Date().toISOString(),
          last_message: null,
          participants: []
        }
      },
      {
        path: 'chats/public/messages.txt',
        content: ''
      },
      {
        path: 'chats/ai/config.json',
        content: {
          id: 'ai',
          name: 'AI 助手',
          type: 'ai',
          created_at: new Date().toISOString(),
          settings: {
            api_key: null,
            model: 'kimi'
          }
        }
      },
      {
        path: 'chats/ai/messages.txt',
        content: ''
      }
    ]

    // 创建所有初始文件
    for (const file of initialFiles) {
      const content = Buffer.from(
        typeof file.content === 'string' 
          ? file.content 
          : JSON.stringify(file.content, null, 2)
      ).toString('base64')

      await fetch(`https://api.github.com/repos/${username}/dock-chat-data/contents/${file.path}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.github.v3+json'
        },
        body: JSON.stringify({
          message: `Initialize ${file.path}`,
          content: content
        })
      })
    }

    return repo
  } catch (error) {
    console.error('Error creating data repository:', error)
    throw error
  }
}

// 保存聊天记录
export async function saveChatHistory(accessToken, username, roomId, messages) {
  try {
    // 确保聊天室目录存在
    const chatDir = `chats/${roomId}`
    await ensureChatDirectory(accessToken, username, roomId)

    // 更新消息文件
    const messagesContent = messages.map(msg => JSON.stringify({
      timestamp: msg.createdAt,
      user: {
        id: msg.user.id,
        name: msg.user.name,
        image: msg.user.image
      },
      content: msg.content,
      type: msg.type || 'text'
    })).join('\n')

    // 获取现有文件的 SHA（如果存在）
    let sha = null
    try {
      const currentFile = await fetch(
        `https://api.github.com/repos/${username}/dock-chat-data/contents/${chatDir}/messages.txt`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      ).then(res => res.json())
      
      if (!currentFile.message) {
        sha = currentFile.sha
      }
    } catch (error) {
      console.log('Messages file does not exist yet')
    }

    // 保存消息文件
    const content = Buffer.from(messagesContent).toString('base64')
    await fetch(
      `https://api.github.com/repos/${username}/dock-chat-data/contents/${chatDir}/messages.txt`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.github.v3+json'
        },
        body: JSON.stringify({
          message: `Update messages for ${roomId}`,
          content: content,
          ...(sha ? { sha } : {})
        })
      }
    )

    // 更新配置文件
    const config = {
      id: roomId,
      name: messages[0]?.room || roomId,
      type: roomId === 'ai' ? 'ai' : 'room',
      last_updated: new Date().toISOString(),
      last_message: messages[messages.length - 1] || null,
      message_count: messages.length
    }

    await updateChatConfig(accessToken, username, roomId, config)
  } catch (error) {
    console.error('Error saving chat history:', error)
    throw error
  }
}

// 加载聊天记录
export async function loadChatHistory(accessToken, username, roomId) {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${username}/dock-chat-data/contents/chats/${roomId}/messages.txt`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    )

    if (!response.ok) {
      if (response.status === 404) {
        return []
      }
      throw new Error(`Failed to load chat history: ${response.status}`)
    }

    const data = await response.json()
    const content = Buffer.from(data.content, 'base64').toString('utf-8')
    
    // 解析消息记录
    return content
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        const msg = JSON.parse(line)
        return {
          content: msg.content,
          user: msg.user,
          createdAt: msg.timestamp,
          type: msg.type || 'text'
        }
      })
  } catch (error) {
    console.error('Error loading chat history:', error)
    return []
  }
}

// 确保聊天室目录存在
async function ensureChatDirectory(accessToken, username, roomId) {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${username}/dock-chat-data/contents/chats/${roomId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    )

    if (response.status === 404) {
      // 创建目录和初始配置
      const config = {
        id: roomId,
        name: roomId,
        type: roomId === 'ai' ? 'ai' : 'room',
        created_at: new Date().toISOString(),
        last_message: null,
        message_count: 0
      }

      const content = Buffer.from(JSON.stringify(config, null, 2)).toString('base64')
      await fetch(
        `https://api.github.com/repos/${username}/dock-chat-data/contents/chats/${roomId}/config.json`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/vnd.github.v3+json'
          },
          body: JSON.stringify({
            message: `Create chat directory for ${roomId}`,
            content: content
          })
        }
      )
    }
  } catch (error) {
    console.error('Error ensuring chat directory:', error)
    throw error
  }
}

// 更新聊天室配置
async function updateChatConfig(accessToken, username, roomId, config) {
  try {
    // 获取现有配置文件的 SHA
    let sha = null
    try {
      const currentFile = await fetch(
        `https://api.github.com/repos/${username}/dock-chat-data/contents/chats/${roomId}/config.json`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      ).then(res => res.json())
      
      if (!currentFile.message) {
        sha = currentFile.sha
      }
    } catch (error) {
      console.log('Config file does not exist yet')
    }

    // 更新配置文件
    const content = Buffer.from(JSON.stringify(config, null, 2)).toString('base64')
    await fetch(
      `https://api.github.com/repos/${username}/dock-chat-data/contents/chats/${roomId}/config.json`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.github.v3+json'
        },
        body: JSON.stringify({
          message: `Update config for ${roomId}`,
          content: content,
          ...(sha ? { sha } : {})
        })
      }
    )
  } catch (error) {
    console.error('Error updating chat config:', error)
    throw error
  }
}

// 获取全局配置
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
        return null
      }
      throw new Error(`Failed to get config: ${response.status}`)
    }

    const data = await response.json()
    const content = Buffer.from(data.content, 'base64').toString('utf-8')
    return JSON.parse(content)
  } catch (error) {
    console.error('Error getting config:', error)
    return null
  }
}

// 更新全局配置
export async function updateConfig(accessToken, username, config) {
  try {
    // 获取现有文件的 SHA
    let sha = null
    try {
      const currentFile = await fetch(
        `https://api.github.com/repos/${username}/dock-chat-data/contents/config.json`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      ).then(res => res.json())
      
      if (!currentFile.message) {
        sha = currentFile.sha
      }
    } catch (error) {
      console.log('Config file does not exist yet')
    }

    // 更新配置文件
    const content = Buffer.from(JSON.stringify(config, null, 2)).toString('base64')
    await fetch(
      `https://api.github.com/repos/${username}/dock-chat-data/contents/config.json`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.github.v3+json'
        },
        body: JSON.stringify({
          message: 'Update global config',
          content: content,
          ...(sha ? { sha } : {})
        })
      }
    )
  } catch (error) {
    console.error('Error updating config:', error)
    throw error
  }
}

// 获取聊天室列表
export async function getChatRooms(accessToken, username) {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${username}/dock-chat-data/contents/chats`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    )

    if (!response.ok) {
      if (response.status === 404) {
        return []
      }
      throw new Error(`Failed to get chat rooms: ${response.status}`)
    }

    const directories = await response.json()
    const rooms = []

    // 获取每个聊天室的配置
    for (const dir of directories) {
      if (dir.type === 'dir') {
        try {
          const configResponse = await fetch(
            `https://api.github.com/repos/${username}/dock-chat-data/contents/chats/${dir.name}/config.json`,
            {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/vnd.github.v3+json'
              }
            }
          )

          if (configResponse.ok) {
            const configData = await configResponse.json()
            const config = JSON.parse(Buffer.from(configData.content, 'base64').toString('utf-8'))
            rooms.push({
              id: config.id,
              name: config.name,
              type: config.type,
              unread: 0, // 这个值需要在前端计算
              lastMessage: config.last_message
            })
          }
        } catch (error) {
          console.error(`Error loading config for room ${dir.name}:`, error)
        }
      }
    }

    return rooms
  } catch (error) {
    console.error('Error getting chat rooms:', error)
    return []
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
    console.error('Error checking repository:', error)
    return false
  }
}

// 获取仓库统计信息
export async function getRepositoryStats(accessToken, username) {
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

    if (!response.ok) {
      throw new Error(`Failed to get repository stats: ${response.status}`)
    }

    const data = await response.json()
    return {
      size: data.size,
      created_at: data.created_at,
      updated_at: data.updated_at,
      private: data.private,
      default_branch: data.default_branch
    }
  } catch (error) {
    console.error('Error getting repository stats:', error)
    return null
  }
} 