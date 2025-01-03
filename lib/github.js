// GitHub API 相关函数
export async function checkDataRepository(accessToken, username) {
  try {
    const response = await fetch(`https://api.github.com/repos/${username}/dock-chat-data`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (response.status === 404) {
      return false;
    }

    if (response.status === 200) {
      // 检查必要的目录结构
      const contentResponse = await fetch(
        `https://api.github.com/repos/${username}/dock-chat-data/contents/`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      );

      if (contentResponse.ok) {
        const contents = await contentResponse.json();
        const requiredDirs = ['chats', 'config', 'friend_requests'];
        const existingDirs = contents
          .filter(item => item.type === 'dir')
          .map(item => item.name);

        return requiredDirs.every(dir => existingDirs.includes(dir));
      }
    }

    return false;
  } catch (error) {
    console.error('Error checking repository:', error);
    return false;
  }
}

export async function getConfig(accessToken, username) {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${username}/dock-chat-data/contents/config/user.json`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        // 如果配置文件不存在，返回默认配置
        return {
          settings: {
            theme: 'system',
            activeChat: '',
          },
          contacts: [],
          last_updated: new Date().toISOString()
        };
      }
      throw new Error('Failed to fetch config');
    }

    const data = await response.json();
    const content = JSON.parse(atob(data.content));
    return content;
  } catch (error) {
    console.error('Error getting config:', error);
    return null;
  }
}

export async function updateConfig(accessToken, username, config) {
  try {
    // 先获取当前文件的 SHA
    const currentFile = await fetch(
      `https://api.github.com/repos/${username}/dock-chat-data/contents/config/user.json`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );

    let sha;
    if (currentFile.ok) {
      const data = await currentFile.json();
      sha = data.sha;
    }

    // 更新配置文件
    const content = btoa(JSON.stringify(config, null, 2));
    const response = await fetch(
      `https://api.github.com/repos/${username}/dock-chat-data/contents/config/user.json`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.github.v3+json'
        },
        body: JSON.stringify({
          message: 'Update user config',
          content,
          sha: sha // 如果文件已存在，需要提供 SHA
        })
      }
    );

    if (!response.ok) {
      throw new Error('Failed to update config');
    }

    return true;
  } catch (error) {
    console.error('Error updating config:', error);
    throw error;
  }
}

export async function saveChatHistory(accessToken, username, roomId, messages) {
  try {
    // 确保消息格式正确
    const formattedMessages = messages.map(msg => ({
      content: msg.content || '',
      user: {
        name: msg.user?.name || 'Unknown User',
        image: msg.user?.image || '/default-avatar.png',
        id: msg.user?.id || 'unknown'
      },
      createdAt: msg.createdAt || new Date().toISOString(),
      type: msg.type || 'message'
    }));

    // 获取当前文件的 SHA（如果存在）
    let sha;
    try {
      const currentFile = await fetch(
        `https://api.github.com/repos/${username}/dock-chat-data/contents/chats/${roomId}.json`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      );

      if (currentFile.ok) {
        const data = await currentFile.json();
        sha = data.sha;
      }
    } catch (error) {
      console.log('File does not exist yet, creating new file');
    }

    // 确保目录存在
    try {
      await fetch(
        `https://api.github.com/repos/${username}/dock-chat-data/contents/chats/.gitkeep`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: 'Ensure chats directory exists',
            content: 'MQ==', // Base64 encoded "1"
          })
        }
      );
    } catch (error) {
      console.log('Directory already exists');
    }

    // 保存消息
    const content = btoa(unescape(encodeURIComponent(JSON.stringify(formattedMessages, null, 2))));
    const response = await fetch(
      `https://api.github.com/repos/${username}/dock-chat-data/contents/chats/${roomId}.json`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.github.v3+json'
        },
        body: JSON.stringify({
          message: `Update chat history for ${roomId}`,
          content,
          sha: sha // 如果文件已存在，需要提供 SHA
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Failed to save messages:', errorData);
      throw new Error('Failed to save chat history');
    }

    return formattedMessages;
  } catch (error) {
    console.error('Error saving chat history:', error);
    throw error;
  }
}

