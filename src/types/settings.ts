export type ActivityLevel = 'calm' | 'normal' | 'playful'

export interface PetSettings {
  petType: string
  accessory: string | null
  alwaysOnTop: boolean
  soundEnabled: boolean
  activityLevel: ActivityLevel
  autoHideFullscreen: boolean
  launchOnStartup: boolean
  size: number
  opacity: number
}

export const DEFAULT_PET_SETTINGS: PetSettings = {
  petType: 'default',
  accessory: null,
  alwaysOnTop: true,
  soundEnabled: true,
  activityLevel: 'normal',
  autoHideFullscreen: true,
  launchOnStartup: true,
  size: 100,
  opacity: 100,
}
