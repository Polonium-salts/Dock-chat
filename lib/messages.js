// 消息处理相关的函数

// 加载聊天室的消息
export async function loadRoomMessages(accessToken, username, roomId) {
  if (!accessToken || !username || !roomId) return []
  
  try {
    const response = await fetch(
      `https://api.github.com/repos/${username}/dock-chat-data/contents/rooms/${roomId}/messages.json`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    )

    if (response.status === 404) {
      // 如果文件不存在,返回空的消息列表
      return []
    }

    if (!response.ok) {
      throw new Error('Failed to load messages')
    }

    const data = await response.json()
    const content = JSON.parse(atob(data.content))
    const messages = content.messages || []
    
    // 格式化消息
    return messages.map(msg => ({
      id: msg.id || Date.now().toString(),
      content: msg.content || '',
      sender: msg.sender || 'Unknown',
      timestamp: msg.timestamp || new Date().toISOString(),
      isOwnMessage: msg.sender === username
    }))
  } catch (err) {
    console.error('Error loading messages:', err)
    return []
  }
}

// 保存聊天室的消息
export async function saveRoomMessages(accessToken, username, roomId, messages) {
  if (!accessToken || !username || !roomId || !messages) return
  
  try {
    // 获取当前文件(如果存在)
    const response = await fetch(
      `https://api.github.com/repos/${username}/dock-chat-data/contents/rooms/${roomId}/messages.json`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    )

    const content = {
      messages,
      updated_at: new Date().toISOString()
    }

    const requestBody = {
      message: `Update messages for room ${roomId}`,
      content: btoa(JSON.stringify(content)),
      ...(response.ok && {
        sha: (await response.json()).sha
      })
    }

    await fetch(
      `https://api.github.com/repos/${username}/dock-chat-data/contents/rooms/${roomId}/messages.json`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      }
    )

    return messages
  } catch (err) {
    console.error('Error saving messages:', err)
    throw err
  }
}

// 发送消息
export async function sendMessage(accessToken, username, roomId, message, socket) {
  if (!accessToken || !username || !roomId || !message.trim()) {
    throw new Error('Missing required parameters')
  }

  const newMessage = {
    id: Date.now().toString(),
    content: message.trim(),
    sender: username,
    timestamp: new Date().toISOString(),
    isOwnMessage: true
  }

  try {
    // 获取当前消息列表
    const currentMessages = await loadRoomMessages(accessToken, username, roomId)
    const updatedMessages = [...currentMessages, newMessage]

    // 保存更新后的消息列表
    await saveRoomMessages(accessToken, username, roomId, updatedMessages)

    // 如果提供了socket连接，发送消息到WebSocket
    if (socket?.connected) {
      socket.emit('message', {
        room: roomId,
        message: newMessage
      })
    }

    return {
      success: true,
      message: newMessage,
      messages: updatedMessages
    }
  } catch (err) {
    console.error('Error sending message:', err)
    throw err
  }
} 