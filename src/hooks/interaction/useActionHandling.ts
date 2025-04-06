// src/hooks/interaction/useActionHandling.ts
import { useCallback } from 'react';
import { PetStatus, InteractionType, Task, Achievement, ItemType } from '../../types/petTypes'; // Add ItemType
import { ACHIEVEMENTS as predefinedAchievements } from '../../constants/petConstants'; // Import predefined achievements
import { gameData } from '../../constants/taskData'; // Import task data
import { ANIMATION_GROUPS } from './constants'; // Import animation groups from local constants

interface UseActionHandlingProps {
  status: PetStatus;
  setStatus: React.Dispatch<React.SetStateAction<PetStatus>>;
  setCurrentAnimation: (animation: string | null) => void;
  // Add a function to show notifications
  showNotification?: (message: string) => void; // Optional for now
  showThoughtBubble?: (message: string) => void; // Add function to show thought bubble
  // Optional: Pass down notification setter if needed
  // setNewlyUnlocked?: React.Dispatch<React.SetStateAction<string[]>>;
  // Add the interact function from usePetStatus
  interact: (type: InteractionType, value: number, requiredItemType?: ItemType) => boolean;
}

interface UseActionHandlingReturn {
  handleAction: (action: InteractionType | string) => void;
}

// Helper function to get random animation
const getRandomAnimation = (animations: string[]): string | null => {
  if (!animations || animations.length === 0) return null;
  return animations[Math.floor(Math.random() * animations.length)];
};

