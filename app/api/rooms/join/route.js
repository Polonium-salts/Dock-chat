import { pusherServer } from '../../../lib/pusher';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { roomId } = await req.json();

    // 这里可以添加房间加入的业务逻辑
    // 例如：更新数据库中的房间成员列表

    await pusherServer.trigger(
      'presence-chat',
      'room_joined',
      { roomId }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error joining room:', error);
    return NextResponse.json(
      { error: 'Failed to join room' },
      { status: 500 }
    );
  }
} 