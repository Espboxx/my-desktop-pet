import type { BrowserWindow, Tray } from 'electron'

export interface PetBehavior {
  activityLevel: 'calm' | 'normal' | 'playful'
  moveInterval: number
  expressionChangeInterval: number
}

export interface AppState {
  petWindow: BrowserWindow | null
  settingsWindow: BrowserWindow | null
  appTray: Tray | null
  quitting: boolean
  petBehavior: PetBehavior
  isDatabaseInitialized: boolean
}

export const DEFAULT_PET_HEIGHT = 400
export const EXPANDED_PET_HEIGHT = 500

export const DEFAULT_PET_BEHAVIOR: PetBehavior = {
  activityLevel: 'normal',
  moveInterval: 10000,
  expressionChangeInterval: 15000,
}
