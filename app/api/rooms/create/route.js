import { pusherServer } from '../../../lib/pusher';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const roomData = await req.json();

    // 触发房间创建事件
    await pusherServer.trigger(
      'presence-chat',
      'room_created',
      roomData
    );

    return NextResponse.json({ success: true, room: roomData });
  } catch (error) {
    console.error('Error creating room:', error);
    return NextResponse.json(
      { error: 'Failed to create room' },
      { status: 500 }
    );
  }
} 