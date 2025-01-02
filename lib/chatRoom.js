// 搜索聊天室
export const searchChatRoom = async (session, roomId) => {
  if (!session?.user?.login || !session.accessToken || !roomId) return null;

  try {
    // 从域名中提取用户名和聊天室ID
    const [username, domain] = roomId.split('@');
    if (!username || !domain) {
      return { error: '聊天室ID格式错误，请使用 用户名@域名 的格式' };
    }

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
      return { error: '用户不存在' };
    }

    const userData = await userResponse.json();

    // 检查用户的数据仓库是否存在
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
      return { error: '无法访问用户的数据仓库' };
    }

    // 检查聊天室是否存在
    const roomResponse = await fetch(
      `https://api.github.com/repos/${username}/dock-chat-data/contents/rooms/${domain}/config.json`,
      {
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );

    if (!roomResponse.ok) {
      return { error: '聊天室不存在或无法访问' };
    }

    const roomConfig = JSON.parse(atob((await roomResponse.json()).content));
    
    return {
      id: roomId,
      name: roomConfig.name || `${username}的聊天室`,
      owner: {
        login: username,
        name: userData.name || username,
        avatar_url: userData.avatar_url
      },
      domain: domain,
      members: roomConfig.members || [],
      created_at: roomConfig.created_at,
      description: roomConfig.description || ''
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
    const results = [];

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
          `https://api.github.com/repos/${user.login}/dock-chat-data/contents/rooms`,
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
            const configResponse = await fetch(
              `${room.url}/config.json`,
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
            
            // 检查聊天室名称或描述是否匹配搜索词
            if (config.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                config.description?.toLowerCase().includes(searchTerm.toLowerCase())) {
              results.push({
                id: `${user.login}@${room.name}`,
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

    // 从roomId中提取owner
    const [owner] = roomId.split('-');
    if (!owner) {
      showToast('无效的聊天室ID', 'error');
      return;
    }

    // 检查聊天室是否存在
    const response = await fetch(
      `https://api.github.com/repos/${owner}/dock-chat-data/contents/chats/${roomId}/info.json`,
      {
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        showToast('聊天室不存在', 'error');
      } else {
        throw new Error('检查聊天室失败');
      }
      return;
    }

    // 获取聊天室信息
    const data = await response.json();
    const roomInfo = JSON.parse(atob(data.content));

    // 检查是否已经是成员
    if (roomInfo.members?.includes(session.user.login)) {
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
      `https://api.github.com/repos/${owner}/dock-chat-data/contents/join_requests/${requestId}.json`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: `Join request from ${session.user.login}`,
          content: encodedRequest
        })
      }
    );

    if (!requestResponse.ok) {
      throw new Error('发送加入申请失败');
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
        `https://api.github.com/repos/${owner}/dock-chat-data/contents/chats/system/messages.json`,
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
      }

      // 添加新的系统消息
      messages.push(systemMessage);

      // 保存更新后的系统消息
      await fetch(
        `https://api.github.com/repos/${owner}/dock-chat-data/contents/chats/system/messages.json`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${session.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: `System notification: join request from ${session.user.login}`,
            content: btoa(JSON.stringify(messages, null, 2)),
            sha
          })
        }
      );
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