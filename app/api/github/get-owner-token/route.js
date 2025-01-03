import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request) {
  try {
    // 获取当前用户的会话
    const session = await getServerSession(authOptions);
    if (!session) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 获取请求的用户名参数
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');

    if (!username) {
      return new Response(JSON.stringify({ error: 'Missing username parameter' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 检查当前用户是否是请求的所有者
    if (session.user.login === username) {
      return new Response(JSON.stringify({ ownerAccessToken: session.accessToken }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // TODO: 如果不是所有者，需要从数据库或其他存储中获取所有者的访问令牌
    // 这里需要实现一个安全的机制来存储和检索其他用户的访问令牌
    return new Response(JSON.stringify({ error: 'Not implemented' }), {
      status: 501,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in get-owner-token route:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
} 