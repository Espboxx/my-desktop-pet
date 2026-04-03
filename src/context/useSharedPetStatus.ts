import { useContext } from 'react'
import { PetStatusContext } from './PetStatusContext'

export function useSharedPetStatus() {
  const context = useContext(PetStatusContext)
  if (context === undefined) {
    throw new Error('useSharedPetStatus must be used within a PetStatusProvider')
  }
  return context
}
