import { getServerSession } from 'next-auth/next';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.login || !session.accessToken) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const { roomId } = await request.json();
    if (!roomId) {
      return NextResponse.json({ error: '缺少聊天室ID' }, { status: 400 });
    }

    // 从roomId中提取用户名和时间戳
    const [username, timestamp] = roomId.split('@');
    if (!username || !timestamp) {
      return NextResponse.json({ error: '无效的聊天室ID' }, { status: 400 });
    }

    // 检查聊天室是否存在
    const roomResponse = await fetch(
      `https://api.github.com/repos/${username}/dock-chat-data/contents/chats/${timestamp}/info.json`,
      {
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );

    if (!roomResponse.ok) {
      if (roomResponse.status === 404) {
        return NextResponse.json({ error: '聊天室不存在' }, { status: 404 });
      }
      return NextResponse.json({ error: '无法访问聊天室' }, { status: 403 });
    }

    const roomData = await roomResponse.json();
    const roomInfo = JSON.parse(atob(roomData.content));

    // 检查是否已经是成员
    const isMember = roomInfo.members?.some(member => 
      typeof member === 'object' ? member.login === session.user.login : member === session.user.login
    );
    if (isMember) {
      return NextResponse.json({ message: '您已经是该聊天室的成员' }, { status: 200 });
    }

    // 获取成员列表
    const membersResponse = await fetch(
      `https://api.github.com/repos/${username}/dock-chat-data/contents/chats/${timestamp}/members.json`,
      {
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );

    let members = {
      total: 0,
      list: [],
      updated_at: new Date().toISOString()
    };

    if (membersResponse.ok) {
      const membersData = await membersResponse.json();
      members = JSON.parse(atob(membersData.content));
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
      `https://api.github.com/repos/${username}/dock-chat-data/contents/join_requests/${requestId}.json`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.github.v3+json'
        },
        body: JSON.stringify({
          message: `Join request from ${session.user.login}`,
          content: encodedRequest
        })
      }
    );

    if (!requestResponse.ok) {
      return NextResponse.json({ error: '发送加入申请失败' }, { status: 500 });
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
        `https://api.github.com/repos/${username}/dock-chat-data/contents/chats/system/messages.json`,
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
      const saveResponse = await fetch(
        `https://api.github.com/repos/${username}/dock-chat-data/contents/chats/system/messages.json`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${session.accessToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/vnd.github.v3+json'
          },
          body: JSON.stringify({
            message: `System notification: join request from ${session.user.login}`,
            content: btoa(JSON.stringify(messages, null, 2)),
            ...(sha ? { sha } : {})
          })
        }
      );

      if (!saveResponse.ok && saveResponse.status !== 404) {
        console.error('Error saving system message');
      }
    } catch (error) {
      console.error('Error handling system message:', error);
      // 继续执行，因为这不是关键错误
    }

    return NextResponse.json({ 
      message: '已发送加入申请',
      members: members.total
    }, { status: 200 });
  } catch (error) {
    console.error('Error handling join request:', error);
    return NextResponse.json({ error: '处理加入请求时出错' }, { status: 500 });
  }
} 