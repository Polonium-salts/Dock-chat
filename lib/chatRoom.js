// 搜索聊天室
export const searchChatRoom = async (session, roomId) => {
  if (!session?.user?.login || !session.accessToken || !roomId) return null;

  try {
    // 从roomId中提取用户名和时间戳
    let username, timestamp;
    
    // 处理不同格式的聊天室ID
    if (roomId.includes('@')) {
      [username, timestamp] = roomId.split('@');
    } else if (roomId.includes('-')) {
      [username, timestamp] = roomId.split('-');
    } else {
      return { error: '聊天室ID格式错误' };
    }

    if (!username || !timestamp) {
      return { error: '无效的聊天室ID' };
    }

    console.log('Searching room with:', { username, timestamp }); // 调试日志

    // 检查用户是否存在
    const userResponse = await fetch(
      `https://api.github.com/users/${username}`,
      {
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );

    if (!userResponse.ok) {
      console.log('User not found:', username); // 调试日志
      return { error: '用户不存在' };
    }

    const userData = await userResponse.json();

    // 检查数据仓库是否存在
    const repoResponse = await fetch(
      `https://api.github.com/repos/${username}/dock-chat-data`,
      {
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );

    if (!repoResponse.ok) {
      console.log('Repository not accessible:', username); // 调试日志
      return { error: '无法访问聊天室数据' };
    }

    // 尝试多个可能的路径来查找聊天室信息
    const possiblePaths = [
      `chats/${timestamp}/info.json`,
      `chats/${username}-${timestamp}/info.json`,
      `chats/${username}@${timestamp}/info.json`
    ];

    let roomInfo = null;
    let foundPath = null;

    for (const path of possiblePaths) {
      console.log('Trying path:', path); // 调试日志
      try {
        const roomResponse = await fetch(
          `https://api.github.com/repos/${username}/dock-chat-data/contents/${path}`,
          {
            headers: {
              'Authorization': `Bearer ${session.accessToken}`,
              'Accept': 'application/vnd.github.v3+json'
            }
          }
        );

        if (roomResponse.ok) {
          const roomData = await roomResponse.json();
          roomInfo = JSON.parse(atob(roomData.content));
          foundPath = path;
          break;
        }
      } catch (error) {
        console.log('Error trying path:', path, error); // 调试日志
        continue;
      }
    }

    if (!roomInfo) {
      console.log('Room info not found in any path'); // 调试日志
      return { error: '聊天室不存在' };
    }

    // 检查是否是私有聊天室且用户是否有权限访问
    if (roomInfo.type === 'private') {
      const isMember = roomInfo.members?.some(member => 
        typeof member === 'object' ? member.login === session.user.login : member === session.user.login
      );
      const isAdmin = roomInfo.owner?.login === session.user.login;

      if (!isMember && !isAdmin) {
        console.log('User not authorized for private room'); // 调试日志
        return { error: '这是一个私有聊天室，您没有权限访问' };
      }
    }

    // 检查并初始化用户的聊天室存储
    try {
      const userStorageResponse = await fetch(
        `https://api.github.com/repos/${session.user.login}/dock-chat-data/contents/user_chats/${roomId}/info.json`,
        {
          headers: {
            'Authorization': `Bearer ${session.accessToken}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      );

      if (!userStorageResponse.ok) {
        // 如果用户的聊天室存储不存在，则初始化它
        console.log('Initializing user chat storage'); // 调试日志
        await initializeUserChatStorage(session.accessToken, session.user.login, roomId, roomInfo);
      }
    } catch (error) {
      console.log('Error checking/initializing user storage:', error); // 调试日志
    }

    return {
      id: roomId,
      name: roomInfo.name || `${username}的聊天室`,
      owner: {
        login: username,
        name: userData.name || username,
        avatar_url: userData.avatar_url
      },
      description: roomInfo.description || '',
      type: roomInfo.type || 'public',
      members: roomInfo.members || [],
      created_at: roomInfo.created_at,
      settings: roomInfo.settings || {},
      path: foundPath
    };
  } catch (error) {
    console.error('Error searching chat room:', error);
    return { error: '搜索聊天室时出错' };
  }
};

// 搜索聊天室列表
export const searchChatRooms = async (session, searchTerm) => {
  if (!session?.user?.login || !session.accessToken || !searchTerm) return [];

  try {
    const results = [];

    // 首先尝试直接搜索指定的聊天室
    if (searchTerm.includes('@')) {
      const result = await searchChatRoom(session, searchTerm);
      if (result && !result.error) {
        results.push(result);
        return results;
      }
    }

    // 搜索用户
    const userResponse = await fetch(
      `https://api.github.com/search/users?q=${searchTerm}+in:login`,
      {
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );

    if (!userResponse.ok) {
      throw new Error('Failed to search users');
    }

    const { items: users } = await userResponse.json();

    // 获取每个用户的聊天室列表
    for (const user of users.slice(0, 5)) { // 限制只处理前5个用户
      try {
        // 检查用户是否有数据仓库
        const repoResponse = await fetch(
          `https://api.github.com/repos/${user.login}/dock-chat-data`,
          {
            headers: {
              'Authorization': `Bearer ${session.accessToken}`,
              'Accept': 'application/vnd.github.v3+json'
            }
          }
        );

        if (!repoResponse.ok) continue;

        // 获取聊天室列表
        const roomsResponse = await fetch(
          `https://api.github.com/repos/${user.login}/dock-chat-data/contents/chats`,
          {
            headers: {
              'Authorization': `Bearer ${session.accessToken}`,
              'Accept': 'application/vnd.github.v3+json'
            }
          }
        );

        if (!roomsResponse.ok) continue;

        const rooms = await roomsResponse.json();
        
        // 获取每个聊天室的配置
        for (const room of rooms) {
          try {
            // 跳过系统相关的目录
            if (['system', 'public', 'kimi-ai'].includes(room.name)) continue;

            const configResponse = await fetch(
              `https://api.github.com/repos/${user.login}/dock-chat-data/contents/chats/${room.name}/info.json`,
              {
                headers: {
                  'Authorization': `Bearer ${session.accessToken}`,
                  'Accept': 'application/vnd.github.v3+json'
                }
              }
            );

            if (!configResponse.ok) continue;

            const configData = await configResponse.json();
            const config = JSON.parse(atob(configData.content));
            
            // 检查聊天室名称、描述或ID是否匹配搜索词
            const roomId = `${user.login}@${room.name}`;
            if (roomId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                config.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                config.description?.toLowerCase().includes(searchTerm.toLowerCase())) {
              
              // 检查是否是私有聊天室且用户是否有权限访问
              if (config.type === 'private') {
                const isMember = config.members?.some(member => 
                  typeof member === 'object' ? member.login === session.user.login : member === session.user.login
                );
                const isAdmin = config.owner?.login === session.user.login;

                if (!isMember && !isAdmin) continue;
              }

              results.push({
                id: roomId,
                name: config.name || `${user.login}的聊天室`,
                owner: {
                  login: user.login,
                  name: user.name || user.login,
                  avatar_url: user.avatar_url
                },
                domain: room.name,
                members: config.members || [],
                created_at: config.created_at,
                description: config.description || '',
                type: config.type || 'public'
              });
            }
          } catch (error) {
            console.error('Error loading room config:', error);
          }
        }
      } catch (error) {
        console.error('Error loading user rooms:', error);
      }
    }

    // 如果没有找到结果，尝试搜索当前用户的聊天室
    if (results.length === 0) {
      try {
        const ownRoomsResponse = await fetch(
          `https://api.github.com/repos/${session.user.login}/dock-chat-data/contents/chats`,
          {
            headers: {
              'Authorization': `Bearer ${session.accessToken}`,
              'Accept': 'application/vnd.github.v3+json'
            }
          }
        );

        if (ownRoomsResponse.ok) {
          const ownRooms = await ownRoomsResponse.json();
          
          for (const room of ownRooms) {
            // 跳过系统相关的目录
            if (['system', 'public', 'kimi-ai'].includes(room.name)) continue;

            const configResponse = await fetch(
              `https://api.github.com/repos/${session.user.login}/dock-chat-data/contents/chats/${room.name}/info.json`,
              {
                headers: {
                  'Authorization': `Bearer ${session.accessToken}`,
                  'Accept': 'application/vnd.github.v3+json'
                }
              }
            );

            if (!configResponse.ok) continue;

            const configData = await configResponse.json();
            const config = JSON.parse(atob(configData.content));
            
            // 检查聊天室名称、描述或ID是否匹配搜索词
            const roomId = `${session.user.login}@${room.name}`;
            if (roomId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                config.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                config.description?.toLowerCase().includes(searchTerm.toLowerCase())) {
              
              results.push({
                id: roomId,
                name: config.name || `${session.user.login}的聊天室`,
                owner: {
                  login: session.user.login,
                  name: session.user.name || session.user.login,
                  avatar_url: session.user.image
                },
                domain: room.name,
                members: config.members || [],
                created_at: config.created_at,
                description: config.description || '',
                type: config.type || 'public'
              });
            }
          }
        }
      } catch (error) {
        console.error('Error loading own rooms:', error);
      }
    }

    return results;
  } catch (error) {
    console.error('Error searching chat rooms:', error);
    return [];
  }
};

// 处理加入聊天室的逻辑
export const handleJoinRoom = async (session, roomId, contacts, setActiveChat, setShowJoinModal, showToast, updateConfig, userConfig, setUserConfig, updateChatRoomsCache, loadChatMessages) => {
  if (!session?.user?.login || !session.accessToken || !roomId) return;

  try {
    // 检查聊天室是否已存在于联系人列表中
    const existingRoom = contacts.find(c => c.id === roomId);
    if (existingRoom) {
      setActiveChat(roomId);
      setShowJoinModal(false);
      return;
    }

    // 从roomId中提取用户名和域名
    const [username, domain] = roomId.split('@');
    if (!username || !domain) {
      showToast('无效的聊天室ID', 'error');
      return;
    }

    // 检查是否有权限访问仓库
    const repoResponse = await fetch(
      `https://api.github.com/repos/${username}/dock-chat-data`,
      {
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );

    if (!repoResponse.ok) {
      if (repoResponse.status === 404) {
        showToast('聊天室不存在', 'error');
      } else if (repoResponse.status === 403) {
        showToast('没有权限访问该聊天室', 'error');
      } else {
        showToast('无法访问聊天室', 'error');
      }
      return;
    }

    // 检查聊天室是否存在
    const roomResponse = await fetch(
      `https://api.github.com/repos/${username}/dock-chat-data/contents/chats/${domain}/info.json`,
      {
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );

    if (!roomResponse.ok) {
      if (roomResponse.status === 404) {
        showToast('聊天室不存在', 'error');
      } else if (roomResponse.status === 403) {
        showToast('没有权限访问该聊天室', 'error');
      } else {
        showToast('无法访问聊天室', 'error');
      }
      return;
    }

    // 获取聊天室信息
    const roomData = await roomResponse.json();
    const roomInfo = JSON.parse(atob(roomData.content));

    // 检查是否已经是成员
    const isMember = roomInfo.members?.some(member => 
      typeof member === 'object' ? member.login === session.user.login : member === session.user.login
    );
    if (isMember) {
      showToast('您已经是该聊天室的成员', 'info');
      setShowJoinModal(false);
      return;
    }

    // 创建加入申请
    const requestId = `jr-${Date.now()}`;
    const joinRequest = {
      id: requestId,
      type: 'join_request',
      room: roomId,
      user: {
        id: session.user.id,
        login: session.user.login,
        name: session.user.name,
        image: session.user.image
      },
      status: 'pending',
      created_at: new Date().toISOString()
    };

    // 保存申请到管理员的仓库
    const encodedRequest = btoa(JSON.stringify(joinRequest, null, 2));
    const requestResponse = await fetch(
      `https://api.github.com/repos/${username}/dock-chat-data/contents/join_requests/${requestId}.json`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.github.v3+json'
        },
        body: JSON.stringify({
          message: `Join request from ${session.user.login}`,
          content: encodedRequest
        })
      }
    );

    if (!requestResponse.ok) {
      if (requestResponse.status === 403) {
        showToast('没有权限发送加入申请', 'error');
      } else {
        throw new Error('发送加入申请失败');
      }
      return;
    }

    // 发送系统通知给管理员
    const systemMessage = {
      id: `sys-${Date.now()}`,
      content: `用户 ${session.user.name} (${session.user.login}) 请求加入聊天室`,
      type: 'join_request',
      user: {
        name: 'System',
        image: '/system-avatar.png',
        id: 'system'
      },
      request: joinRequest,
      createdAt: new Date().toISOString()
    };

    try {
      // 获取现有的系统消息
      const messagesResponse = await fetch(
        `https://api.github.com/repos/${username}/dock-chat-data/contents/chats/system/messages.json`,
        {
          headers: {
            'Authorization': `Bearer ${session.accessToken}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      );

      let messages = [];
      let sha;

      if (messagesResponse.ok) {
        const messagesData = await messagesResponse.json();
        messages = JSON.parse(atob(messagesData.content));
        sha = messagesData.sha;
      } else if (messagesResponse.status !== 404) {
        // 如果不是 404（文件不存在），而是其他错误，则抛出异常
        throw new Error('无法访问系统消息');
      }

      // 添加新的系统消息
      messages.push(systemMessage);

      // 保存更新后的系统消息
      const saveResponse = await fetch(
        `https://api.github.com/repos/${username}/dock-chat-data/contents/chats/system/messages.json`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${session.accessToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/vnd.github.v3+json'
          },
          body: JSON.stringify({
            message: `System notification: join request from ${session.user.login}`,
            content: btoa(JSON.stringify(messages, null, 2)),
            ...(sha ? { sha } : {})
          })
        }
      );

      if (!saveResponse.ok && saveResponse.status !== 404) {
        throw new Error('保存系统消息失败');
      }
    } catch (error) {
      console.error('Error saving system message:', error);
      // 继续执行，因为这不是关键错误
    }

    showToast('已发送加入申请，请等待管理员审核', 'success');
    setShowJoinModal(false);
  } catch (error) {
    console.error('Error joining room:', error);
    showToast('加入聊天室失败，请重试', 'error');
  }
};

// 处理删除聊天室的逻辑
export const handleDeleteChatRoom = async (session, roomId, contacts, setContacts, activeChat, setActiveChat, setCurrentView, userConfig, setUserConfig, updateConfig, showToast, setShowChatSettings, setIsLoading) => {
  if (!session?.user?.login || !session.accessToken) {
    showToast('请先登录', 'error');
    return;
  }
  
  if (roomId === 'public' || roomId === 'kimi-ai' || roomId === 'system') {
    showToast('系统聊天室不能删除', 'error');
    return;
  }

  try {
    setIsLoading(true);
    
    // 从联系人列表中移除
    const updatedContacts = contacts.filter(c => c.id !== roomId);
    setContacts(updatedContacts);
    
    // 如果当前正在查看被删除的聊天室，切换到公共聊天室
    if (activeChat === roomId) {
      setActiveChat('public');
      setCurrentView('chat');
    }

    // 更新用户配置
    if (userConfig) {
      const updatedConfig = {
        ...userConfig,
        contacts: updatedContacts,
        settings: {
          ...userConfig.settings,
          activeChat: activeChat === roomId ? 'public' : activeChat
        },
        last_updated: new Date().toISOString()
      };

      // 保存到 GitHub
      await updateConfig(session.accessToken, session.user.login, updatedConfig);
      setUserConfig(updatedConfig);
    }

    showToast('聊天室已删除', 'success');
    setShowChatSettings(false);
  } catch (error) {
    console.error('Error deleting chat room:', error);
    showToast('删除聊天室失败，请重试', 'error');
  } finally {
    setIsLoading(false);
  }
};

// 处理离开聊天室的逻辑
export const handleLeaveRoom = async (session, roomId, contacts, setContacts, activeChat, setActiveChat, socket, userConfig, setUserConfig, updateConfig, updateUserConfigCache, updateChatRoomsCache, showToast, setShowChatSettings) => {
  if (!session?.user?.login || !session.accessToken) return;

  try {
    // 从联系人列表中移除
    const updatedContacts = contacts.filter(c => c.id !== roomId);
    setContacts(updatedContacts);
    
    // 如果当前正在查看被删除的聊天室，切换到公共聊天室
    if (activeChat === roomId) {
      setActiveChat('public');
    }

    // 离开 Socket.IO 房间
    if (socket?.connected) {
      socket.emit('leave', { 
        room: roomId,
        user: {
          id: session.user.id,
          name: session.user.name,
          image: session.user.image,
          login: session.user.login
        }
      });
    }

    // 更新用户配置
    if (userConfig) {
      const updatedConfig = {
        ...userConfig,
        contacts: updatedContacts,
        settings: {
          ...userConfig.settings,
          activeChat: activeChat === roomId ? 'public' : activeChat
        },
        last_updated: new Date().toISOString()
      };
      await updateConfig(session.accessToken, session.user.login, updatedConfig);
      setUserConfig(updatedConfig);
      
      // 更新缓存
      updateUserConfigCache(session.user.login, updatedConfig);
      updateChatRoomsCache(session.user.login, updatedContacts);
    }

    showToast('已离开聊天室', 'success');
    setShowChatSettings(false);
  } catch (error) {
    console.error('Error leaving room:', error);
    showToast('离开聊天室失败', 'error');
  }
};

// 保存用户的聊天记录
export async function saveUserChatHistory(accessToken, userLogin, roomId, messages) {
  try {
    const [roomOwner, timestamp] = roomId.split('@');
    if (!roomOwner || !timestamp) {
      throw new Error('Invalid room ID');
    }

    // 获取用户在该聊天室的消息
    const userMessages = messages.filter(msg => 
      msg.user.login === userLogin || msg.type === 'system'
    );

    // 编码消息内容
    const encodedMessages = btoa(JSON.stringify(userMessages, null, 2));

    // 保存到用户自己的仓库中
    const response = await fetch(
      `https://api.github.com/repos/${userLogin}/dock-chat-data/contents/user_chats/${roomId}/messages.json`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.github.v3+json'
        },
        body: JSON.stringify({
          message: `Update chat history for room ${roomId}`,
          content: encodedMessages
        })
      }
    );

    if (!response.ok) {
      throw new Error('Failed to save chat history');
    }

    return true;
  } catch (error) {
    console.error('Error saving user chat history:', error);
    throw error;
  }
}

// 从所有成员的仓库中读取聊天记录
export async function loadRoomMessages(accessToken, roomId) {
  try {
    const [roomOwner, timestamp] = roomId.split('@');
    if (!roomOwner || !timestamp) {
      throw new Error('Invalid room ID');
    }

    // 获取聊天室成员列表
    const membersResponse = await fetch(
      `https://api.github.com/repos/${roomOwner}/dock-chat-data/contents/chats/${timestamp}/members.json`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );

    if (!membersResponse.ok) {
      throw new Error('Failed to load members list');
    }

    const membersData = await membersResponse.json();
    const members = JSON.parse(atob(membersData.content));

    // 从每个成员的仓库中读取消息
    const allMessages = [];
    for (const member of members.list) {
      try {
        const response = await fetch(
          `https://api.github.com/repos/${member.login}/dock-chat-data/contents/user_chats/${roomId}/messages.json`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Accept': 'application/vnd.github.v3+json'
            }
          }
        );

        if (response.ok) {
          const data = await response.json();
          const messages = JSON.parse(atob(data.content));
          allMessages.push(...messages);
        }
      } catch (error) {
        console.error(`Error loading messages from ${member.login}:`, error);
        // 继续处理其他成员的消息
      }
    }

    // 按时间排序并去重
    const uniqueMessages = Array.from(
      new Map(allMessages.map(msg => [msg.id, msg])).values()
    );
    
    return uniqueMessages.sort((a, b) => 
      new Date(a.createdAt) - new Date(b.createdAt)
    );
  } catch (error) {
    console.error('Error loading room messages:', error);
    throw error;
  }
}

// 初始化用户的聊天室存储
export async function initializeUserChatStorage(accessToken, userLogin, roomId, roomInfo) {
  try {
    const [roomOwner, timestamp] = roomId.split('@');
    if (!roomOwner || !timestamp) {
      throw new Error('Invalid room ID');
    }

    // 创建用户的聊天室配置
    const userRoomInfo = {
      id: roomId,
      name: roomInfo.name,
      description: roomInfo.description,
      type: roomInfo.type,
      owner: roomInfo.owner,
      joined_at: new Date().toISOString(),
      members: roomInfo.members.map(member => ({
        login: member.login,
        name: member.name,
        image: member.image,
        role: member.role
      })),
      settings: {
        notifications: true,
        muted: false,
        theme: 'light'
      },
      last_read: new Date().toISOString()
    };

    // 保存用户的聊天室配置
    const infoResponse = await fetch(
      `https://api.github.com/repos/${userLogin}/dock-chat-data/contents/user_chats/${roomId}/info.json`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.github.v3+json'
        },
        body: JSON.stringify({
          message: `Initialize chat room ${roomId} config`,
          content: btoa(JSON.stringify(userRoomInfo, null, 2))
        })
      }
    );

    if (!infoResponse.ok) {
      throw new Error('Failed to save user room info');
    }

    // 初始化用户的消息存储
    const messagesResponse = await fetch(
      `https://api.github.com/repos/${userLogin}/dock-chat-data/contents/user_chats/${roomId}/messages.json`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.github.v3+json'
        },
        body: JSON.stringify({
          message: `Initialize messages for ${roomId}`,
          content: btoa('[]')
        })
      }
    );

    if (!messagesResponse.ok) {
      throw new Error('Failed to initialize messages storage');
    }

    return true;
  } catch (error) {
    console.error('Error initializing user chat storage:', error);
    throw error;
  }
} 