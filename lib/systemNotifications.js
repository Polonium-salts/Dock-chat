'use client'

import { Octokit } from '@octokit/rest'

const REPO_NAME = 'dock-chat-data'
const NOTIFICATIONS_PATH = 'notifications/system.json'

export async function saveSystemNotification(accessToken, username, notification) {
  try {
    const octokit = new Octokit({ auth: accessToken })
    
    // 获取现有的通知记录
    let notifications = []
    try {
      const { data } = await octokit.repos.getContent({
        owner: username,
        repo: REPO_NAME,
        path: NOTIFICATIONS_PATH,
      })
      
      const content = Buffer.from(data.content, 'base64').toString()
      notifications = JSON.parse(content)
    } catch (error) {
      // 如果文件不存在，使用空数组
      if (error.status !== 404) {
        throw error
      }
    }
    
    // 添加新通知
    notifications.push({
      ...notification,
      timestamp: new Date().toISOString()
    })
    
    // 保存更新后的通知记录
    const content = Buffer.from(JSON.stringify(notifications, null, 2)).toString('base64')
    
    await octokit.repos.createOrUpdateFileContents({
      owner: username,
      repo: REPO_NAME,
      path: NOTIFICATIONS_PATH,
      message: 'Update system notifications',
      content,
      ...(notifications.length > 0 ? { sha: data.sha } : {})
    })
    
    return notifications
  } catch (error) {
    console.error('Error saving system notification:', error)
    throw error
  }
}

export async function getSystemNotifications(accessToken, username) {
  try {
    const octokit = new Octokit({ auth: accessToken })
    
    const { data } = await octokit.repos.getContent({
      owner: username,
      repo: REPO_NAME,
      path: NOTIFICATIONS_PATH,
    })
    
    const content = Buffer.from(data.content, 'base64').toString()
    return JSON.parse(content)
  } catch (error) {
    if (error.status === 404) {
      return []
    }
    console.error('Error getting system notifications:', error)
    throw error
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
    // 可以添加其他类型的系统通知格式化
    default:
      return null
  }
} 