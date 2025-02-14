import { pusherServer } from '../../lib/pusher';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const message = await req.json();
    const roomId = message.roomId || 'general';

    // 触发消息事件
    await pusherServer.trigger(
      `presence-room-${roomId}`,
      'message',
      message
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error processing message:', error);
    return NextResponse.json(
      { error: 'Failed to process message' },
      { status: 500 }
    );
  }
} 