export function useActionHandling({
  status,
  setStatus,
  setCurrentAnimation,
  showNotification, // Destructure the new prop
  showThoughtBubble, // Destructure the thought bubble prop
  // setNewlyUnlocked,
  interact, // Destructure the interact function
}: UseActionHandlingProps): UseActionHandlingReturn {

  const handleAction = useCallback((action: InteractionType | string) => {
    // Define which actions modify the pet's status directly
    const statusModifyingActions: Set<InteractionType | string> = new Set([
        'feed', 'pet', 'play', 'train', 'clean', 'learn', 'sleep', 'massage'
    ]);

    // Actions requiring items
    const itemActions: Partial<Record<InteractionType, ItemType>> = {
        'feed': 'food',
        'clean': 'cleaning_supply',
        'play': 'toy',
    };

    let animationToPlay: string | null = null;
    let interactionSucceeded = false;

    if (action === 'pet') {
        // Petting doesn't require items and uses its own logic
        interactionSucceeded = interact('petting', 20); // Call interact for petting
        if (interactionSucceeded) {
            // Use statusRef or get latest status if needed for animation choice
            if (status.mood > 70) animationToPlay = getRandomAnimation(ANIMATION_GROUPS.HAPPY);
            else if (status.mood > 40) animationToPlay = getRandomAnimation(ANIMATION_GROUPS.NORMAL_HAPPY);
            else animationToPlay = 'pulse-animation';
        } else {
            animationToPlay = 'shake-animation'; // Should petting fail? Maybe not.
        }
    } else if (itemActions[action as InteractionType]) {
        // Handle actions requiring items
        const requiredItemType = itemActions[action as InteractionType]!;
        let interactionValue = 0;
        let notificationMessage = ''; // Variable for notification message
        let thoughtMessage = ''; // Variable for thought bubble message

        switch (action) {
            case 'feed':
                interactionValue = 30; // How much hunger is reduced
                interactionSucceeded = interact('feed', interactionValue, requiredItemType);
                if (!interactionSucceeded) {
                    // notificationMessage = '没有足够的食物了！'; // Keep or remove based on desired UX
                    thoughtMessage = '没有食物了...'; // Set thought bubble message
                }
                animationToPlay = interactionSucceeded
                    ? (status.hunger > 70 ? getRandomAnimation(ANIMATION_GROUPS.VERY_HUNGRY_EAT) : getRandomAnimation(ANIMATION_GROUPS.EAT))
                    : 'shake-animation'; // Shake if no food
                break;
            case 'clean':
                interactionValue = 40; // How much cleanliness increases
                interactionSucceeded = interact('clean', interactionValue, requiredItemType);
                 if (!interactionSucceeded) {
                    // notificationMessage = '没有清洁用品了！';
                    thoughtMessage = '需要打扫一下...';
                }
                animationToPlay = interactionSucceeded
                    ? (status.mood > 50 ? 'clean-animation' : 'shake-animation') // Maybe different clean anims?
                    : 'shake-animation'; // Shake if no cleaning supply
                break;
            case 'play':
                interactionValue = 15; // How much mood increases
                interactionSucceeded = interact('play', interactionValue, requiredItemType);
                 if (!interactionSucceeded) {
                    // Check energy again to distinguish failure reason
                    const playEnergyCost = 10; // Match the cost defined in usePetStatus/interact
                    if (status.energy < playEnergyCost) {
                        // notificationMessage = '宠物太累了，不想玩！';
                        thoughtMessage = '好累...想睡觉...';
                    } else {
                        // notificationMessage = '没有玩具了！'; // Assume item issue if energy is sufficient
                        thoughtMessage = '没有玩具玩了...';
                    }
                }
                animationToPlay = interactionSucceeded
                    ? (status.energy > 50 ? getRandomAnimation(ANIMATION_GROUPS.ENERGETIC_PLAY) : getRandomAnimation(ANIMATION_GROUPS.TIRED_PLAY))
                    : 'shake-animation'; // Shake if no toy or too tired (interact handles energy check now)
                break;
        }
        // Call showThoughtBubble if it exists and interaction failed
        if (!interactionSucceeded && showThoughtBubble && thoughtMessage) {
            showThoughtBubble(thoughtMessage);
        }
        // Optionally keep notification for critical failures or specific UX choices
        // if (!interactionSucceeded && showNotification && notificationMessage) {
        //     showNotification(notificationMessage);
        // }
    } else if (statusModifyingActions.has(action)) {
        // Handle other status-modifying actions that DON'T require items (train, learn, sleep, massage)
        // Keep the original setStatus logic for these for now, or refactor interact to handle them too.
        setStatus(prev => {
            let updatedStatus = { ...prev };
            let currentCounts = { ...(prev.interactionCounts || {}) };
            const interactionKey = action as InteractionType | string;
            currentCounts[interactionKey] = (currentCounts[interactionKey] || 0) + 1;

            let baseMoodChange = 0;
            let baseEnergyChange = 0;
            let baseExpChange = 0;

            switch (action) {
                case 'train': {
                    const energyCost = 25;
                    if (prev.energy >= energyCost) {
                        baseExpChange = 15;
                        baseEnergyChange = -energyCost;
                        animationToPlay = (prev.energy + baseEnergyChange) > 40 ? 'train-animation' : 'shake-animation';
                        interactionSucceeded = true;
                    } else {
                       animationToPlay = 'shake-animation'; // Too tired
                       interactionSucceeded = false;
                       // if (showNotification) showNotification('宠物太累了，无法训练！'); // Add notification for failure
                       if (showThoughtBubble) showThoughtBubble('太累了，学不动了...');
                  }
                    break;
                }
                case 'learn': {
                    const energyCost = 30;
                    if (prev.energy >= energyCost) {
                        baseExpChange = 25;
                        baseEnergyChange = -energyCost;
                        animationToPlay = (prev.energy + baseEnergyChange) > 30 ? 'learn-animation' : 'shake-animation';
                        interactionSucceeded = true;
                    } else {
                       animationToPlay = 'shake-animation'; // Too tired
                       interactionSucceeded = false;
                        // if (showNotification) showNotification('宠物太累了，无法学习！'); // Add notification for failure
                        if (showThoughtBubble) showThoughtBubble('头昏昏的，学不进去了...');
                   }
                    break;
                }
                case 'sleep': {
                    baseEnergyChange = 40;
                    animationToPlay = 'sleep-animation';
                    interactionSucceeded = true;
                    break;
                }
                case 'massage': {
                    baseMoodChange = 15;
                    baseEnergyChange = 10;
                    baseExpChange = 3;
                    animationToPlay = prev.mood > 80 ? getRandomAnimation(ANIMATION_GROUPS.HAPPY) : 'pulse-animation';
                    interactionSucceeded = true;
                    break;
                }
            }

            if (interactionSucceeded) {
                updatedStatus.mood = Math.min(100, Math.max(0, prev.mood + baseMoodChange));
                updatedStatus.energy = Math.min(100, Math.max(0, prev.energy + baseEnergyChange));
                updatedStatus.exp = prev.exp + baseExpChange;
                // TODO: Add task/achievement checks here if needed for these actions
            }

            return {
                ...updatedStatus,
                interactionCounts: currentCounts,
                // Keep other task/achievement logic separate or integrate carefully
            };
        });
    }

    // Set animation based on the outcome
    if (animationToPlay) {
        setCurrentAnimation(animationToPlay);
    }

    // --- Task & Achievement Checks are now handled in usePetStatus ---
    // Remove the residual logic from here.

    // --- Handle non-status modifying actions ---
    if (!statusModifyingActions.has(action)) {
      // --- Handle non-status modifying actions ---
      // These are typically UI/System actions triggered via the context menu
      // They don't directly change pet stats but interact with Electron or UI state.
      // The main hook will handle closing the menu.
      switch (action) {
        case 'photo':
          setCurrentAnimation('pulse-animation'); // Brief animation before photo
          setTimeout(() => {
            window.desktopPet.takePetPhoto();
            // Animation cleared automatically by usePetAnimation hook
          }, 300);
          break;
        case 'settings':
          window.desktopPet.openSettings();
          break;
        case 'minimize':
          window.desktopPet.send('hide-pet-window');
          // Passthrough handled by main hook after menu closes
          break;
        case 'exit':
          window.desktopPet.exitApp();
          break;
        case 'status':
          window.desktopPet.showStatusDetails();
          break;
        case 'skin':
          window.desktopPet.showSkinSelector();
          break;
        case 'name':
          window.desktopPet.showNameEditor();
          break;
        default:
          console.log(`Handling unknown or non-status action: ${action}`);
      }
    }
    // Menu closing and passthrough logic will be handled in the main orchestrator hook
  }, [status, interact, setStatus, setCurrentAnimation, showNotification, showThoughtBubble]); // Add showThoughtBubble to dependencies

  return {
    handleAction,
  };
}