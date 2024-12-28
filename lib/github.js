import { getCache, setCache, updateCache, clearCache } from './cache'
import { Octokit } from '@octokit/core'

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
    // 确保消息格式正确
    const formattedMessages = messages.map(msg => ({
      content: msg.content,
      user: {
        name: msg.user.name,
        image: msg.user.image,
        id: msg.user.id
      },
      createdAt: msg.createdAt || new Date().toISOString(),
      type: msg.type || 'message'
    }))

    // 确保聊天室目录存在
    const chatDir = `chats/${roomId}`
    const messagesPath = `${chatDir}/messages.json`
    const configPath = `${chatDir}/config.json`

    // 获取现有消息文件的 SHA 和内容
    let messageSha = null
    let existingMessages = []
    let existingConfig = null
    let configSha = null

    try {
      // 获取现有消息
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
        const content = JSON.parse(Buffer.from(existingFile.content, 'base64').toString())
        if (content.messages && Array.isArray(content.messages)) {
          existingMessages = content.messages
        }
      }

      // 获取现有配置
      const existingConfigFile = await fetch(
        `https://api.github.com/repos/${username}/dock-chat-data/contents/${configPath}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      ).then(res => res.json())

      if (!existingConfigFile.message) {
        configSha = existingConfigFile.sha
        existingConfig = JSON.parse(Buffer.from(existingConfigFile.content, 'base64').toString())
      }
    } catch (error) {
      console.log('Files do not exist yet, will create new ones')
    }

    // 如果聊天室不存在，先创建它
    if (!existingConfig) {
      await initializeChatRoom(
        accessToken,
        username,
        roomId,
        roomId === 'public' ? '公共聊天室' :
        roomId === 'kimi-ai' ? 'Kimi AI 助手' :
        `聊天室 ${roomId}`,
        roomId === 'kimi-ai' ? 'ai' : 'room'
      )
      
      // 重新获取配置
      const configResponse = await fetch(
        `https://api.github.com/repos/${username}/dock-chat-data/contents/${configPath}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      ).then(res => res.json())
      
      if (!configResponse.message) {
        configSha = configResponse.sha
        existingConfig = JSON.parse(Buffer.from(configResponse.content, 'base64').toString())
      }
    }

    // 合并现有消息���新消息，确保不重复
    const messageIds = new Set(existingMessages.map(m => m.createdAt + m.user.id))
    const uniqueNewMessages = formattedMessages.filter(m => !messageIds.has(m.createdAt + m.user.id))
    const allMessages = [...existingMessages, ...uniqueNewMessages]

    // 按时间排序
    allMessages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))

    // 保存消息
    const messageContent = {
      roomId,
      messages: allMessages,
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

    // 更新聊天室配置
    const updatedConfig = {
      ...existingConfig,
      updated_at: new Date().toISOString(),
      message_count: allMessages.length,
      last_message: allMessages[allMessages.length - 1] || null
    }

    await createOrUpdateFile(
      accessToken,
      username,
      configPath,
      JSON.stringify(updatedConfig, null, 2),
      `Update config for ${roomId}`,
      configSha
    )

    // 更新全局配置
    const globalConfig = await getConfig(accessToken, username)
    if (globalConfig) {
      const contacts = globalConfig.contacts || []
      const contactIndex = contacts.findIndex(c => c.id === roomId)
      
      const updatedContact = {
        id: roomId,
        name: updatedConfig.name,
        type: updatedConfig.type,
        unread: 0,
        last_message: allMessages[allMessages.length - 1] || null,
        message_count: allMessages.length,
        updated_at: new Date().toISOString()
      }
      
      if (contactIndex !== -1) {
        contacts[contactIndex] = {
          ...contacts[contactIndex],
          ...updatedContact
        }
      } else {
        contacts.push(updatedContact)
      }

      const updatedGlobalConfig = {
        ...globalConfig,
        contacts: contacts.sort((a, b) => {
          if (a.id === 'public') return -1
          if (b.id === 'public') return 1
          if (a.type === 'ai' && b.type !== 'ai') return -1
          if (a.type !== 'ai' && b.type === 'ai') return 1
          return new Date(b.updated_at || 0) - new Date(a.updated_at || 0)
        }),
        last_updated: new Date().toISOString()
      }

      await updateConfig(accessToken, username, updatedGlobalConfig)
    }

    // 更新消息缓存
    updateCache(username, 'messages', allMessages, roomId)

    // 更新聊天室列表缓存
    const cachedRooms = getCache(username, 'rooms')
    if (cachedRooms) {
      const updatedRooms = cachedRooms.map(room => {
        if (room.id === roomId) {
          return {
            ...room,
            last_message: allMessages[allMessages.length - 1] || null,
            message_count: allMessages.length,
            updated_at: new Date().toISOString()
          }
        }
        return room
      })
      updateCache(username, 'rooms', updatedRooms)
    }

    return allMessages
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
    // 首先尝试从缓存加载
    const cachedMessages = getCache(username, 'messages', roomId)
    if (cachedMessages) {
      console.log('Using cached messages for room:', roomId)
      return cachedMessages
    }

    // 如果缓存不存在或已过期，从 GitHub 加载
    const chatDir = `chats/${roomId}`
    const messagesPath = `${chatDir}/messages.json`
    const configPath = `${chatDir}/config.json`

    // 使用 Promise.all 并行加载消息和配置
    const [messagesResponse, configResponse] = await Promise.all([
      fetch(
        `https://api.github.com/repos/${username}/dock-chat-data/contents/${messagesPath}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      ),
      fetch(
        `https://api.github.com/repos/${username}/dock-chat-data/contents/${configPath}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      )
    ])

    // 如果消息文件存在
    if (messagesResponse.ok) {
      const data = await messagesResponse.json()
      const content = JSON.parse(Buffer.from(data.content, 'base64').toString())
      
      // 验证消息是否属于正确的聊天室
      if (content.roomId === roomId) {
        // 确保消息按时间排序
        const sortedMessages = content.messages.sort((a, b) => 
          new Date(a.createdAt) - new Date(b.createdAt)
        )

        // 缓存排序后的消息
        setCache(username, 'messages', sortedMessages, roomId)

        // 如果配置文件存在，更新配置
        if (configResponse.ok) {
          const configData = await configResponse.json()
          const config = JSON.parse(Buffer.from(configData.content, 'base64').toString())
          
          // 更新全局配置中的未读消息状态
          const globalConfig = await getConfig(accessToken, username)
          if (globalConfig) {
            const contacts = globalConfig.contacts || []
            const contactIndex = contacts.findIndex(c => c.id === roomId)
            
            if (contactIndex !== -1) {
              contacts[contactIndex] = {
                ...contacts[contactIndex],
                unread: 0,
                last_message: sortedMessages[sortedMessages.length - 1] || null,
                message_count: sortedMessages.length,
                updated_at: content.updated_at || new Date().toISOString()
              }
              
              const updatedConfig = {
                ...globalConfig,
                contacts: contacts.sort((a, b) => {
                  if (a.id === 'public') return -1
                  if (b.id === 'public') return 1
                  if (a.type === 'ai' && b.type !== 'ai') return -1
                  if (a.type !== 'ai' && b.type === 'ai') return 1
                  return new Date(b.updated_at || 0) - new Date(a.updated_at || 0)
                }),
                last_updated: new Date().toISOString()
              }
              
              // 使用 Promise.all 并行更新配置
              await Promise.all([
                updateConfig(accessToken, username, updatedConfig),
                updateChatConfig(accessToken, username, roomId, {
                  ...config,
                  message_count: sortedMessages.length,
                  last_message: sortedMessages[sortedMessages.length - 1] || null,
                  updated_at: new Date().toISOString()
                })
              ])

              // 更新配置缓存
              updateCache(username, 'config', updatedConfig)
            }
          }
        }
        
        return sortedMessages
      } else {
        console.error(`Room ID mismatch: expected ${roomId}, got ${content.roomId}`)
        return []
      }
    }

    // 如果消息文件不存在，但配置文件存在
    if (configResponse.ok) {
      return []
    }

    // 如果都不存在，初始化聊天室
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
    // 获取现文件的 SHA
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

    // 更新配置缓存
    updateCache(username, 'config', config)

    // 如果配置包含联系人列表，也更新聊天室缓存
    if (config.contacts) {
      updateCache(username, 'rooms', config.contacts)
    }
  } catch (error) {
    console.error('Error updating config:', error)
    throw error
  }
}

