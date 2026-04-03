import { useEffect, useState, useCallback } from 'react';
import { PetStatus } from '@/types/petTypes';
import { ACHIEVEMENTS as predefinedAchievements } from '@/constants/petConstants';
import { useBubbleService } from '@/services/bubble/useBubbleService'; // Import bubble service

/**
 * Hook to manage achievement checking, unlocking, and rewards.
 */
export function useAchievementManager(
  isLoaded: boolean,
  setStatus: React.Dispatch<React.SetStateAction<PetStatus>>,
  statusRef: React.MutableRefObject<PetStatus>, // Use ref for checking conditions
  intervalMs: number = 60000 // Check achievements periodically
) {
  const [newlyUnlockedAchievementItems, setNewlyUnlockedAchievementItems] = useState<string[]>([]);
  const { showBubble } = useBubbleService(); // Use bubble service for notifications

  // Achievement Check and Unlocking
  useEffect(() => {
    if (!isLoaded) return;

    const intervalId = setInterval(() => {
      const currentStatus = statusRef.current; // Get current status from ref for checks
      if (!currentStatus || !currentStatus.unlockedAchievements) return; // Ensure status exists

      const currentAchievements = predefinedAchievements;
      let statusNeedsUpdate = false; // Flag to track if setStatus is needed
      const updatedStatus = { ...currentStatus }; // Start with current status

      const newlyUnlockedAchievementsInInterval: string[] = [];
      const achievementNotifications: string[] = [];

      for (const achievement of Object.values(currentAchievements)) {
        // Check if already unlocked in the potentially updated status for this interval
        if (updatedStatus.unlockedAchievements.includes(achievement.id)) {
          continue;
        }

        let allConditionsMet = true;
        for (const condition of achievement.conditions) {
          let conditionMet = false;
          // Check condition based on currentStatus (from ref)
          switch (condition.type) {
            case 'statusThreshold':
              if (condition.status && condition.threshold !== undefined && condition.status in currentStatus) {
                const statusValue = currentStatus[condition.status as keyof PetStatus];
                if (typeof statusValue === 'number') {
                  // Handle dynamic max values specifically if needed
                  if (achievement.id === 'maxMood' && condition.status === 'mood') {
                    conditionMet = statusValue >= currentStatus.maxMood;
                  } else if (achievement.id === 'maxClean' && condition.status === 'cleanliness') {
                    conditionMet = statusValue >= currentStatus.maxCleanliness;
                  } else {
                    conditionMet = statusValue >= condition.threshold;
                  }
                }
              }
              break;
            case 'levelReached':
              if (condition.level !== undefined && currentStatus.level >= condition.level) {
                conditionMet = true;
              }
              break;
            case 'interactionCount':
              if (condition.interactionType && condition.count !== undefined) {
                const count = currentStatus.interactionCounts[condition.interactionType] || 0;
                if (count >= condition.count) {
                  conditionMet = true;
                }
              }
              break;
            case 'taskCompleted':
              // Check against completed tasks in the potentially updated status for this interval
              if (condition.taskId && updatedStatus.completedTasks.includes(condition.taskId)) {
                conditionMet = true;
              }
              break;
          }
          if (!conditionMet) {
            allConditionsMet = false;
            break; // No need to check other conditions
          }
        } // End condition loop

        if (allConditionsMet) {
          newlyUnlockedAchievementsInInterval.push(achievement.id);
          achievementNotifications.push(`成就解锁: ${achievement.name}`);
          updatedStatus.exp += achievement.reward?.exp || 0; // Apply EXP reward

          // Handle idle animation unlock
          if (achievement.reward?.idleAnimation) {
            if (!updatedStatus.unlockedIdleAnimations.includes(achievement.reward.idleAnimation)) {
              updatedStatus.unlockedIdleAnimations = [...updatedStatus.unlockedIdleAnimations, achievement.reward.idleAnimation];
              const unlockMessage = `解锁新动画: ${achievement.reward.idleAnimation}`;
              setNewlyUnlockedAchievementItems(prev => [...prev, unlockMessage]); // Update separate state
              achievementNotifications.push(unlockMessage); // Add to bubble notification
              console.log(`Unlocked Idle Animation: ${achievement.reward.idleAnimation}`);
            }
          }

          // Handle other generic unlocks
          if (achievement.reward?.unlocks) {
             const unlockMessages = achievement.reward.unlocks.map(u => `成就解锁: ${u}`);
             setNewlyUnlockedAchievementItems(prev => [...prev, ...unlockMessages]); // Update separate state
             achievementNotifications.push(...unlockMessages); // Add to bubble notification
          }
          console.log(`Achievement Unlocked: ${achievement.name}!`);
          statusNeedsUpdate = true; // Mark that status needs saving
        }
      } // End achievement loop

      // Update PetStatus state only if changes occurred
      if (statusNeedsUpdate || newlyUnlockedAchievementsInInterval.length > 0) {
        // Combine newly unlocked achievements with previous ones
        updatedStatus.unlockedAchievements = [...updatedStatus.unlockedAchievements, ...newlyUnlockedAchievementsInInterval];

        setStatus(prev => ({ ...prev, ...updatedStatus })); // Update the state

        // Show combined achievement notifications after state update
        if (achievementNotifications.length > 0) {
            setTimeout(() => {
                showBubble(achievementNotifications.join('\n'), 'unlock', 5000); // Show for 5 seconds
            }, 100); // Slight delay
        }
      }

    }, intervalMs); // Run check periodically

    return () => clearInterval(intervalId); // Cleanup interval
  }, [isLoaded, setStatus, statusRef, intervalMs, showBubble]); // Dependencies

  // Function to clear the newly unlocked items state
  const clearNewlyUnlockedAchievementItems = useCallback(() => {
    setNewlyUnlockedAchievementItems([]);
  }, []);

  return { newlyUnlockedAchievementItems, clearNewlyUnlockedAchievementItems };
}
