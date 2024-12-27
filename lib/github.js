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
          },
          contacts: [
            {
              id: 'public',
              name: '公共聊天室',
              type: 'room',
              unread: 0
            }
          ]
        }
      },
      {
        path: 'chats/public/config.json',
        content: {
          id: 'public',
          name: '公共聊天室',
          type: 'room',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          message_count: 0,
          last_message: null
        }
      },
      {
        path: 'chats/public/messages.json',
        content: {
          roomId: 'public',
          messages: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      }
    ]

    // 创建所有初始文件
    for (const file of initialFiles) {
      try {
        const content = Buffer.from(JSON.stringify(file.content, null, 2)).toString('base64')
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
        console.log(`Successfully created ${file.path}`)
      } catch (error) {
        console.error(`Error creating ${file.path}:`, error)
        throw error
      }
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
    // 确保消息格式正确
    const formattedMessages = messages.map(msg => ({
      content: msg.content,
      user: {
        name: msg.user.name,
        image: msg.user.image,
        id: msg.user.id
      },
      createdAt: msg.createdAt,
      type: msg.type || 'message'
    }))

    // 确保聊天室目录存在
    const chatDir = `chats/${roomId}`
    const dirExists = await checkFileExists(accessToken, username, chatDir)
    if (!dirExists) {
      await initializeChatRoom(accessToken, username, roomId, 
        roomId === 'public' ? '公共聊天室' :
        roomId === 'kimi-ai' ? 'Kimi AI 助手' :
        `聊天室 ${roomId}`,
        roomId === 'kimi-ai' ? 'ai' : 'room'
      )
    }

    // 构建聊天记录文件路径
    const messagesPath = `${chatDir}/messages.json`
    const configPath = `${chatDir}/config.json`

    // 获取现有消息文件的 SHA
    let messageSha = null
    try {
      const existingFile = await fetch(
        `https://api.github.com/repos/${username}/dock-chat-data/contents/${messagesPath}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      ).then(res => res.json())

      if (!existingFile.message) {
        messageSha = existingFile.sha
      }
    } catch (error) {
      console.log('Messages file does not exist yet')
    }

    // 保存消息
    const messageContent = {
      roomId,
      messages: formattedMessages,
      updated_at: new Date().toISOString()
    }

    await createOrUpdateFile(
      accessToken,
      username,
      messagesPath,
      JSON.stringify(messageContent, null, 2),
      `Update messages for ${roomId}`,
      messageSha
    )

    // 更新配置文件
    let configSha = null
    let config = {
      id: roomId,
      name: roomId === 'public' ? '公共聊天室' :
            roomId === 'kimi-ai' ? 'Kimi AI 助手' :
            `聊天室 ${roomId}`,
      type: roomId === 'kimi-ai' ? 'ai' : 'room',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      message_count: formattedMessages.length,
      last_message: formattedMessages[formattedMessages.length - 1]
    }

    try {
      const existingConfig = await fetch(
        `https://api.github.com/repos/${username}/dock-chat-data/contents/${configPath}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      ).then(res => res.json())

      if (!existingConfig.message) {
        configSha = existingConfig.sha
        const existingContent = JSON.parse(Buffer.from(existingConfig.content, 'base64').toString())
        config = {
          ...existingContent,
          updated_at: new Date().toISOString(),
          message_count: formattedMessages.length,
          last_message: formattedMessages[formattedMessages.length - 1]
        }
      }
    } catch (error) {
      console.log('Config file does not exist yet')
    }

    await createOrUpdateFile(
      accessToken,
      username,
      configPath,
      JSON.stringify(config, null, 2),
      `Update config for ${roomId}`,
      configSha
    )

    return formattedMessages
  } catch (error) {
    console.error('Error saving chat history:', error)
    throw error
  }
}

