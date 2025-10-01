'use client'

import { useState, useEffect } from 'react'

export default function SimpleTest() {
  const [message, setMessage] = useState('Component loaded')

  useEffect(() => {
    console.log('useEffect triggered')
    setMessage('useEffect triggered')
    
    // Try a simple fetch without async/await
    fetch('/api/students')
      .then(response => {
        console.log('Fetch response received:', response.status)
        setMessage('Response received: ' + response.status)
        return response.json()
      })
      .then(data => {
        console.log('Data parsed:', data.length)
        setMessage('Data loaded: ' + data.length + ' students')
      })
      .catch(error => {
        console.error('Fetch error:', error)
        setMessage('Error: ' + error.message)
      })
  }, [])

  return (
    <div style={{ padding: '20px' }}>
      <h1>Simple Test</h1>
      <p>Message: {message}</p>
    </div>
  )
}