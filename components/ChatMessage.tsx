import { FC } from 'react'
import Image from 'next/image'
import { Message } from '@/types/chat'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'

interface ChatMessageProps {
  message: Message
  isOwnMessage: boolean
}

const ChatMessage: FC<ChatMessageProps> = ({ message, isOwnMessage }) => {
  const formattedTime = format(new Date(message.createdAt), 'HH:mm', { locale: zhCN })
  
  if (message.type === 'system') {
    return (
      <div className="flex justify-center">
        <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
          {message.content}
        </span>
      </div>
    )
  }

  return (
    <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
      <div className="flex items-start gap-2 max-w-[70%] group">
        {!isOwnMessage && (
          <Image
            src={message.user.image}
            alt={message.user.name}
            width={32}
            height={32}
            className="rounded-full"
          />
        )}
        <div
          className={`rounded-lg p-3 ${
            isOwnMessage
              ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
              : 'bg-gray-100 hover:bg-gray-200 transition-colors'
          }`}
        >
          {!isOwnMessage && (
            <p className="text-sm font-semibold text-gray-700 mb-1">
              {message.user.name}
            </p>
          )}
          <p className="break-words text-[15px] leading-relaxed">
            {message.content}
          </p>
          <div className={`flex items-center gap-1 mt-1 text-xs ${
            isOwnMessage ? 'text-blue-100' : 'text-gray-500'
          }`}>
            <span>{formattedTime}</span>
            {isOwnMessage && (
              <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                • 已发送
              </span>
            )}
          </div>
        </div>
        {isOwnMessage && (
          <Image
            src={message.user.image}
            alt={message.user.name}
            width={32}
            height={32}
            className="rounded-full"
          />
        )}
      </div>
    </div>
  )
}

export default ChatMessage 