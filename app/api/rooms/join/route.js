import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { pusherServer } from '@/app/lib/pusher';
import roomsStore from '@/app/lib/roomsStore';

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { roomId } = await req.json();
    const room = roomsStore.getRoom(roomId);

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    // 检查用户是否已经在房间中
    if (!room.members.find(member => member.email === session.user.email)) {
      room.members.push(session.user);
      roomsStore.updateRoom(roomId, room);

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