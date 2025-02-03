import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/auth/config';
import { pusherServer } from '@/app/lib/pusher';
import { getRoom, addMemberToRoom } from '@/app/lib/rooms';

// 简单的内存存储，在实际应用中应该使用数据库
const rooms = new Map();

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { roomId } = await req.json();
    const room = getRoom(roomId);

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    const wasAdded = addMemberToRoom(roomId, session.user);
    if (wasAdded) {
      // 通知房间其他成员有新用户加入
      await pusherServer.trigger(`room-${roomId}`, 'member-joined', {
        user: session.user,
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json(room);
  } catch (error) {
    console.error('Error joining room:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 