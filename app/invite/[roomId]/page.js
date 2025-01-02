'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
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
        const [owner, timestamp] = inviteId.split('-');
        if (!owner || !timestamp) {
          throw new Error('无效的邀请链接');
        }

        const roomId = `${owner}@${timestamp}`;
        const result = await searchChatRoom(session, roomId);
        
        if (result?.error) {
          throw new Error(result.error);
        }

        if (!result) {
          throw new Error('聊天室不存在或无法访问');
        }

        setRoomInfo(result);
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
      const [owner, timestamp] = inviteId.split('-');
      const roomId = `${owner}@${timestamp}`;

      // 发送加入请求
      const response = await fetch('/api/chat/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ roomId }),
      });

      if (!response.ok) {
        throw new Error('加入聊天室失败');
      }

      // 加入成功，跳转到聊天室
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