// 获取文件的 SHA
async function getFileSha(accessToken, username, path) {
  try {
    const response = await fetch(`https://api.github.com/repos/${username}/dock-chat-data/contents/${path}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    })

    if (response.status === 404) {
      return null // 文件不存在
    }

    if (!response.ok) {
      throw new Error(`Failed to get file SHA: ${response.statusText}`)
    }

    const data = await response.json()
    return data.sha
  } catch (error) {
    if (error.message.includes('404')) {
      return null // 文件不存在
    }
    throw error
  }
}

// 加载聊天历史记录
export async function loadChatHistory(accessToken, username, roomId) {
  try {
    // 首先尝试从新格式加载
    const chatDir = `chats/${roomId}`
    const messagesPath = `${chatDir}/messages.json`
    
    // 尝试加载消息
    const response = await fetch(
      `https://api.github.com/repos/${username}/dock-chat-data/contents/${messagesPath}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    )

    if (response.ok) {
      const data = await response.json()
      const content = JSON.parse(Buffer.from(data.content, 'base64').toString())
      return content.messages || []
    }

    // 如果新格式不存在，尝试从旧格式加载
    const oldFormatPath = `chats/${roomId}.json`
    const oldFormatResponse = await fetch(
      `https://api.github.com/repos/${username}/dock-chat-data/contents/${oldFormatPath}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    )

    if (oldFormatResponse.ok) {
      const data = await oldFormatResponse.json()
      const content = JSON.parse(Buffer.from(data.content, 'base64').toString())
      
      // 如果找到旧格式的消息，迁移到新格式
      if (content.messages && content.messages.length > 0) {
        await migrateChatRoom(accessToken, username, roomId, content)
        return content.messages
      }
    }

    // 如果都没有找到，初始化新的聊天室
    if (roomId === 'public' || roomId === 'kimi-ai') {
      await initializeChatRoom(
        accessToken,
        username,
        roomId,
        roomId === 'public' ? '公共聊天室' : 'Kimi AI 助手',
        roomId === 'kimi-ai' ? 'ai' : 'room'
      )
    }

    return []
  } catch (error) {
    console.error('Error loading chat history:', error)
    return []
  }
}

// 迁移聊天室数据
async function migrateChatRoom(accessToken, username, roomId, oldContent) {
  try {
    // 创建新格式的配置
    const config = {
      id: roomId,
      name: oldContent.name || (roomId === 'public' ? '公共聊天室' : 
            roomId === 'kimi-ai' ? 'Kimi AI 助手' : `聊天室 ${roomId}`),
      type: roomId === 'kimi-ai' ? 'ai' : 'room',
      created_at: oldContent.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      message_count: oldContent.messages?.length || 0,
      last_message: oldContent.messages?.[oldContent.messages.length - 1] || null
    }

    // 创建新格式的消息文件
    const messages = {
      roomId,
      messages: oldContent.messages || [],
      created_at: oldContent.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // 保存新格式的文件
    await Promise.all([
      createOrUpdateFile(
        accessToken,
        username,
        `chats/${roomId}/config.json`,
        JSON.stringify(config, null, 2),
        `Migrate config for ${roomId}`
      ),
      createOrUpdateFile(
        accessToken,
        username,
        `chats/${roomId}/messages.json`,
        JSON.stringify(messages, null, 2),
        `Migrate messages for ${roomId}`
      )
    ])

    console.log(`Successfully migrated chat room: ${roomId}`)
  } catch (error) {
    console.error(`Error migrating chat room ${roomId}:`, error)
    throw error
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
    // 首先检查并确保公共聊天室存在
    await initializePublicChat(accessToken, username)

    // 获取所有聊天记录文件和目录
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
        return [{
          id: 'public',
          name: '公共聊天室',
          type: 'room',
          unread: 0
        }]
      }
      throw new Error(`Failed to get chat rooms: ${response.status}`)
    }

    const items = await response.json()
    const rooms = new Map() // 使用 Map 来防止重复

    // 处理所有项目
    for (const item of items) {
      try {
        if (item.type === 'file' && item.name.endsWith('.json')) {
          // 处理旧格式的文件
          const roomId = item.name.replace('.json', '')
          const content = await fetch(item.download_url).then(res => res.json())
          if (!rooms.has(roomId)) {
            rooms.set(roomId, {
              id: roomId,
              name: content.name || `聊天室 ${roomId}`,
              type: roomId === 'kimi-ai' ? 'ai' : 'room',
              unread: 0,
              lastMessage: content.messages?.[content.messages.length - 1]
            })
          }
        } else if (item.type === 'dir') {
          // 处理新格式的目录
          const configResponse = await fetch(
            `https://api.github.com/repos/${username}/dock-chat-data/contents/chats/${item.name}/config.json`,
            {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/vnd.github.v3+json'
              }
            }
          )

          if (configResponse.ok) {
            const configData = await configResponse.json()
            const config = JSON.parse(Buffer.from(configData.content, 'base64').toString())
            rooms.set(item.name, {
              id: config.id || item.name,
              name: config.name || `聊天室 ${item.name}`,
              type: config.type || 'room',
              unread: 0,
              lastMessage: config.last_message
            })
          }
        }
      } catch (error) {
        console.error(`Error loading room ${item.name}:`, error)
      }
    }

    // 转换为数组并确保公共聊天室存在
    let roomsArray = Array.from(rooms.values())
    if (!roomsArray.find(room => room.id === 'public')) {
      roomsArray.unshift({
        id: 'public',
        name: '公共聊天室',
        type: 'room',
        unread: 0
      })
    }

    // 按照类型和名称排序
    return roomsArray.sort((a, b) => {
      if (a.id === 'public') return -1
      if (b.id === 'public') return 1
      if (a.type === 'ai' && b.type !== 'ai') return -1
      if (a.type !== 'ai' && b.type === 'ai') return 1
      return a.name.localeCompare(b.name)
    })
  } catch (error) {
    console.error('Error getting chat rooms:', error)
    return [{
      id: 'public',
      name: '公共聊天室',
      type: 'room',
      unread: 0
    }]
  }
}

