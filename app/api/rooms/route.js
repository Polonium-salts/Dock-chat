import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import roomsStore from '@/app/lib/roomsStore';

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name } = await req.json();
    const roomId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const room = {
      id: roomId,
      name,
      createdBy: session.user,
      createdAt: new Date().toISOString(),
      members: [session.user],
    };

    roomsStore.createRoom(roomId, room);
    return NextResponse.json(room);
  } catch (error) {
    console.error('Error creating room:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const roomId = searchParams.get('id');

    if (roomId) {
      const room = roomsStore.getRoom(roomId);
      if (!room) {
        return NextResponse.json({ error: 'Room not found' }, { status: 404 });
      }
      return NextResponse.json(room);
    }

    // 返回所有聊天室
    return NextResponse.json(roomsStore.getAllRooms());
  } catch (error) {
    console.error('Error getting rooms:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 