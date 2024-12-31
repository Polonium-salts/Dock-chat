'use client'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Home from '../../components/Home'
import Loading from '../../components/Loading'

interface PageProps {
  params: {
    username: string
    roomId: string
  }
}

export default function RoomPage({ params }: PageProps) {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return

    if (!session) {
      router.push('/login')
      return
    }

    // 如果访问的是其他用户的页面，重定向到自己的页面
    if (session.user.login && params.username !== session.user.login) {
      router.push(`/${session.user.login}/${params.roomId}`)
      return
    }
  }, [status, session, params.username, params.roomId, router])

  if (status === 'loading') {
    return <Loading />
  }

  return <Home params={params} />
} 