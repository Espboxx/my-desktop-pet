import { useContext } from 'react'
import { SettingsContext } from './SettingsContext'

export function useSharedSettings() {
  const context = useContext(SettingsContext)
  if (!context) {
    throw new Error('useSharedSettings must be used within a SettingsProvider')
  }
  return context
}
