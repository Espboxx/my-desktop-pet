import React, { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react'
import usePetStatus from '@/hooks/core/usePetStatus'
import useSettings from '@/hooks/settings/useSettings'

type PetStatusContextType = ReturnType<typeof usePetStatus>

const PetStatusContext = createContext<PetStatusContextType | undefined>(undefined)

// Create a provider component
interface PetStatusProviderProps {
  children: ReactNode;
}

export const PetStatusProvider: React.FC<PetStatusProviderProps> = ({ children }) => {
  const { settings, updateSetting } = useSettings()
  const petStatusData = usePetStatus(settings.activityLevel)
  const { currentPetTypeId, setCurrentPetTypeId } = petStatusData

  useEffect(() => {
    if (settings.petType !== currentPetTypeId) {
      setCurrentPetTypeId(settings.petType)
    }
  }, [currentPetTypeId, setCurrentPetTypeId, settings.petType])

  const value = useMemo<PetStatusContextType>(() => ({
    ...petStatusData,
    setCurrentPetTypeId: (valueOrUpdater) => {
      const nextPetTypeId = typeof valueOrUpdater === 'function'
        ? valueOrUpdater(currentPetTypeId)
        : valueOrUpdater

      setCurrentPetTypeId(nextPetTypeId)
      if (settings.petType !== nextPetTypeId) {
        updateSetting('petType', nextPetTypeId)
      }
    },
  }), [currentPetTypeId, petStatusData, setCurrentPetTypeId, settings.petType, updateSetting])

  return <PetStatusContext.Provider value={value}>{children}</PetStatusContext.Provider>
}

// Create a custom hook for easy consumption
export const useSharedPetStatus = (): PetStatusContextType => {
  const context = useContext(PetStatusContext)
  if (context === undefined) {
    throw new Error('useSharedPetStatus must be used within a PetStatusProvider')
  }
  return context
}
