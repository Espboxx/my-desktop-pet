import { useSharedSettings } from '@/context/useSharedSettings'

export { type PetSettings } from '@/types/settings'

export default function useSettings() {
  return useSharedSettings()
}
