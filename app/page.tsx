'use client'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Loading from './components/Loading'

export default function RootPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return

    if (!session) {
      router.push('/login')
      return
    }

    // 如果已登录，重定向到用户主页
    if (session.user.login) {
      router.push(`/${session.user.login}`)
    }
  }, [status, session, router])

  if (status === 'loading') {
    return <Loading />
  }

  return null
}