import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/config';

export async function GET(request) {
  try {
    // 获取当前用户的会话
    const session = await getServerSession(authOptions);
    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 获取请求的用户名参数
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');

    if (!username) {
      return Response.json({ error: 'Missing username parameter' }, { status: 400 });
    }

    // 检查当前用户是否是请求的所有者
    if (session.user.login === username) {
      return Response.json({ ownerAccessToken: session.accessToken });
    }

    // 如果不是所有者，返回错误
    return Response.json({ error: '无权访问该聊天室' }, { status: 403 });
  } catch (error) {
    console.error('Error in get-owner-token route:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
} 