import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { DEFAULT_PET_SETTINGS, type PetSettings } from '@/types/settings'

interface SettingsContextValue {
  settings: PetSettings
  isLoaded: boolean
  updateSetting: <K extends keyof PetSettings>(key: K, value: PetSettings[K]) => void
  replaceSettings: (nextSettings: PetSettings) => void
}

export const SettingsContext = createContext<SettingsContextValue | undefined>(undefined)

interface SettingsProviderProps {
  children: ReactNode
}

export function SettingsProvider({ children }: SettingsProviderProps) {
  const [settings, setSettings] = useState<PetSettings>(DEFAULT_PET_SETTINGS)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    let isMounted = true
    const unsubscribe = window.desktopPet.on<PetSettings>('settings-updated', (_event, nextSettings) => {
      if (!isMounted) {
        return
      }

      setSettings({ ...DEFAULT_PET_SETTINGS, ...nextSettings })
      setIsLoaded(true)
    })

    const loadSettings = async () => {
      try {
        const savedSettings = await window.desktopPet.getPetSettings()
        if (isMounted) {
          setSettings({ ...DEFAULT_PET_SETTINGS, ...savedSettings })
        }
      } catch (error) {
        console.error('加载设置失败:', error)
      } finally {
        if (isMounted) {
          setIsLoaded(true)
        }
      }
    }

    void loadSettings()

    return () => {
      isMounted = false
      unsubscribe()
    }
  }, [])

  const persistSettings = useCallback((nextSettings: PetSettings) => {
    setSettings(nextSettings)
    window.desktopPet.savePetSettings(nextSettings)
  }, [])

  const updateSetting = useCallback<SettingsContextValue['updateSetting']>((key, value) => {
    setSettings((previousSettings) => {
      const nextSettings = { ...previousSettings, [key]: value }
      window.desktopPet.savePetSettings(nextSettings)
      return nextSettings
    })
  }, [])

  const replaceSettings = useCallback((nextSettings: PetSettings) => {
    persistSettings(nextSettings)
  }, [persistSettings])

  const value = useMemo<SettingsContextValue>(() => ({
    settings,
    isLoaded,
    updateSetting,
    replaceSettings,
  }), [isLoaded, replaceSettings, settings, updateSetting])

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

