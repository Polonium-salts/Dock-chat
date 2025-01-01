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
      content: msg.content,
      user: {
        name: msg.user.name,
        image: msg.user.image,
        id: msg.user.id
      },
      createdAt: msg.createdAt || new Date().toISOString(),
      type: msg.type || 'message'
    }));

    // 获取当前文件的 SHA（如果存在）
    const currentFile = await fetch(
      `https://api.github.com/repos/${username}/dock-chat-data/contents/chats/${roomId}.json`,
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

    // 保存消息
    const content = btoa(JSON.stringify(formattedMessages, null, 2));
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
      if (response.status === 404) {
        return []; // 如果文件不存在，返回空数组
      }
      throw new Error('Failed to load chat history');
    }

    const data = await response.json();
    const messages = JSON.parse(atob(data.content));
    return messages;
  } catch (error) {
    console.error('Error loading chat history:', error);
    return [];
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