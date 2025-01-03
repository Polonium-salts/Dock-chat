// 搜索聊天室
export const searchChatRoom = async (session, roomId) => {
  if (!session?.user?.login || !session.accessToken || !roomId) return null;

  try {
    // 从roomId中提取用户名和域名
    const [username, domain] = roomId.split('@');
    if (!username || !domain) {
      return { error: '聊天室ID格式错误' };
    }

    // 确保当前用户的数据仓库存在
    try {
      await ensureDataRepositoryExists(session.accessToken, session.user.login);
    } catch (error) {
      console.error('Error ensuring user data repository exists:', error);
      return { error: '初始化个人数据仓库失败' };
    }

    // 检查目标用户的数据仓库
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
        return { error: '该用户尚未初始化聊天室数据仓库' };
      }
      return { error: '无法访问聊天室数据库' };
    }

    // 如果是公共聊天室，确保目录和文件存在
    if (domain === 'public') {
      try {
        await ensureChatRoomExists(session.accessToken, username, 'public');
      } catch (error) {
        console.error('Error ensuring public chat room exists:', error);
      }
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
        return { error: '聊天室不存在' };
      }
      return { error: '无法访问聊天室' };
    }

    const roomData = await roomResponse.json();
    const roomInfo = JSON.parse(atob(roomData.content));

    return {
      id: roomId,
      name: roomInfo.name || `${username}的聊天室`,
      owner: {
        login: username,
        name: roomInfo.owner?.name || username,
        image: roomInfo.owner?.image
      },
      description: roomInfo.description || '',
      type: roomInfo.type || 'public',
      members: roomInfo.members || [],
      created_at: roomInfo.created_at,
      settings: roomInfo.settings || {}
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
    // 确保当前用户的数据仓库存在
    try {
      await ensureDataRepositoryExists(session.accessToken, session.user.login);
    } catch (error) {
      console.error('Error ensuring user data repository exists:', error);
      return [];
    }

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

// 保存聊天记录
export async function saveChatHistory(accessToken, username, roomId, messages) {
  try {
    const [roomOwner, timestamp] = roomId.split('@');
    if (!roomOwner || !timestamp) {
      throw new Error('Invalid room ID');
    }

    // 获取当前的聊天记录文件
    let existingMessages = [];
    let sha;
    
    try {
      const response = await fetch(
        `https://api.github.com/repos/${roomOwner}/dock-chat-data/contents/chats/${timestamp}/messages.json`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        existingMessages = JSON.parse(atob(data.content));
        sha = data.sha;
      }
    } catch (error) {
      console.log('No existing messages found');
    }

    // 合并新消息
    const newMessages = messages.filter(msg => !existingMessages.some(existing => existing.id === msg.id));
    const updatedMessages = [...existingMessages, ...newMessages];

    // 保存更新后的消息
    const content = btoa(JSON.stringify(updatedMessages, null, 2));
    const saveResponse = await fetch(
      `https://api.github.com/repos/${roomOwner}/dock-chat-data/contents/chats/${timestamp}/messages.json`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.github.v3+json'
        },
        body: JSON.stringify({
          message: `Update chat messages for ${timestamp}`,
          content,
          ...(sha ? { sha } : {})
        })
      }
    );

    if (!saveResponse.ok) {
      throw new Error('Failed to save messages');
    }

    return true;
  } catch (error) {
    console.error('Error saving chat history:', error);
    throw error;
  }
}

