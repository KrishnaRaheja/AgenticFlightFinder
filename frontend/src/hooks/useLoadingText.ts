import { useEffect, useState } from 'react'

const MESSAGES = [
  'Scanning the skies...',
  'Checking the runway...',
  'Filing the flight plan...',
  'Contacting the tower...',
  'Warming up engines...',
  'On final approach...',
  'Fetching your data...',
  'Almost there...',
  'Boarding now...',
  'Just a moment...',
]

export function useLoadingText(intervalMs = 1800): string {
  const [index, setIndex] = useState(() => Math.floor(Math.random() * MESSAGES.length))

  useEffect(() => {
    const id = setInterval(() => setIndex(i => (i + 1) % MESSAGES.length), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])

  return MESSAGES[index]
}
