export interface User {
  id: string
  name: string
  image: string
}

export interface Message {
  id: string
  content: string
  user: User
  createdAt: string
  type?: 'text' | 'system'
}

export interface ChatState {
  messages: Message[]
  onlineUsers: User[]
  isConnected: boolean
  showUserList: boolean
} 