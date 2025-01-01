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

    // 检查聊天室是否存在
    const response = await fetch(
      `https://api.github.com/repos/${roomId.split('/')[0]}/dock-chat-data/contents/rooms/${roomId.split('/')[1]}/config.json`,
      {
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        // 如果聊天室不存在，发送加入申请
        await handleSendJoinRequest(session, roomId, showToast);
        showToast('已发送加入申请，请等待管理员审核', 'info');
        setShowJoinModal(false);
        return;
      }
      throw new Error('Failed to check room existence');
    }

    const roomConfig = JSON.parse(atob((await response.json()).content));
    
    // 检查是否已经是成员
    if (!roomConfig.members?.includes(session.user.login)) {
      await handleSendJoinRequest(session, roomId, showToast);
      showToast('已发送加入申请，请等待管理员审核', 'info');
      setShowJoinModal(false);
      return;
    }

    // 创建新的聊天室对象
    const newRoom = {
      id: roomId,
      name: roomConfig.name || `聊天室 ${roomId}`,
      type: 'room',
      joined_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      message_count: 0,
      unread: 0,
      owner: roomConfig.owner,
      members: roomConfig.members
    };

    // 更新联系人列表
    const updatedContacts = [...contacts, newRoom];
    updateChatRoomsCache(session.user.login, updatedContacts);

    // 更新用户配置
    if (userConfig) {
      const updatedConfig = {
        ...userConfig,
        contacts: updatedContacts,
        last_updated: new Date().toISOString()
      };
      await updateConfig(session.accessToken, session.user.login, updatedConfig);
      setUserConfig(updatedConfig);
    }

    // 切换到新加入的聊天室
    setActiveChat(roomId);
    setShowJoinModal(false);

    // 加载聊天记录
    await loadChatMessages();
    
    showToast('成功加入聊天室', 'success');
  } catch (error) {
    console.error('Error joining room:', error);
    showToast('加入聊天室失败，请重试', 'error');
  }
};

// 发送加入聊天室申请
const handleSendJoinRequest = async (session, roomId, showToast) => {
  try {
    const [owner] = roomId.split('/');
    const requestId = `jr-${Date.now()}`;
    const requestData = {
      id: requestId,
      type: 'join_request',
      from: {
        id: session.user.id,
        login: session.user.login,
        name: session.user.name,
        image: session.user.image
      },
      room: roomId,
      status: 'pending',
      created_at: new Date().toISOString()
    };

    // 保存加入申请
    const encodedContent = btoa(unescape(encodeURIComponent(JSON.stringify(requestData, null, 2))));
    const response = await fetch(
      `https://api.github.com/repos/${owner}/dock-chat-data/contents/join_requests/${requestId}.json`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: `Join request from ${session.user.login}`,
          content: encodedContent
        })
      }
    );

    if (!response.ok) {
      throw new Error('Failed to send join request');
    }
  } catch (error) {
    console.error('Error sending join request:', error);
    showToast('发送加入申请失败，请重试', 'error');
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