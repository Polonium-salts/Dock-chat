import { useState, useEffect, useRef } from 'react';
import { useSocket } from '../hooks/useSocket';
import EmojiPicker from 'emoji-picker-react';

export default function Chat() {
  const [inputMessage, setInputMessage] = useState('');
  const [username, setUsername] = useState('');
  const [isJoined, setIsJoined] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef(null);
  const { 
    connected, 
    messages, 
    onlineUsers, 
    joinChat, 
    sendMessage, 
    startTyping, 
    stopTyping 
  } = useSocket();

  // 自动滚动到最新消息
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleJoin = (e) => {
    e.preventDefault();
    if (username.trim()) {
      setIsJoined(true);
      joinChat(username.trim());
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputMessage.trim() && username) {
      sendMessage({
        user: username,
        content: inputMessage.trim(),
      });
      setInputMessage('');
      stopTyping();
    }
  };

  const handleInputChange = (e) => {
    setInputMessage(e.target.value);
    startTyping();
  };

  const handleEmojiClick = (emojiData) => {
    setInputMessage((prev) => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  if (!isJoined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <form onSubmit={handleJoin} className="w-full max-w-md space-y-4 rounded-lg bg-white p-8 shadow-md">
          <h2 className="text-2xl font-bold text-center text-gray-800">加入聊天</h2>
          <div>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="输入你的用户名"
              className="w-full rounded-lg border p-2 focus:border-blue-500 focus:outline-none"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-lg bg-blue-500 py-2 text-white hover:bg-blue-600"
          >
            加入
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* 在线用户列表 */}
      <div className="w-64 bg-white p-4 shadow-md">
        <h2 className="mb-4 text-lg font-semibold">在线用户</h2>
        <div className="space-y-2">
          {onlineUsers.map((user, index) => (
            <div key={index} className="flex items-center space-x-2">
              <div className="h-2 w-2 rounded-full bg-green-500"></div>
              <span>{user.username}</span>
              {user.isTyping && (
                <span className="text-sm text-gray-500">正在输入...</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 聊天区域 */}
      <div className="flex flex-1 flex-col">
        <div className="container mx-auto flex max-w-4xl flex-1 flex-col gap-4 p-4">
          <div className="rounded-lg bg-white p-4 shadow-md">
            <h1 className="text-xl font-bold">在线聊天室</h1>
            <p className="text-sm text-gray-500">
              {connected ? '已连接' : '连接中...'}
            </p>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto rounded-lg bg-white p-4 shadow-md">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex flex-col ${
                  msg.isSystem
                    ? 'items-center'
                    : msg.user === username
                    ? 'items-end'
                    : 'items-start'
                }`}
              >
                {msg.isSystem ? (
                  <div className="rounded-lg bg-gray-100 px-4 py-2 text-sm text-gray-500">
                    {msg.content}
                  </div>
                ) : (
                  <div
                    className={`max-w-[70%] rounded-lg p-3 ${
                      msg.user === username
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    <p className="text-sm font-semibold">{msg.user}</p>
                    <p>{msg.content}</p>
                    <div className="mt-1 flex items-center justify-between text-xs opacity-70">
                      <span>{new Date(msg.timestamp).toLocaleTimeString()}</span>
                      <span className="ml-2">
                        {msg.readBy?.length} 人已读
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSubmit} className="relative flex gap-2">
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="rounded-lg bg-gray-100 px-3 py-2 hover:bg-gray-200"
            >
              😊
            </button>
            {showEmojiPicker && (
              <div className="absolute bottom-full mb-2">
                <EmojiPicker onEmojiClick={handleEmojiClick} />
              </div>
            )}
            <input
              type="text"
              value={inputMessage}
              onChange={handleInputChange}
              onBlur={stopTyping}
              placeholder="输入消息..."
              className="flex-1 rounded-lg border p-2 focus:border-blue-500 focus:outline-none"
              required
            />
            <button
              type="submit"
              className="rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
            >
              发送
            </button>
          </form>
        </div>
      </div>
    </div>
  );
} 