// 创建聊天室目录和初始文件
async function ensureChatRoomExists(accessToken, username, domain) {
  try {
    // 创建聊天室目录
    await fetch(
      `https://api.github.com/repos/${username}/dock-chat-data/contents/chats/${domain}/.gitkeep`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.github.v3+json'
        },
        body: JSON.stringify({
          message: `Create chat room directory: ${domain}`,
          content: 'MQ==' // Base64 encoded "1"
        })
      }
    );

    // 创建初始的 info.json
    const initialInfo = {
      name: `${username}的聊天室`,
      description: '',
      type: 'public',
      owner: {
        login: username
      },
      members: [],
      created_at: new Date().toISOString(),
      settings: {
        notifications: true,
        muted: false,
        theme: 'light'
      }
    };

    await fetch(
      `https://api.github.com/repos/${username}/dock-chat-data/contents/chats/${domain}/info.json`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.github.v3+json'
        },
        body: JSON.stringify({
          message: `Initialize chat room info: ${domain}`,
          content: btoa(JSON.stringify(initialInfo, null, 2))
        })
      }
    );

    // 创建初始的 messages.json
    await fetch(
      `https://api.github.com/repos/${username}/dock-chat-data/contents/chats/${domain}/messages.json`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.github.v3+json'
        },
        body: JSON.stringify({
          message: `Initialize messages for: ${domain}`,
          content: btoa('[]')
        })
      }
    );

    return true;
  } catch (error) {
    console.error('Error ensuring chat room exists:', error);
    throw error;
  }
}

// 加载聊天记录
export async function loadChatHistory(accessToken, username, roomId) {
  try {
    const [roomOwner, timestamp] = roomId.split('@');
    if (!roomOwner || !timestamp) {
      throw new Error('Invalid room ID');
    }

    // 先检查仓库是否存在
    const repoResponse = await fetch(
      `https://api.github.com/repos/${roomOwner}/dock-chat-data`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );

    if (!repoResponse.ok) {
      if (repoResponse.status === 404) {
        throw new Error('聊天室数据库不存在');
      }
      throw new Error(`无法访问聊天室数据库: ${repoResponse.status}`);
    }

    // 如果是公共聊天室，确保目录和文件存在
    if (timestamp === 'public') {
      try {
        await ensureChatRoomExists(accessToken, roomOwner, 'public');
      } catch (error) {
        console.error('Error ensuring public chat room exists:', error);
      }
    }

    // 获取聊天室信息
    const roomInfoResponse = await fetch(
      `https://api.github.com/repos/${roomOwner}/dock-chat-data/contents/chats/${timestamp}/info.json`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );

    if (!roomInfoResponse.ok) {
      if (roomInfoResponse.status === 404) {
        // 如果是公共聊天室，返回空数组
        if (timestamp === 'public') {
          return [];
        }
        throw new Error('聊天室不存在');
      }
      throw new Error('无法访问聊天室信息');
    }

    const roomInfoData = await roomInfoResponse.json();
    const roomInfo = JSON.parse(atob(roomInfoData.content));

    // 如果是私有聊天室，检查访问权限
    if (roomInfo.type === 'private') {
      const isMember = roomInfo.members?.some(member => 
        typeof member === 'object' ? member.login === username : member === username
      );
      const isOwner = roomInfo.owner?.login === username;

      if (!isMember && !isOwner) {
        throw new Error('没有权限访问该聊天室');
      }
    }

    // 获取消息记录
    const messagesResponse = await fetch(
      `https://api.github.com/repos/${roomOwner}/dock-chat-data/contents/chats/${timestamp}/messages.json`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );

    if (!messagesResponse.ok) {
      if (messagesResponse.status === 404) {
        return []; // 如果没有消息记录，返回空数组
      }
      throw new Error('无法加载聊天记录');
    }

    const messagesData = await messagesResponse.json();
    const messages = JSON.parse(atob(messagesData.content));
    return messages;
  } catch (error) {
    console.error('Error loading chat history:', error);
    throw error;
  }
}