export async function loadChatHistory(accessToken, username, roomId) {
  try {
    // 添加重试机制
    let retries = 0;
    const maxRetries = 3;
    
    while (retries < maxRetries) {
      try {
        console.log(`Attempting to load chat history for room ${roomId}, attempt ${retries + 1}`);
        
        const response = await fetch(
          `https://api.github.com/repos/${username}/dock-chat-data/contents/chats/${roomId}.json`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Accept': 'application/vnd.github.v3+json'
            }
          }
        );

        if (!response.ok) {
          console.error(`Failed to load chat history: Status ${response.status}`);
          if (response.status === 404) {
            console.log(`Chat history file not found for room ${roomId}`);
            return []; // 如果文件不存在，返回空数组
          }
          throw new Error(`Failed to load chat history: ${response.statusText}`);
        }

        const data = await response.json();
        
        // 安全的 Base64 解码
        try {
          const decodedContent = atob(data.content.replace(/\s/g, ''));
          const content = decodeURIComponent(escape(decodedContent));
          const messages = JSON.parse(content);
          
          console.log(`Successfully loaded ${messages.length} messages for room ${roomId}`);
          
          // 确保每条消息都有必要的字段
          return messages.map(msg => ({
            content: msg.content || '',
            user: {
              name: msg.user?.name || 'Unknown User',
              image: msg.user?.image || '/default-avatar.png',
              id: msg.user?.id || 'unknown'
            },
            createdAt: msg.createdAt || new Date().toISOString(),
            type: msg.type || 'message'
          }));
        } catch (decodeError) {
          console.error('Error decoding chat history:', decodeError);
          throw new Error('Failed to decode chat history content');
        }
      } catch (error) {
        console.error(`Retry ${retries + 1} failed:`, error);
        if (error.message.includes('404')) {
          return []; // 如果是 404 错误，直接返回空数组
        }
        if (retries === maxRetries - 1) {
          console.error('All retries failed for loading chat history');
          throw error;
        }
      }
      retries++;
      if (retries < maxRetries) {
        const delay = 1000 * retries;
        console.log(`Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    return []; // 如果所有重试都失败，返回空数组
  } catch (error) {
    console.error('Fatal error loading chat history:', error);
    throw new Error(`无法加载聊天记录：${error.message}`);
  }
}

export async function createRepository(accessToken, username) {
  try {
    // 创建仓库
    const createResponse = await fetch('https://api.github.com/user/repos', {
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
    });

    if (!createResponse.ok) {
      throw new Error('Failed to create repository');
    }

    // 等待仓库创建完成
    let retries = 0;
    const maxRetries = 10;
    while (retries < maxRetries) {
      const checkResponse = await fetch(
        `https://api.github.com/repos/${username}/dock-chat-data`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      );

      if (checkResponse.ok) {
        // 创建必要的目录结构
        const directories = ['chats', 'config', 'friend_requests'];
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
            activeChat: ''
          },
          contacts: [],
          last_updated: new Date().toISOString()
        };

        const encodedConfig = btoa(JSON.stringify(initialConfig, null, 2));
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
              content: encodedConfig
            })
          }
        );

        return true;
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
      retries++;
    }

    throw new Error('Repository initialization timeout');
  } catch (error) {
    console.error('Error creating repository:', error);
    throw error;
  }
}

export async function addRepositoryCollaborator(ownerAccessToken, ownerUsername, collaboratorUsername) {
  try {
    console.log(`Adding ${collaboratorUsername} as collaborator to ${ownerUsername}/dock-chat-data`);
    
    // 检查用户是否已经是协作者
    const checkResponse = await fetch(
      `https://api.github.com/repos/${ownerUsername}/dock-chat-data/collaborators/${collaboratorUsername}`,
      {
        headers: {
          'Authorization': `Bearer ${ownerAccessToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );

    if (checkResponse.status === 204) {
      console.log(`${collaboratorUsername} is already a collaborator`);
      return { status: 'already_exists' };
    }

    // 添加协作者
    const response = await fetch(
      `https://api.github.com/repos/${ownerUsername}/dock-chat-data/collaborators/${collaboratorUsername}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${ownerAccessToken}`,
          'Accept': 'application/vnd.github.v3+json'
        },
        body: JSON.stringify({
          permission: 'pull' // 只给予读取权限
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Failed to add collaborator:', errorData);
      throw new Error('无法添加协作者');
    }

    return { status: 'invitation_sent' };
  } catch (error) {
    console.error('Error adding collaborator:', error);
    throw new Error(`无法添加协作者：${error.message}`);
  }
}

export async function removeRepositoryCollaborator(ownerAccessToken, ownerUsername, collaboratorUsername) {
  try {
    console.log(`Removing ${collaboratorUsername} as collaborator from ${ownerUsername}/dock-chat-data`);
    
    const response = await fetch(
      `https://api.github.com/repos/${ownerUsername}/dock-chat-data/collaborators/${collaboratorUsername}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${ownerAccessToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );

    if (!response.ok && response.status !== 404) {
      const errorData = await response.json();
      console.error('Failed to remove collaborator:', errorData);
      throw new Error('无法移除协作者');
    }

    return true;
  } catch (error) {
    console.error('Error removing collaborator:', error);
    throw new Error(`无法移除协作者：${error.message}`);
  }
}

export async function checkCollaboratorStatus(accessToken, ownerUsername, collaboratorUsername) {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${ownerUsername}/dock-chat-data/collaborators/${collaboratorUsername}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );

    if (response.status === 204) {
      return 'active';
    } else if (response.status === 404) {
      // 检查是否有待处理的邀请
      const invitationsResponse = await fetch(
        `https://api.github.com/repos/${ownerUsername}/dock-chat-data/invitations`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      );

      if (invitationsResponse.ok) {
        const invitations = await invitationsResponse.json();
        const pendingInvitation = invitations.find(inv => inv.invitee.login === collaboratorUsername);
        if (pendingInvitation) {
          return 'pending';
        }
      }
      return 'none';
    }
    return 'unknown';
  } catch (error) {
    console.error('Error checking collaborator status:', error);
    throw new Error(`无法检查协作者状态：${error.message}`);
  }
} 