import { NextResponse } from 'next/server';
import { pusherServer } from '@/app/lib/pusher';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/auth/config';

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { content, roomId } = await req.json();
    const message = {
      id: Date.now(),
      content,
      user: session.user,
      roomId,
      timestamp: new Date().toISOString(),
    };

    // 触发消息到特定的聊天室
    await pusherServer.trigger(`room-${roomId}`, 'new-message', message);

    return NextResponse.json(message);
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 