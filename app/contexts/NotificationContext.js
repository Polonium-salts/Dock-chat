'use client'

import React, { createContext, useContext, useState } from 'react'
import { Notification } from '../components/Notification'

const NotificationContext = createContext()

export function NotificationProvider({ children }) {
  const [notification, setNotification] = useState(null)

  const showNotification = (type, title, message, duration = 3000) => {
    setNotification({ type, title, message })
    if (duration > 0) {
      setTimeout(() => {
        setNotification(null)
      }, duration)
    }
  }

  const hideNotification = () => {
    setNotification(null)
  }

  return (
    <NotificationContext.Provider value={{ showNotification, hideNotification }}>
      {children}
      {notification && (
        <Notification
          type={notification.type}
          title={notification.title}
          message={notification.message}
          onClose={hideNotification}
        />
      )}
    </NotificationContext.Provider>
  )
}

export function useNotification() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider')
  }
  return context
} 