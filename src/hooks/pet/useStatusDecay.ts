import { useEffect } from 'react';
import { PetStatus } from '../../types/petTypes';
import { DECAY_RATES } from './constants';

/**
 * Hook to handle the natural decay of pet status values over time.
 */
export function useStatusDecay(
  isLoaded: boolean,
  setStatus: React.Dispatch<React.SetStateAction<PetStatus>>,
  intervalMs: number = 60000 // Default to once per minute
) {
  useEffect(() => {
    if (!isLoaded) return; // Wait for status to be loaded

    const intervalId = setInterval(() => {
      // --- Decay Rates & Modifiers (Keep simple for now) ---
      const moodDecay = DECAY_RATES.MOOD;
      const cleanlinessDecay = DECAY_RATES.CLEANLINESS;
      const hungerIncrease = DECAY_RATES.HUNGER;
      const energyDecay = DECAY_RATES.ENERGY;
      // TODO: Add modifiers based on time of day, random events etc. if needed

      // --- Update Status ---
      setStatus(prev => {
        // Create a mutable copy of the previous state
        const newStatus: PetStatus = {
          ...prev,
          mood: Math.floor(Math.max(0, Math.min(prev.maxMood, prev.mood - moodDecay))),
          cleanliness: Math.floor(Math.max(0, Math.min(prev.maxCleanliness, prev.cleanliness - cleanlinessDecay))),
          hunger: Math.floor(Math.min(prev.maxHunger, prev.hunger + hungerIncrease)),
          energy: Math.floor(Math.max(0, Math.min(prev.maxEnergy, prev.energy - energyDecay))),
          // Note: EXP gain is handled separately by useLevelingSystem
        };
        return newStatus;
      }); // End setStatus

    }, intervalMs); // Run at the specified interval

    return () => clearInterval(intervalId); // Cleanup interval
  }, [isLoaded, setStatus, intervalMs]); // Dependencies
}