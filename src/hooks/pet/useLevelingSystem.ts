import { useEffect, useState, useCallback } from 'react';
import { PetStatus } from '../../types/petTypes';
import { LEVEL_UNLOCKS } from '../../constants/petConstants';
import { useBubbleService } from '../../services/bubble/BubbleContext'; // Import bubble service

/**
 * Hook to handle experience gain, leveling up, and associated unlocks.
 */
export function useLevelingSystem(
  isLoaded: boolean,
  setStatus: React.Dispatch<React.SetStateAction<PetStatus>>,
  intervalMs: number = 60000 // Default to once per minute for passive EXP gain
) {
  const [newlyUnlockedLevelItems, setNewlyUnlockedLevelItems] = useState<string[]>([]);
  const { showBubble } = useBubbleService(); // Use bubble service for level up notification

  // Passive EXP gain and Level Up Check
  useEffect(() => {
    if (!isLoaded) return; // Wait for status to be loaded

    const intervalId = setInterval(() => {
      setStatus(prev => {
        // Create a mutable copy
        let newStatus: PetStatus = { ...prev };
        const oldLevel = prev.level;

        // --- Passive EXP Gain ---
        newStatus.exp += 1; // Gain 1 EXP per interval

        // --- Level Up Check ---
        const expToNextLevel = 100 + (newStatus.level * 50);
        let justLeveledUp = false;
        let levelUpMessages: string[] = [];

        if (newStatus.exp >= expToNextLevel) {
          justLeveledUp = true;
          newStatus.exp -= expToNextLevel;
          newStatus.level += 1;
          const newLevel = newStatus.level;
          levelUpMessages.push(`升级! 达到 ${newLevel} 级!`);

          // Status Limit Increase (e.g., +5 per level)
          const statusLimitIncrease = 5;
          newStatus.maxMood += statusLimitIncrease;
          newStatus.maxCleanliness += statusLimitIncrease;
          newStatus.maxHunger += statusLimitIncrease;
          newStatus.maxEnergy += statusLimitIncrease;
          levelUpMessages.push(`状态上限提升! (+${statusLimitIncrease})`);

          // Check for unlocks based on the new level
          const unlockedItemsForLevel: string[] = [];
          for (const [levelStr, items] of Object.entries(LEVEL_UNLOCKS)) {
            const level = Number(levelStr);
            // Check if this level was crossed during this level up
            if (!isNaN(level) && level > oldLevel && level <= newLevel) {
              items.forEach(item => {
                 // Avoid adding duplicates if already unlocked somehow
                 // (Though LEVEL_UNLOCKS should ideally be unique per level)
                 const unlockMessage = `解锁互动: ${item}`;
                 if (!newlyUnlockedLevelItems.includes(unlockMessage) && !levelUpMessages.includes(unlockMessage)) {
                    unlockedItemsForLevel.push(unlockMessage);
                 }
              });
            }
          }
          if (unlockedItemsForLevel.length > 0) {
             levelUpMessages = [...levelUpMessages, ...unlockedItemsForLevel];
             // Update the separate state for newly unlocked items
             setNewlyUnlockedLevelItems(prev => [...prev, ...unlockedItemsForLevel]);
          }
          console.log(`Level Up! Reached level ${newLevel}. Messages: ${levelUpMessages.join(' | ')}`);
        }

        // Show level up bubble outside setStatus if level up occurred
        if (justLeveledUp && levelUpMessages.length > 0) {
           // Use setTimeout to ensure bubble shows after state update completes
           setTimeout(() => {
                showBubble(levelUpMessages.join('\n'), 'unlock', 6000); // Show for 6 seconds
           }, 10);
        }

        return newStatus; // Return the potentially updated status
      }); // End setStatus

    }, intervalMs); // Run at the specified interval

    return () => clearInterval(intervalId); // Cleanup interval
  }, [isLoaded, setStatus, intervalMs, showBubble, newlyUnlockedLevelItems]); // Added showBubble and newlyUnlockedLevelItems dependencies

  // Function to clear the newly unlocked items state
  const clearNewlyUnlockedLevelItems = useCallback(() => {
    setNewlyUnlockedLevelItems([]);
  }, []);

  return { newlyUnlockedLevelItems, clearNewlyUnlockedLevelItems };
}