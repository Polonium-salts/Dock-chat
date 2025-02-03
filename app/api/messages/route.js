import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { pusherServer } from '@/app/lib/pusher';
import { Configuration, OpenAIApi } from 'openai';

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

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

    // 发送消息到特定房间
    await pusherServer.trigger(`room-${roomId}`, 'new-message', message);

    // AI response
    try {
      const completion = await openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content }],
      });

      const aiResponse = {
        id: Date.now() + 1,
        content: completion.data.choices[0].message.content,
        user: {
          name: 'AI Assistant',
          email: 'ai@example.com',
          image: '/ai-avatar.png'
        },
        roomId,
        timestamp: new Date().toISOString(),
      };

      await pusherServer.trigger(`room-${roomId}`, 'new-message', aiResponse);
      return NextResponse.json([message, aiResponse]);
    } catch (error) {
      console.error('Error getting AI response:', error);
      return NextResponse.json([message]);
    }
  } catch (error) {
    console.error('Error processing message:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 