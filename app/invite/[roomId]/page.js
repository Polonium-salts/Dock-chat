'use client'

import { useEffect, useState } from 'react'
import { useSession, signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { searchChatRoom } from '@/lib/chatRoom'

export default function InvitePage({ params }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [roomInfo, setRoomInfo] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isJoining, setIsJoining] = useState(false)

  const inviteId = params.roomId
  const roomName = searchParams.get('name')

  // 加载聊天室信息
  useEffect(() => {
    const loadRoomInfo = async () => {
      if (!session?.accessToken) return;

      try {
        setIsLoading(true);
        setError(null);
        console.log('Loading room info for invite:', inviteId); // 调试日志

        // 从邀请ID中提取用户名和时间戳
        const [owner, timestamp] = inviteId.split('-');
        if (!owner || !timestamp) {
          throw new Error('无效的邀请链接');
        }

        // 构造聊天室ID
        const roomId = `${owner}@${timestamp}`;
        console.log('Constructed room ID:', roomId); // 调试日志

        // 检查用户是否存在
        const userResponse = await fetch(
          `https://api.github.com/users/${owner}`,
          {
            headers: {
              'Authorization': `Bearer ${session.accessToken}`,
              'Accept': 'application/vnd.github.v3+json'
            }
          }
        );

        if (!userResponse.ok) {
          throw new Error('找不到聊天室创建者');
        }

        // 检查数据仓库是否存在
        const repoResponse = await fetch(
          `https://api.github.com/repos/${owner}/dock-chat-data`,
          {
            headers: {
              'Authorization': `Bearer ${session.accessToken}`,
              'Accept': 'application/vnd.github.v3+json'
            }
          }
        );

        if (!repoResponse.ok) {
          throw new Error('无法访问聊天室数据');
        }

        // 尝试多个可能的路径
        const possiblePaths = [
          `chats/${timestamp}/info.json`,
          `chats/${owner}-${timestamp}/info.json`,
          `chats/${owner}@${timestamp}/info.json`
        ];

        let roomData = null;
        for (const path of possiblePaths) {
          console.log('Trying path:', path); // 调试日志
          try {
            const response = await fetch(
              `https://api.github.com/repos/${owner}/dock-chat-data/contents/${path}`,
              {
                headers: {
                  'Authorization': `Bearer ${session.accessToken}`,
                  'Accept': 'application/vnd.github.v3+json'
                }
              }
            );

            if (response.ok) {
              roomData = await response.json();
              break;
            }
          } catch (error) {
            console.log('Error trying path:', path, error);
            continue;
          }
        }

        if (!roomData) {
          throw new Error('聊天室不存在');
        }

        const roomInfo = JSON.parse(atob(roomData.content));
        console.log('Found room info:', roomInfo); // 调试日志

        setRoomInfo({
          ...roomInfo,
          id: roomId
        });
      } catch (error) {
        console.error('Error loading room info:', error);
        setError(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    if (session?.accessToken) {
      loadRoomInfo();
    }
  }, [session, inviteId]);

  // 处理加入聊天室
  const handleJoin = async () => {
    if (!session?.accessToken || !roomInfo) return;

    try {
      setIsJoining(true);
      setError(null);
      console.log('Joining room:', roomInfo.id); // 调试日志

      // 发送加入请求
      const response = await fetch('/api/chat/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ roomId: roomInfo.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '加入聊天室失败');
      }

      // 加入成功，跳转到聊天室
      const [owner, timestamp] = roomInfo.id.split('@');
      router.push(`/${owner}/${timestamp}`);
    } catch (error) {
      console.error('Error joining room:', error);
      setError(error.message);
    } finally {
      setIsJoining(false);
    }
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">请先登录</h1>
          <p className="text-gray-600 mb-4">您需要登录才能加入聊天室</p>
          <button
            onClick={() => signIn('github')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            使用 GitHub 登录
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">出错了</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
        <h1 className="text-2xl font-bold mb-4">加入聊天室</h1>
        {roomInfo && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-2">{roomInfo.name}</h2>
            <p className="text-gray-600 mb-4">{roomInfo.description || '暂无描述'}</p>
            <div className="text-sm text-gray-500 mb-4">
              <p>创建者：{roomInfo.owner.name} ({roomInfo.owner.login})</p>
              <p>成员数：{roomInfo.members?.length || 0}</p>
              <p>创建时间：{new Date(roomInfo.created_at).toLocaleString()}</p>
              <p>类型：{roomInfo.type === 'private' ? '私有' : '公开'}</p>
            </div>
          </div>
        )}
        <div className="flex justify-end space-x-4">
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            取消
          </button>
          <button
            onClick={handleJoin}
            disabled={isJoining}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {isJoining ? '加入中...' : '加入聊天室'}
          </button>
        </div>
      </div>
    </div>
  );
} 