// 获取聊天室列表
export async function getChatRooms(accessToken, username) {
  try {
    // 首先尝试从缓存加载
    const cachedRooms = getCache(username, 'rooms')
    if (cachedRooms) {
      console.log('Using cached chat rooms')
      return cachedRooms
    }

    // 获取全局配置
    const globalConfig = await getConfig(accessToken, username)
    
    // 如果全���配置不存在，初始化它
    if (!globalConfig) {
      await createDataRepository(accessToken, username)
      const defaultRooms = [{
        id: 'public',
        name: '公共聊天室',
        type: 'room',
        unread: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        message_count: 0,
        last_message: null
      }]
      setCache(username, 'rooms', defaultRooms)
      return defaultRooms
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
      setCache(username, 'rooms', globalConfig.contacts)
      return globalConfig.contacts
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
        setCache(username, 'rooms', globalConfig.contacts)
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

    // 缓存排序后的联系人列表
    setCache(username, 'rooms', sortedContacts)

    return sortedContacts
  } catch (error) {
    console.error('Error getting chat rooms:', error)
    const defaultRooms = [{
      id: 'public',
      name: '公共聊天室',
      type: 'room',
      unread: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      message_count: 0,
      last_message: null
    }]
    setCache(username, 'rooms', defaultRooms)
    return defaultRooms
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

/**
 * 上传文件到 GitHub
 * @param {string} accessToken - GitHub 访问令牌
 * @param {string} username - 用户名
 * @param {string} filePath - 文件路径
 * @param {Buffer} content - 文件内容
 * @returns {Promise<string>} 文件的 URL
 */
export async function uploadToGitHub(accessToken, username, filePath, content) {
  try {
    const octokit = new Octokit({
      auth: accessToken
    })

    // 获取仓库信息
    const repo = await getDataRepository(accessToken, username)

    // 获取默认分支
    const { data: repository } = await octokit.rest.repos.get({
      owner: username,
      repo: repo.name
    })
    const defaultBranch = repository.default_branch

    // 获取最新的提交
    const { data: ref } = await octokit.rest.git.getRef({
      owner: username,
      repo: repo.name,
      ref: `heads/${defaultBranch}`
    })
    const latestCommitSha = ref.object.sha

    // 创建 blob
    const { data: blob } = await octokit.rest.git.createBlob({
      owner: username,
      repo: repo.name,
      content: content.toString('base64'),
      encoding: 'base64'
    })

    // 获取当前的树
    const { data: latestCommit } = await octokit.rest.git.getCommit({
      owner: username,
      repo: repo.name,
      commit_sha: latestCommitSha
    })
    const baseTreeSha = latestCommit.tree.sha

    // 创建新的树
    const { data: newTree } = await octokit.rest.git.createTree({
      owner: username,
      repo: repo.name,
      base_tree: baseTreeSha,
      tree: [{
        path: filePath,
        mode: '100644',
        type: 'blob',
        sha: blob.sha
      }]
    })

    // 创建新的提交
    const { data: newCommit } = await octokit.rest.git.createCommit({
      owner: username,
      repo: repo.name,
      message: `Upload file: ${filePath}`,
      tree: newTree.sha,
      parents: [latestCommitSha]
    })

    // 更新引用
    await octokit.rest.git.updateRef({
      owner: username,
      repo: repo.name,
      ref: `heads/${defaultBranch}`,
      sha: newCommit.sha
    })

    // 返回文件的 URL
    return `https://raw.githubusercontent.com/${username}/${repo.name}/${defaultBranch}/${filePath}`
  } catch (error) {
    console.error('Failed to upload file to GitHub:', error)
    throw error
  }
} 