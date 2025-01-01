import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

export default function JoinRequestsPanel({ roomId, showToast }) {
  const { data: session } = useSession();
  const [joinRequests, setJoinRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // 加载加入申请
  const loadJoinRequests = async () => {
    if (!session?.user?.login || !session.accessToken) return;

    try {
      setIsLoading(true);
      const response = await fetch(
        `https://api.github.com/repos/${session.user.login}/dock-chat-data/contents/join_requests`,
        {
          headers: {
            'Authorization': `Bearer ${session.accessToken}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      );

      if (!response.ok) {
        if (response.status !== 404) {
          console.error('Error loading join requests:', await response.text());
        }
        return;
      }

      const files = await response.json();
      const requests = await Promise.all(
        files
          .filter(file => file.name.endsWith('.json'))
          .map(async file => {
            try {
              const content = await fetch(file.download_url).then(res => res.json());
              return content.status === 'pending' && content.room === roomId ? content : null;
            } catch (error) {
              console.error('Error loading join request:', error);
              return null;
            }
          })
      );

      const validRequests = requests.filter(Boolean);
      setJoinRequests(validRequests);
    } catch (error) {
      console.error('Error loading join requests:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 处理申请
  const handleRequest = async (request, action) => {
    if (!session?.user?.login || !session.accessToken) return;

    try {
      setIsLoading(true);
      
      // 更新申请状态
      const updatedRequest = {
        ...request,
        status: action === 'accept' ? 'accepted' : 'rejected',
        processed_at: new Date().toISOString()
      };

      // 保存更新后的申请
      const encodedContent = btoa(unescape(encodeURIComponent(JSON.stringify(updatedRequest, null, 2))));
      await fetch(
        `https://api.github.com/repos/${session.user.login}/dock-chat-data/contents/join_requests/${request.id}.json`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${session.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: `${action === 'accept' ? 'Accept' : 'Reject'} join request from ${request.from.login}`,
            content: encodedContent,
            sha: request.sha
          })
        }
      );

      if (action === 'accept') {
        // 更新聊天室配置，添加新成员
        const roomConfigResponse = await fetch(
          `https://api.github.com/repos/${session.user.login}/dock-chat-data/contents/rooms/${roomId}/config.json`,
          {
            headers: {
              'Authorization': `Bearer ${session.accessToken}`,
              'Accept': 'application/vnd.github.v3+json'
            }
          }
        );

        if (roomConfigResponse.ok) {
          const configData = await roomConfigResponse.json();
          const config = JSON.parse(atob(configData.content));
          
          if (!config.members.includes(request.from.login)) {
            config.members.push(request.from.login);
            
            const encodedConfig = btoa(unescape(encodeURIComponent(JSON.stringify(config, null, 2))));
            await fetch(
              `https://api.github.com/repos/${session.user.login}/dock-chat-data/contents/rooms/${roomId}/config.json`,
              {
                method: 'PUT',
                headers: {
                  'Authorization': `Bearer ${session.accessToken}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  message: `Add member ${request.from.login}`,
                  content: encodedConfig,
                  sha: configData.sha
                })
              }
            );
          }
        }
      }

      showToast(
        action === 'accept' 
          ? `已接受 ${request.from.name} 的加入申请` 
          : `已拒绝 ${request.from.name} 的加入申请`,
        'success'
      );
      
      // 重新加载申请列表
      loadJoinRequests();
    } catch (error) {
      console.error('Error handling join request:', error);
      showToast('处理加入申请失败，请重试', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadJoinRequests();
  }, [roomId]);

  if (isLoading) {
    return <div className="p-4 text-center">加载中...</div>;
  }

  if (joinRequests.length === 0) {
    return <div className="p-4 text-center text-gray-500">暂无加入申请</div>;
  }

  return (
    <div className="p-4">
      <h3 className="text-lg font-semibold mb-4">加入申请</h3>
      <div className="space-y-4">
        {joinRequests.map(request => (
          <div key={request.id} className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center mb-2">
              <img 
                src={request.from.image} 
                alt={request.from.name}
                className="w-10 h-10 rounded-full mr-3"
              />
              <div>
                <div className="font-semibold">{request.from.name}</div>
                <div className="text-sm text-gray-500">@{request.from.login}</div>
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-3">
              <button
                onClick={() => handleRequest(request, 'reject')}
                className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md"
                disabled={isLoading}
              >
                拒绝
              </button>
              <button
                onClick={() => handleRequest(request, 'accept')}
                className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-md"
                disabled={isLoading}
              >
                接受
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 