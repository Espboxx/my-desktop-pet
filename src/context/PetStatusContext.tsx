import React, { createContext, useContext, useState, ReactNode } from 'react';
import { PetStatus, IdleAnimation, InteractionType, ItemType } from '../types/petTypes'; // Remove PetPosition import from here, Add InteractionType, ItemType
import { PetPosition } from '../hooks/interaction/types'; // Correctly import PetPosition
import usePetStatus from '../hooks/usePetStatus'; // Import the hook

// Define the shape of the context data
interface PetStatusContextType {
  status: PetStatus;
  setStatus: React.Dispatch<React.SetStateAction<PetStatus>>;
  lowStatusFlags: Record<'mood' | 'cleanliness' | 'hunger' | 'energy', boolean>;
  newlyUnlocked: string[];
  clearNewlyUnlocked: () => void;
  isLoaded: boolean;
  isBlinking: boolean; // Add the blinking state
  currentIdleAnimation: IdleAnimation | null; // Add the current idle animation state
  currentPetTypeId: string; // Add state for current pet type ID
  setCurrentPetTypeId: (id: string) => void; // Add function to update pet type ID
  initialPosition: PetPosition | null; // Add the loaded initial position
  // Add the interact function signature
  interact: (type: InteractionType, value: number, requiredItemType?: ItemType) => boolean;
  // Add other functions returned by usePetStatus if needed by consumers
}

// Create the context with a default value (can be undefined or a mock structure)
// Using undefined and checking for it in the consumer is safer.
const PetStatusContext = createContext<PetStatusContextType | undefined>(undefined);

// Create a provider component
interface PetStatusProviderProps {
  children: ReactNode;
}

export const PetStatusProvider: React.FC<PetStatusProviderProps> = ({ children }) => {
  // Use the hook inside the provider
  const petStatusData = usePetStatus();

  // The value provided by the context will be the object returned by the hook
  return (
    // Ensure petStatusData includes initialPosition as returned by usePetStatus
    <PetStatusContext.Provider value={petStatusData as PetStatusContextType}>
      {children}
    </PetStatusContext.Provider>
  );
};

// Create a custom hook for easy consumption
export const useSharedPetStatus = (): PetStatusContextType => {
  const context = useContext(PetStatusContext);
  if (context === undefined) {
    throw new Error('useSharedPetStatus must be used within a PetStatusProvider');
  }
  return context;
};