// 检查数据仓库是否存在
export async function checkDataRepository(accessToken, username) {
  try {
    const response = await fetch(`https://api.github.com/repos/${username}/dock-chat-data`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    })

    if (response.status === 404) {
      // 仓库不存在，需要创建
      return false
    }

    if (!response.ok) {
      throw new Error(`Failed to check repository: ${response.status}`)
    }

    // 仓库存在，检查必要的文件结构
    const [configExists, publicChatExists] = await Promise.all([
      checkFileExists(accessToken, username, 'config.json'),
      checkFileExists(accessToken, username, 'chats/public.json')
    ])

    if (!configExists || !publicChatExists) {
      // 如果缺少必要的文件，初始化它们
      await initializeRepository(accessToken, username)
    }

    return true
  } catch (error) {
    console.error('Error checking repository:', error)
    // 如果是网络错误或其他临时错误，不应该认为需要创建仓库
    return true
  }
}

// 检查文件是否存在
async function checkFileExists(accessToken, username, path) {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${username}/dock-chat-data/contents/${path}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    )
    return response.status === 200
  } catch (error) {
    return false
  }
}

// 初始化仓库的必要文件
async function initializeRepository(accessToken, username) {
  try {
    // 初始化配置文件
    if (!await checkFileExists(accessToken, username, 'config.json')) {
      const config = {
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
      
      await createOrUpdateFile(
        accessToken,
        username,
        'config.json',
        JSON.stringify(config, null, 2),
        'Initialize config.json'
      )
    }

    // 初始化公共聊天室
    if (!await checkFileExists(accessToken, username, 'chats/public.json')) {
      const publicChat = {
        id: 'public',
        name: '公共聊天室',
        messages: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      await createOrUpdateFile(
        accessToken,
        username,
        'chats/public.json',
        JSON.stringify(publicChat, null, 2),
        'Initialize public chat room'
      )
    }
  } catch (error) {
    console.error('Error initializing repository:', error)
  }
}

// 创建或更新文件
async function createOrUpdateFile(accessToken, username, path, content, message, sha = null) {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${username}/dock-chat-data/contents/${path}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.github.v3+json'
        },
        body: JSON.stringify({
          message: message,
          content: Buffer.from(content).toString('base64'),
          ...(sha ? { sha } : {})
        })
      }
    )

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(`Failed to create/update file: ${response.status} - ${JSON.stringify(errorData)}`)
    }

    return await response.json()
  } catch (error) {
    console.error(`Error creating/updating ${path}:`, error)
    throw error
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

// 初始化公共聊天室
export async function initializePublicChat(accessToken, username) {
  try {
    // 检查公共聊天室目录是否存在
    const publicChatPath = 'chats/public'
    const configExists = await checkFileExists(accessToken, username, `${publicChatPath}/config.json`)
    const messagesExists = await checkFileExists(accessToken, username, `${publicChatPath}/messages.json`)

    if (!configExists || !messagesExists) {
      // 创建公共聊天室的配置和消息文件
      await initializeChatRoom(
        accessToken,
        username,
        'public',
        '公共聊天室',
        'room'
      )
    }
  } catch (error) {
    console.error('Error initializing public chat:', error)
    throw error
  }
}

// 初始化聊天室
export async function initializeChatRoom(accessToken, username, roomId, roomName, type = 'room') {
  try {
    const config = {
      id: roomId,
      name: roomName,
      type: type,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      message_count: 0,
      last_message: null
    }

    const messages = {
      roomId,
      messages: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // 创建配置文件
    await createOrUpdateFile(
      accessToken,
      username,
      `chats/${roomId}/config.json`,
      JSON.stringify(config, null, 2),
      `Initialize chat room ${roomId}`
    )

    // 创建消息文件
    await createOrUpdateFile(
      accessToken,
      username,
      `chats/${roomId}/messages.json`,
      JSON.stringify(messages, null, 2),
      `Initialize messages for ${roomId}`
    )

    return config
  } catch (error) {
    console.error('Error initializing chat room:', error)
    throw error
  }
} 