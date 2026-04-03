import { useEffect } from 'react';
import { PetStatus } from '@/types/petTypes';
import { EVENT_CHANCES, STATUS_THRESHOLDS } from './constants';
import { ITEMS as predefinedItems } from '@/constants/itemData';
import { useBubbleService } from '@/services/bubble/BubbleContext'; // Import bubble service

/**
 * Hook to handle random special events occurring over time.
 */
export function useSpecialEvents(
  isLoaded: boolean,
  setStatus: React.Dispatch<React.SetStateAction<PetStatus>>,
  statusRef: React.MutableRefObject<PetStatus>, // Use ref for checking conditions
  intervalMs: number = 60000 // Check for events periodically
) {
  const { showBubble } = useBubbleService(); // Use bubble service for notifications

  useEffect(() => {
    if (!isLoaded) return;

    const intervalId = setInterval(() => {
      const currentStatus = statusRef.current; // Get current status from ref for checks
      if (!currentStatus) return;

      // let statusNeedsUpdate = false; // Unused
      let updatedStatus = { ...currentStatus }; // Start with current status
      let eventMessage = "";
      let specialEventOccurred = false;

      // --- Check and Trigger Special Events ---

      // Mood Boost
      if (!specialEventOccurred && Math.random() < EVENT_CHANCES.MOOD_BOOST) {
        eventMessage = "特殊事件: 心情提升!";
        updatedStatus.mood = Math.floor(Math.min(updatedStatus.maxMood, updatedStatus.mood + 50));
        specialEventOccurred = true;
      }

      // Self Learning
      if (!specialEventOccurred && Math.random() < EVENT_CHANCES.SELF_LEARNING) {
        const expGain = 10 + Math.floor(Math.random() * 15);
        eventMessage = `特殊事件: 宠物自学习! 获得${expGain}点经验`;
        updatedStatus.exp += expGain;
        updatedStatus.energy = Math.floor(Math.max(0, updatedStatus.energy - 10));
        specialEventOccurred = true;
      }

      // Exercise
      if (!specialEventOccurred && Math.random() < EVENT_CHANCES.EXERCISE && updatedStatus.energy > 30) {
        const expGain = 8 + Math.floor(Math.random() * 10);
        eventMessage = `特殊事件: 宠物健身! 获得${expGain}点经验`;
        updatedStatus.exp += expGain;
        updatedStatus.energy = Math.floor(Math.max(0, updatedStatus.energy - 15));
        updatedStatus.maxEnergy += 1; // Small increase in max energy
        specialEventOccurred = true;
      }

      // Treasure Discovery
      if (!specialEventOccurred && Math.random() < EVENT_CHANCES.TREASURE) {
        const expGain = 15 + Math.floor(Math.random() * 20);
        eventMessage = `特殊事件: 发现宝藏! 获得${expGain}点经验`;
        updatedStatus.exp += expGain;

        // Chance to find an item
        if (Math.random() < 0.2) {
          const allItemIds = Object.keys(predefinedItems);
          if (allItemIds.length > 0) {
            const randomItemId = allItemIds[Math.floor(Math.random() * allItemIds.length)];
            const item = predefinedItems[randomItemId];
            if (item) {
              const newInventory = { ...updatedStatus.inventory };
              newInventory[randomItemId] = (newInventory[randomItemId] || 0) + 1;
              updatedStatus.inventory = newInventory;
              eventMessage += ` 和物品: ${item.name}`;
            }
          }
        }
        specialEventOccurred = true;
      }

      // Interaction with other pets
      if (!specialEventOccurred && Math.random() < EVENT_CHANCES.INTERACTION) {
        const expGain = 12 + Math.floor(Math.random() * 8);
        eventMessage = `特殊事件: 与其他宠物互动! 获得${expGain}点经验`;
        updatedStatus.exp += expGain;
        updatedStatus.mood = Math.floor(Math.min(updatedStatus.maxMood, updatedStatus.mood + 20));
        specialEventOccurred = true;
      }

      // Inspiration
      if (!specialEventOccurred && Math.random() < EVENT_CHANCES.INSPIRATION) {
        const expGain = 18 + Math.floor(Math.random() * 12);
        eventMessage = `特殊事件: 灵感迸发! 获得${expGain}点经验`;
        updatedStatus.exp += expGain;
        specialEventOccurred = true;
      }

      // Sickness
      if (!specialEventOccurred && updatedStatus.cleanliness < STATUS_THRESHOLDS.SICKNESS_THRESHOLD && Math.random() < EVENT_CHANCES.SICKNESS) {
        eventMessage = "特殊事件: 宠物生病了!";
        updatedStatus.mood = Math.floor(Math.max(0, updatedStatus.mood - 30));
        updatedStatus.energy = Math.floor(Math.max(0, updatedStatus.energy - 40));
        specialEventOccurred = true;
      }

      // --- Apply Status Update and Show Bubble ---
      if (specialEventOccurred) {
        console.log(eventMessage);
        setStatus(prev => ({ ...prev, ...updatedStatus })); // Update state

        // Show bubble after state update
        const eventMessageToShow = eventMessage; // Capture message
        setTimeout(() => {
          showBubble(eventMessageToShow, 'notification', 5000); // Show for 5 seconds
        }, 100);
      }

    }, intervalMs); // Run check periodically

    return () => clearInterval(intervalId); // Cleanup interval
  }, [isLoaded, setStatus, statusRef, intervalMs, showBubble]); // Dependencies
}