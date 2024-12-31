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
          updated_at: new Date().toISOString(),
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
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              message_count: 0,
              last_message: null
            },
            {
              id: 'system',
              name: '系统通知',
              type: 'system',
              unread: 0,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              message_count: 0,
              last_message: null
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
      },
      {
        path: 'chats/system/config.json',
        content: {
          id: 'system',
          name: '系统通知',
          type: 'system',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          message_count: 0,
          last_message: null
        }
      },
      {
        path: 'chats/system/messages.json',
        content: {
          roomId: 'system',
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
    // 确保消息按时间排序
    const sortedMessages = [...messages].sort((a, b) => 
      new Date(a.createdAt) - new Date(b.createdAt)
    )

    // 创建消息文件名
    const filename = `${roomId}/messages.json`
    const content = JSON.stringify({
      room_id: roomId,
      messages: sortedMessages,
      updated_at: new Date().toISOString()
    }, null, 2)

    const encodedContent = btoa(unescape(encodeURIComponent(content)))

    // 保存到 GitHub
    const response = await fetch(
      `https://api.github.com/repos/${username}/dock-chat-data/contents/rooms/${filename}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `Update chat history for room ${roomId}`,
          content: encodedContent,
          sha: await getFileSha(accessToken, username, `rooms/${filename}`)
        })
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to save chat history: ${response.statusText}`)
    }

    return sortedMessages
  } catch (error) {
    console.error('Error saving chat history:', error)
    throw error
  }
}

// 获取文件的 SHA
async function getFileSha(accessToken, username, path) {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${username}/dock-chat-data/contents/${path}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        }
      }
    )

    if (response.ok) {
      const data = await response.json()
      return data.sha
    }
    return null
  } catch (error) {
    return null
  }
}

// 加载聊天记录
export async function loadChatHistory(accessToken, username, roomId) {
  try {
    // 获取消息文件
    const response = await fetch(
      `https://api.github.com/repos/${username}/dock-chat-data/contents/rooms/${roomId}/messages.json`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        }
      }
    )

    if (!response.ok) {
      if (response.status === 404) {
        return []
      }
      throw new Error(`Failed to load chat history: ${response.statusText}`)
    }

    const data = await response.json()
    const content = JSON.parse(decodeURIComponent(escape(atob(data.content))))

    return content.messages || []
  } catch (error) {
    console.error('Error loading chat history:', error)
    if (error.message.includes('404')) {
      return []
    }
    throw error
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
    // 获取全局配置
    const globalConfig = await getConfig(accessToken, username)
    
    // 如果全局配置不存在，初始化它
    if (!globalConfig) {
      await createDataRepository(accessToken, username)
      return [{
        id: 'public',
        name: '公共聊天室',
        type: 'room',
        unread: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        message_count: 0,
        last_message: null
      }]
    }

    // 确保联系人列表存在
    if (!globalConfig.contacts) {
      globalConfig.contacts = [{
        id: 'public',
        name: '公共聊天室',
        type: 'room',
        unread: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        message_count: 0,
        last_message: null
      }]
      await updateConfig(accessToken, username, {
        ...globalConfig,
        contacts: globalConfig.contacts,
        last_updated: new Date().toISOString()
      })
    }

    // 从目录结构加载所有聊天室
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
        // 如果目录不存在，初始化公共聊天室
        await initializePublicChat(accessToken, username)
        return globalConfig.contacts
      }
      throw new Error(`Failed to get chat rooms: ${response.status}`)
    }

    const items = await response.json()
    const rooms = new Map()

    // 处理所有聊天室目录
    for (const item of items) {
      try {
        if (item.type === 'dir') {
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
            
            // 加载消息文件以获取最新状态
            const messagesResponse = await fetch(
              `https://api.github.com/repos/${username}/dock-chat-data/contents/chats/${item.name}/messages.json`,
              {
                headers: {
                  'Authorization': `Bearer ${accessToken}`,
                  'Accept': 'application/vnd.github.v3+json'
                }
              }
            )
            
            if (messagesResponse.ok) {
              const messagesData = await messagesResponse.json()
              const messages = JSON.parse(Buffer.from(messagesData.content, 'base64').toString())
              
              // 查找现有联系人信息
              const existingContact = globalConfig.contacts.find(c => c.id === item.name)
              
              rooms.set(item.name, {
                id: config.id || item.name,
                name: config.name || `聊天室 ${item.name}`,
                type: config.type || 'room',
                unread: existingContact?.unread || 0,
                last_message: messages.messages[messages.messages.length - 1] || null,
                message_count: messages.messages.length,
                created_at: config.created_at || new Date().toISOString(),
                updated_at: messages.updated_at || config.updated_at || new Date().toISOString()
              })
            }
          }
        }
      } catch (error) {
        console.error(`Error loading room ${item.name}:`, error)
      }
    }

    // 合并目录中的聊天室和全局配置中的联系人
    const mergedContacts = [...globalConfig.contacts]
    
    // 更新或添加从目录中找到的聊天室
    for (const [id, room] of rooms) {
      const existingIndex = mergedContacts.findIndex(c => c.id === id)
      if (existingIndex !== -1) {
        mergedContacts[existingIndex] = {
          ...mergedContacts[existingIndex],
          ...room
        }
      } else {
        mergedContacts.push(room)
      }
    }

    // 确保公共聊天室存在
    if (!mergedContacts.find(room => room.id === 'public')) {
      await initializePublicChat(accessToken, username)
      mergedContacts.unshift({
        id: 'public',
        name: '公共聊天室',
        type: 'room',
        unread: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        message_count: 0,
        last_message: null
      })
    }

    // 更新全局配置
    const sortedContacts = mergedContacts.sort((a, b) => {
      if (a.id === 'public') return -1
      if (b.id === 'public') return 1
      if (a.type === 'ai' && b.type !== 'ai') return -1
      if (a.type !== 'ai' && b.type === 'ai') return 1
      return new Date(b.updated_at || 0) - new Date(a.updated_at || 0)
    })

    await updateConfig(accessToken, username, {
      ...globalConfig,
      contacts: sortedContacts,
      last_updated: new Date().toISOString()
    })

    return sortedContacts
  } catch (error) {
    console.error('Error getting chat rooms:', error)
    return [{
      id: 'public',
      name: '公共聊天室',
      type: 'room',
      unread: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      message_count: 0,
      last_message: null
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
export async function initializeChatRoom(accessToken, username, roomId, roomName, type = 'room', extraData = {}) {
  try {
    const config = {
      id: roomId,
      name: roomName,
      type: type,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      message_count: 0,
      last_message: null,
      ...extraData
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

    // 更新全局配置
    const globalConfig = await getConfig(accessToken, username)
    if (globalConfig) {
      const updatedConfig = {
        ...globalConfig,
        contacts: [...(globalConfig.contacts || []), {
          id: roomId,
          name: roomName,
          type: type,
          unread: 0,
          ...extraData
        }],
        settings: {
          ...(globalConfig.settings || {}),
          activeChat: roomId
        },
        last_updated: new Date().toISOString()
      }
      await updateConfig(accessToken, username, updatedConfig)
    }

    return config
  } catch (error) {
    console.error('Error initializing chat room:', error)
    throw error
  }
} 