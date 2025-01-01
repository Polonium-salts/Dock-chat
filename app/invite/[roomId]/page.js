'use client'

import { useEffect, useState } from 'react'
import { useSession, signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'

export default function InvitePage({ params }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [roomInfo, setRoomInfo] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const roomId = params.roomId
  const roomName = searchParams.get('name')

  // 加载聊天室信息
  useEffect(() => {
    const loadRoomInfo = async () => {
      if (!session?.accessToken) return;

      try {
        setIsLoading(true);
        const [owner] = roomId.split('-');
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
          throw new Error('聊天室不存在或无法访问');
        }

        const data = await response.json();
        const info = JSON.parse(atob(data.content));
        setRoomInfo(info);
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
  }, [session, roomId]);

  // 处理加入聊天室
  const handleJoin = async () => {
    if (!session?.accessToken) {
      signIn('github');
      return;
    }

    try {
      setIsLoading(true);
      const [owner] = roomId.split('-');

      // 创建加入申请
      const joinRequest = {
        id: `jr-${Date.now()}`,
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
      const response = await fetch(
        `https://api.github.com/repos/${owner}/dock-chat-data/contents/join_requests/${roomId}/${joinRequest.id}.json`,
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

      if (!response.ok) {
        throw new Error('发送加入申请失败');
      }

      // 发送系统通知给管理员
      const systemMessage = {
        id: `sys-${Date.now()}`,
        content: `用户 ${session.user.name} (${session.user.login}) 通过邀请链接请求加入聊天室 ${roomId}`,
        type: 'join_request',
        user: {
          name: 'System',
          image: '/system-avatar.png',
          id: 'system'
        },
        request: joinRequest,
        createdAt: new Date().toISOString()
      };

      // 加载管理员的系统消息
      const adminMessages = await fetch(
        `https://api.github.com/repos/${owner}/dock-chat-data/contents/chats/system/messages.json`,
        {
          headers: {
            'Authorization': `Bearer ${session.accessToken}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      ).then(res => res.json());

      const messages = adminMessages ? JSON.parse(atob(adminMessages.content)) : [];
      messages.push(systemMessage);

      // 保存系统消息
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
            sha: adminMessages.sha
          })
        }
      );

      // 重定向到主页
      router.push(`/${session.user.login}`);
    } catch (error) {
      console.error('Error joining room:', error);
      setError('加入聊天室失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
          <div className="p-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {roomName || '聊天室邀请'}
              </h2>
              {roomInfo && (
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  {roomInfo.description || '欢迎加入我们的聊天室！'}
                </p>
              )}
              {error ? (
                <div className="text-red-500 dark:text-red-400 mb-4">
                  {error}
                </div>
              ) : (
                <div className="space-y-4">
                  {!session ? (
                    <button
                      onClick={() => signIn('github')}
                      className="w-full flex items-center justify-center gap-2 bg-gray-900 dark:bg-gray-700 text-white rounded-lg px-4 py-2.5 hover:bg-gray-800 dark:hover:bg-gray-600"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                      </svg>
                      使用 GitHub 登录
                    </button>
                  ) : (
                    <button
                      onClick={handleJoin}
                      disabled={isLoading}
                      className="w-full bg-blue-600 text-white rounded-lg px-4 py-2.5 hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isLoading ? '处理中...' : '加入聊天室'}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 