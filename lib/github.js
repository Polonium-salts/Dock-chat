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
        notifications: true
      },
      chat_rooms: [],
      kimi_settings: {
        api_key: null,
        conversation_history: []
      }
    }

    // 将配置文件提交到仓��
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