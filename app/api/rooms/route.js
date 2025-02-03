import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/auth/config';

// 简单的内存存储，在实际应用中应该使用数据库
const rooms = new Map();

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

    rooms.set(roomId, room);
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
      const room = rooms.get(roomId);
      if (!room) {
        return NextResponse.json({ error: 'Room not found' }, { status: 404 });
      }
      return NextResponse.json(room);
    }

    // 返回所有聊天室
    return NextResponse.json(Array.from(rooms.values()));
  } catch (error) {
    console.error('Error getting rooms:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 