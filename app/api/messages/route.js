import { NextResponse } from 'next/server'
import { getChatMessages, getChatRoom, getAllChatRooms, createChatRoom } from '@/lib/redis'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const roomId = searchParams.get('roomId')
    const limit = parseInt(searchParams.get('limit') || '50')

    if (!roomId) {
      // 如果没有指定roomId，返回所有聊天室列表
      const rooms = await getAllChatRooms()
      return NextResponse.json({ rooms })
    }

    // 获取聊天室信息
    const room = await getChatRoom(roomId)
    if (!room) {
      return NextResponse.json(
        { error: 'Chat room not found' },
        { status: 404 }
      )
    }

    // 获取聊天记录
    const messages = await getChatMessages(roomId, limit)
    
    return NextResponse.json({
      room,
      messages
    })
  } catch (error) {
    console.error('Error fetching messages:', error)
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { roomId, name } = body

    if (!roomId || !name) {
      return NextResponse.json(
        { error: 'Room ID and name are required' },
        { status: 400 }
      )
    }

    // 检查聊天室是否已存在
    const existingRoom = await getChatRoom(roomId)
    if (existingRoom) {
      return NextResponse.json(
        { error: 'Chat room already exists' },
        { status: 409 }
      )
    }

    // 创建新的聊天室
    await createChatRoom(roomId, name)
    const room = await getChatRoom(roomId)

    return NextResponse.json({ room })
  } catch (error) {
    console.error('Error creating chat room:', error)
    return NextResponse.json(
      { error: 'Failed to create chat room' },
      { status: 500 }
    )
  }
} 