// 检查并创建数据仓库
async function ensureDataRepositoryExists(accessToken, username) {
  try {
    // 检查仓库是否存在
    const repoResponse = await fetch(
      `https://api.github.com/repos/${username}/dock-chat-data`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );

    if (repoResponse.ok) {
      return true;
    }

    if (repoResponse.status === 404) {
      // 创建仓库
      const createResponse = await fetch(
        'https://api.github.com/user/repos',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/vnd.github.v3+json'
          },
          body: JSON.stringify({
            name: 'dock-chat-data',
            private: true,
            auto_init: true,
            description: 'Private repository for Dock Chat data storage'
          })
        }
      );

      if (!createResponse.ok) {
        throw new Error('无法创建聊天室数据仓库');
      }

      // 创建必要的目录结构
      const directories = ['chats', 'config', 'join_requests', 'user_chats'];
      for (const dir of directories) {
        await fetch(
          `https://api.github.com/repos/${username}/dock-chat-data/contents/${dir}/.gitkeep`,
          {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              message: `Create ${dir} directory`,
              content: 'MQ==' // Base64 encoded "1"
            })
          }
        );
      }

      // 创建初始配置文件
      const initialConfig = {
        settings: {
          theme: 'system',
          activeChat: 'public'
        },
        contacts: [],
        last_updated: new Date().toISOString()
      };

      await fetch(
        `https://api.github.com/repos/${username}/dock-chat-data/contents/config/user.json`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: 'Create initial config',
            content: btoa(JSON.stringify(initialConfig, null, 2))
          })
        }
      );

      return true;
    }

    return false;
  } catch (error) {
    console.error('Error ensuring data repository exists:', error);
    throw error;
  }
}

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

    // 确保当前用户的数据仓库存在
    try {
      await ensureDataRepositoryExists(session.accessToken, session.user.login);
    } catch (error) {
      console.error('Error ensuring user data repository exists:', error);
      showToast('初始化个人数据仓库失败', 'error');
      return;
    }

    // 检查目标用户的数据仓库
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
        showToast('该用户尚未初始化聊天室数据仓库，请等待用户完成初始化', 'error');
      } else {
        showToast('无法访问聊天室数据库', 'error');
      }
      return;
    }

    // 如果是公共聊天室，确保目录和文件存在
    if (domain === 'public') {
      try {
        await ensureChatRoomExists(session.accessToken, username, 'public');
      } catch (error) {
        console.error('Error ensuring public chat room exists:', error);
        showToast('初始化公共聊天室失败', 'error');
        return;
      }
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
      } else {
        showToast('无法访问聊天室信息', 'error');
      }
      return;
    }

    // 获取聊天室信息
    const roomData = await roomResponse.json();
    const roomInfo = JSON.parse(atob(roomData.content));

    // 如果是私有聊天室，发送加入申请
    if (roomInfo.type === 'private') {
      const isMember = roomInfo.members?.some(member => 
        typeof member === 'object' ? member.login === session.user.login : member === session.user.login
      );
      
      if (!isMember) {
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

        // 保存申请
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
          showToast('发送加入申请失败', 'error');
          return;
        }

        showToast('已发送加入申请，请等待管理员审核', 'success');
        setShowJoinModal(false);
        return;
      }
    }

    // 如果是公共聊天室或已经是成员，直接加入
    const updatedContacts = [...contacts, {
      id: roomId,
      name: roomInfo.name || `${username}的聊天室`,
      owner: {
        login: username,
        name: roomInfo.owner?.name || username,
        image: roomInfo.owner?.image
      },
      type: roomInfo.type || 'public',
      joined_at: new Date().toISOString()
    }];

    // 更新用户配置
    const updatedConfig = {
      ...userConfig,
      contacts: updatedContacts,
      settings: {
        ...userConfig.settings,
        activeChat: roomId
      },
      last_updated: new Date().toISOString()
    };

    await updateConfig(session.accessToken, session.user.login, updatedConfig);
    setUserConfig(updatedConfig);
    updateChatRoomsCache(session.user.login, updatedContacts);

    setActiveChat(roomId);
    setShowJoinModal(false);
    showToast('成功加入聊天室', 'success');

    // 加载聊天记录
    loadChatMessages(roomId);
  } catch (error) {
    console.error('Error joining room:', error);
    showToast(`加入聊天室失败: ${error.message}`, 'error');
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