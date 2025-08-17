'use client'

import { useState, useEffect } from 'react'

export function useDemoUser() {
  const [demoUserId, setDemoUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    async function fetchDemoUser() {
      try {
        const res = await fetch('/api/demo-user')
        if (res.ok) {
          const data = await res.json()
          setDemoUserId(data.userId)
        }
      } catch (error) {
        console.error('Failed to fetch demo user:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchDemoUser()
  }, [])
  
  return { demoUserId, loading }
}