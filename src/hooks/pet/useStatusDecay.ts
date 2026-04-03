import { useEffect } from 'react';
import { PetStatus } from '@/types/petTypes';
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
      // 基于时间和其他因素的状态衰减修饰符
      const timeOfDay = new Date().getHours();
      let moodModifier = 1.0;
      let energyModifier = 1.0;

      // 夜间能量衰减更快
      if (timeOfDay >= 22 || timeOfDay <= 6) {
        energyModifier = 1.2;
      }

      // 白天心情衰减更慢
      if (timeOfDay >= 9 && timeOfDay <= 17) {
        moodModifier = 0.8;
      }

      // 随机事件（5%概率）
      if (Math.random() < 0.05) {
        const eventType = Math.random();
        if (eventType < 0.33) {
          // 意外开心事件
          moodModifier *= 0.5;
        } else if (eventType < 0.66) {
          // 意外疲惫事件
          energyModifier *= 1.3;
        }
        // 其他事件可以在这里添加
      }

      // --- Update Status ---
      setStatus(prev => {
        // Create a mutable copy of the previous state
        const newStatus: PetStatus = {
          ...prev,
          mood: Math.floor(Math.max(0, Math.min(prev.maxMood, prev.mood - (moodDecay * moodModifier)))),
          cleanliness: Math.floor(Math.max(0, Math.min(prev.maxCleanliness, prev.cleanliness - cleanlinessDecay))),
          hunger: Math.floor(Math.min(prev.maxHunger, prev.hunger + hungerIncrease)),
          energy: Math.floor(Math.max(0, Math.min(prev.maxEnergy, prev.energy - (energyDecay * energyModifier)))),
          // Note: EXP gain is handled separately by useLevelingSystem
        };
        return newStatus;
      }); // End setStatus

    }, intervalMs); // Run at the specified interval

    return () => clearInterval(intervalId); // Cleanup interval
  }, [isLoaded, setStatus, intervalMs]); // Dependencies
}