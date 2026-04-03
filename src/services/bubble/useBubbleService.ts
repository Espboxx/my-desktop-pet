import { useContext } from 'react'
import { BubbleContext } from './BubbleContext'

export function useBubbleService() {
  const context = useContext(BubbleContext)
  if (context === undefined) {
    throw new Error('useBubbleService must be used within a BubbleProvider')
  }
  return context
}
