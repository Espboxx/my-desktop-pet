import { useSharedSettings } from '@/context/SettingsContext'

export { type PetSettings } from '@/types/settings'

export default function useSettings() {
  return useSharedSettings()
}
