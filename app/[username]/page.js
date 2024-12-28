'use client'

import Home from '../page'

export default function UserPage({ params }) {
  return <Home username={params.username} />
} 