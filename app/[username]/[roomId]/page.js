import Home from '../../page'

export default function RoomPage({ params }) {
  return <Home username={params.username} roomId={params.roomId} />
} 