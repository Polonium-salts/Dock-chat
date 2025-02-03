import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { pusherServer } from '@/app/lib/pusher';

export const runtime = 'nodejs';

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

    // Send message to specific room
    await pusherServer.trigger(`room-${roomId}`, 'new-message', message);

    // AI response
    try {
      const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [{ role: "user", content }],
        }),
      }).then(res => res.json());

      const aiMessage = {
        id: Date.now() + 1,
        content: aiResponse.choices[0].message.content,
        user: {
          name: 'AI Assistant',
          email: 'ai@example.com',
          image: '/ai-avatar.png'
        },
        roomId,
        timestamp: new Date().toISOString(),
      };

      await pusherServer.trigger(`room-${roomId}`, 'new-message', aiMessage);
      return NextResponse.json([message, aiMessage]);
    } catch (error) {
      console.error('Error getting AI response:', error);
      return NextResponse.json([message]);
    }
  } catch (error) {
    console.error('Error processing message:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 