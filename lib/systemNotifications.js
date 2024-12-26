'use client'

const REPO_NAME = 'dock-chat-data'
const NOTIFICATIONS_PATH = 'notifications/system.json'

async function getGitHubContent(accessToken, username, path) {
  const response = await fetch(`https://api.github.com/repos/${username}/${REPO_NAME}/contents/${path}`, {
    headers: {
      'Authorization': `token ${accessToken}`,
      'Accept': 'application/vnd.github.v3+json'
    }
  })
  
  if (!response.ok) {
    if (response.status === 404) {
      return null
    }
    throw new Error(`GitHub API error: ${response.statusText}`)
  }
  
  const data = await response.json()
  return data
}

async function updateGitHubContent(accessToken, username, path, content, sha = null) {
  const response = await fetch(`https://api.github.com/repos/${username}/${REPO_NAME}/contents/${path}`, {
    method: 'PUT',
    headers: {
      'Authorization': `token ${accessToken}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message: 'Update system notifications',
      content: Buffer.from(JSON.stringify(content, null, 2)).toString('base64'),
      ...(sha ? { sha } : {})
    })
  })
  
  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.statusText}`)
  }
  
  return await response.json()
}

export async function saveSystemNotification(accessToken, username, notification) {
  try {
    // 获取现有的通知记录
    let notifications = []
    let sha = null
    
    const data = await getGitHubContent(accessToken, username, NOTIFICATIONS_PATH)
    if (data) {
      sha = data.sha
      const content = Buffer.from(data.content, 'base64').toString()
      notifications = JSON.parse(content)
    }
    
    // 添加新通知
    notifications.push({
      ...notification,
      timestamp: new Date().toISOString()
    })
    
    // 保存更新后的通知记录
    await updateGitHubContent(accessToken, username, NOTIFICATIONS_PATH, notifications, sha)
    
    return notifications
  } catch (error) {
    console.error('Error saving system notification:', error)
    return []
  }
}

export async function getSystemNotifications(accessToken, username) {
  try {
    const data = await getGitHubContent(accessToken, username, NOTIFICATIONS_PATH)
    if (!data) {
      return []
    }
    
    const content = Buffer.from(data.content, 'base64').toString()
    return JSON.parse(content)
  } catch (error) {
    console.error('Error getting system notifications:', error)
    return []
  }
}

export async function formatSystemNotification(type, data) {
  switch (type) {
    case 'login':
      return {
        type: 'login',
        content: data.message,
        user: {
          name: 'System',
          image: '/system-avatar.png',
          id: 'system'
        },
        metadata: {
          userInfo: data.userInfo,
          loginTime: data.loginTime
        }
      }
    default:
      return null
  }
} 