import { useEffect } from 'react';
import { PetStatus } from '@/types/petTypes';
import { EVENT_CHANCES, STATUS_THRESHOLDS } from './constants';
import { useBubbleService } from '@/services/bubble/BubbleContext'; // Import bubble service

/**
 * Hook to handle proactive need bubbles based on pet status.
 */
export function useProactiveNeeds(
  isLoaded: boolean,
  statusRef: React.MutableRefObject<PetStatus>, // Use ref for checking conditions
  intervalMs: number = 60000 // Check needs periodically
) {
  const { showBubble, bubbles } = useBubbleService(); // Use bubble service

  useEffect(() => {
    if (!isLoaded) return;

    const intervalId = setInterval(() => {
      const currentStatus = statusRef.current; // Get current status from ref
      if (!currentStatus) return;

      // Only trigger if no other bubble is active and random chance met
      if (bubbles.length === 0 && Math.random() < EVENT_CHANCES.PROACTIVE_BUBBLE) {
        let bubbleText = "";
        let bubbleType: 'thought' | 'speech' = 'thought'; // Default to thought

        // Priority needs check: Hunger > Energy > Mood > Cleanliness
        if (currentStatus.hunger >= STATUS_THRESHOLDS.HUNGER_NEED && currentStatus.hunger < 80) {
          const hungerTexts = ["有点饿了...", "想吃点零食...", "肚子在叫了..."];
          bubbleText = hungerTexts[Math.floor(Math.random() * hungerTexts.length)];
        } else if (currentStatus.energy <= STATUS_THRESHOLDS.ENERGY_NEED && currentStatus.energy > 20) {
          const tiredTexts = ["有点困了...", "想打个盹...", "眼皮好重..."];
          bubbleText = tiredTexts[Math.floor(Math.random() * tiredTexts.length)];
        } else if (currentStatus.mood <= STATUS_THRESHOLDS.MOOD_NEED && currentStatus.mood > 20) {
          const moodTexts = ["有点无聊...", "想玩...", "求关注~"];
          bubbleText = moodTexts[Math.floor(Math.random() * moodTexts.length)];
        }
        // Optional: Add cleanliness check
        // else if (currentStatus.cleanliness <= STATUS_THRESHOLDS.CLEANLINESS_NEED && currentStatus.cleanliness > 20) { ... }

        if (bubbleText) {
          console.log(`Proactive Bubble Triggered: ${bubbleText}`);
          showBubble(bubbleText, bubbleType, 3500); // Show for 3.5 seconds
        }
      }
    }, intervalMs); // Run check periodically

    return () => clearInterval(intervalId); // Cleanup interval
  }, [isLoaded, statusRef, intervalMs, showBubble, bubbles]); // Dependencies
}