// src/hooks/interaction/useActionHandling.ts
import { useCallback } from 'react';
import { PetStatus, InteractionType, Task, Achievement } from '../../types/petTypes';
import { ACHIEVEMENTS as predefinedAchievements } from '../../constants/petConstants'; // Import predefined achievements
import { gameData } from '../../constants/taskData'; // Import task data
import { ANIMATION_GROUPS } from './constants'; // Import animation groups from local constants

interface UseActionHandlingProps {
  status: PetStatus;
  setStatus: React.Dispatch<React.SetStateAction<PetStatus>>;
  setCurrentAnimation: (animation: string | null) => void;
  // Optional: Pass down notification setter if needed
  // setNewlyUnlocked?: React.Dispatch<React.SetStateAction<string[]>>;
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
  // setNewlyUnlocked,
}: UseActionHandlingProps): UseActionHandlingReturn {

  const handleAction = useCallback((action: InteractionType | string) => {
    // Define which actions modify the pet's status directly
    const statusModifyingActions: Set<InteractionType | string> = new Set([
        'feed', 'pet', 'play', 'train', 'clean', 'learn', 'sleep', 'massage'
    ]);

    if (statusModifyingActions.has(action)) {
      setStatus(prev => {
        // --- 1. Prepare State Update ---
        let updatedStatus = { ...prev };
        let currentCounts = { ...(prev.interactionCounts || {}) };
        let currentActiveTasks = [...(prev.activeTasks || [])];
        let currentCompletedTasks = [...(prev.completedTasks || [])];
        let currentAchievements = [...(prev.unlockedAchievements || [])];

        const interactionKey = action as InteractionType | string;
        const allTasks = gameData.tasks;
        const allAchievements = predefinedAchievements;

        // --- 2. Update Interaction Counts ---
        currentCounts[interactionKey] = (currentCounts[interactionKey] || 0) + 1;
        const totalInteractions = Object.values(currentCounts).reduce((sum, count) => sum + count, 0);

        // --- 3. Apply Action Effects (Status Changes & Animation) ---
        let baseMoodChange = 0;
        let baseCleanlinessChange = 0;
        let baseHungerChange = 0; // Lower is better
        let baseEnergyChange = 0;
        let baseExpChange = 0;
        let animationToPlay: string | null = null;

        switch (action) {
          case 'feed': {
            baseHungerChange = -30;
            baseExpChange = 5;
            animationToPlay = prev.hunger > 70 ? getRandomAnimation(ANIMATION_GROUPS.VERY_HUNGRY_EAT) : getRandomAnimation(ANIMATION_GROUPS.EAT);
            break;
          }
          case 'pet': {
            baseMoodChange = 20;
            baseExpChange = 2;
            if (prev.mood > 70) animationToPlay = getRandomAnimation(ANIMATION_GROUPS.HAPPY);
            else if (prev.mood > 40) animationToPlay = getRandomAnimation(ANIMATION_GROUPS.NORMAL_HAPPY);
            else animationToPlay = 'pulse-animation'; // Default happy/content
            break;
          }
          case 'play': {
            const energyDecrease = 20;
            if (prev.energy > energyDecrease) {
              baseMoodChange = 15;
              baseEnergyChange = -energyDecrease;
              baseExpChange = 8;
              animationToPlay = prev.energy > 50 ? getRandomAnimation(ANIMATION_GROUPS.ENERGETIC_PLAY) : getRandomAnimation(ANIMATION_GROUPS.TIRED_PLAY);
            } else {
              animationToPlay = 'shake-animation'; // Too tired
            }
            break;
          }
          case 'train': {
            const energyCost = 25;
            if (prev.energy >= energyCost) {
              baseExpChange = 15;
              baseEnergyChange = -energyCost;
              animationToPlay = (prev.energy + baseEnergyChange) > 40 ? 'train-animation' : 'shake-animation';
            } else {
              animationToPlay = 'shake-animation'; // Too tired
            }
            break;
          }
          case 'clean': {
            baseCleanlinessChange = 40;
            baseExpChange = 5;
            animationToPlay = prev.mood > 50 ? 'clean-animation' : 'shake-animation';
            break;
          }
          case 'learn': {
            const energyCost = 30;
            if (prev.energy >= energyCost) {
              baseExpChange = 25;
              baseEnergyChange = -energyCost;
              animationToPlay = (prev.energy + baseEnergyChange) > 30 ? 'learn-animation' : 'shake-animation';
            } else {
              animationToPlay = 'shake-animation'; // Too tired
            }
            break;
          }
          case 'sleep': {
            baseEnergyChange = 40;
            animationToPlay = 'sleep-animation';
            break;
          }
          case 'massage': {
            baseMoodChange = 15;
            baseEnergyChange = 10;
            baseExpChange = 3;
            animationToPlay = prev.mood > 80 ? getRandomAnimation(ANIMATION_GROUPS.HAPPY) : 'pulse-animation';
            break;
          }
        }

        // Apply base status changes (clamped)
        updatedStatus.mood = Math.min(100, Math.max(0, prev.mood + baseMoodChange));
        updatedStatus.cleanliness = Math.min(100, Math.max(0, prev.cleanliness + baseCleanlinessChange));
        updatedStatus.hunger = Math.min(100, Math.max(0, prev.hunger + baseHungerChange));
        updatedStatus.energy = Math.min(100, Math.max(0, prev.energy + baseEnergyChange));
        updatedStatus.exp = prev.exp + baseExpChange;

        // Set animation (handled outside setStatus in the main hook)
        if (animationToPlay) {
            setCurrentAnimation(animationToPlay);
        }

        // --- 4. Check Tasks (Interaction-based goals) ---
        const newlyCompletedTasks: string[] = [];
        const taskNotifications: string[] = [];
        let taskExpReward = 0;
        let taskUnlocks: string[] = [];
        let nextActiveTasks = [...currentActiveTasks];

        for (const taskId of currentActiveTasks) {
            const task = allTasks[taskId];
            if (!task || currentCompletedTasks.includes(taskId)) continue;

            let allGoalsNowMet = true;
            let progressMadeOnThisTask = false;
            // Temporary goal completion status for this action check
            let goalCompletionStatus: { [goalIndex: number]: boolean } = {};
            task.goals.forEach((g, index) => goalCompletionStatus[index] = g.completed || false);

            for (let i = 0; i < task.goals.length; i++) {
                const goal = task.goals[i];
                if (goalCompletionStatus[i]) continue;

                if (goal.type === 'performInteraction') {
                    if (goal.interactionType === interactionKey || goal.interactionType === 'any') {
                        // Basic progress: assumes goal is single count or progress is managed elsewhere
                        const currentProgress = goal.progress || 0;
                        const newProgress = currentProgress + 1;
                        const requiredCount = goal.count || 1;
                        // TODO: Need a mechanism to update persistent task progress state here!
                        if (newProgress >= requiredCount) {
                            goalCompletionStatus[i] = true;
                            progressMadeOnThisTask = true;
                            // TODO: Mark persistent goal state as completed!
                        } else {
                            progressMadeOnThisTask = true;
                            allGoalsNowMet = false;
                        }
                    } else {
                         allGoalsNowMet = false;
                    }
                } else {
                    // For other goal types, rely on their existing completion status (checked elsewhere)
                    if (!goalCompletionStatus[i]) {
                        allGoalsNowMet = false;
                    }
                }
            } // End goal loop

            if (allGoalsNowMet) {
                if (!currentCompletedTasks.includes(taskId)) {
                    newlyCompletedTasks.push(taskId);
                    taskNotifications.push(`任务完成: ${task.name}`);
                    taskExpReward += task.reward.exp;
                    if (task.reward.unlocks) {
                        taskUnlocks.push(...task.reward.unlocks.map(u => `任务解锁: ${u}`));
                    }
                    console.log(`Task Completed: ${task.name}`);
                    nextActiveTasks = nextActiveTasks.filter(id => id !== taskId);
                }
            } else if (progressMadeOnThisTask) {
                 console.log(`Progress made on task: ${task.name}`);
                 // TODO: Persist the progress update for the specific goal(s)!
            }
        } // End task loop

        // Update task lists and apply rewards
        currentActiveTasks = nextActiveTasks;
        if (newlyCompletedTasks.length > 0) {
            currentCompletedTasks = [...currentCompletedTasks, ...newlyCompletedTasks];
            updatedStatus.exp += taskExpReward;
            // TODO: Trigger notifications via setNewlyUnlocked or similar mechanism
            // if (setNewlyUnlocked) {
            //     setNewlyUnlocked(prev => [...prev, ...taskNotifications, ...taskUnlocks]);
            // }
        }

        // --- 5. Check Achievements (Interaction-based) ---
        const newlyUnlockedAchievements: string[] = [];
        const achievementNotifications: string[] = [];
        let achievementExpReward = 0;
        let achievementUnlocks: string[] = [];

        for (const achievement of Object.values(allAchievements)) {
          if (currentAchievements.includes(achievement.id)) continue;

          let allConditionsMet = true;
          for (const condition of achievement.conditions) {
            let conditionMet = false;
            switch (condition.type) {
                case 'interactionCount':
                    const requiredCount = condition.count ?? 1;
                    if (condition.interactionType === 'any') {
                        if (totalInteractions >= requiredCount) conditionMet = true;
                    } else if (condition.interactionType) {
                        if ((currentCounts[condition.interactionType] ?? 0) >= requiredCount) conditionMet = true;
                    }
                    break;
                // IMPORTANT: Other condition types (status, level, task) should be checked
                // in a separate effect that monitors the state (e.g., in usePetStatus),
                // not during the interaction itself, unless the achievement *only* depends
                // on interaction counts.
                default:
                    // If condition type isn't interactionCount, this achievement cannot be
                    // unlocked solely by this interaction check.
                    allConditionsMet = false;
                    break;
            }
            // If it's an interaction condition and it's not met, the achievement fails here.
            if (!conditionMet && condition.type === 'interactionCount') {
                allConditionsMet = false;
                break;
            }
            // If any condition was not interactionCount, it fails here.
             if (!allConditionsMet) break;
          } // End condition loop

          if (allConditionsMet) {
            if (!currentAchievements.includes(achievement.id)) {
                newlyUnlockedAchievements.push(achievement.id);
                achievementNotifications.push(`成就解锁: ${achievement.name}`);
                achievementExpReward += achievement.reward?.exp || 0;
                if (achievement.reward?.unlocks) {
                    achievementUnlocks.push(...achievement.reward.unlocks.map(u => `成就解锁: ${u}`));
                }
                console.log(`Achievement Unlocked (Interaction): ${achievement.name}!`);
            }
          }
        } // End achievement loop

        // Update achievement list and apply rewards
        if (newlyUnlockedAchievements.length > 0) {
            currentAchievements = [...currentAchievements, ...newlyUnlockedAchievements];
            updatedStatus.exp += achievementExpReward;
            // TODO: Trigger notifications
            // if (setNewlyUnlocked) {
            //     setNewlyUnlocked(prev => [...prev, ...achievementNotifications, ...achievementUnlocks]);
            // }
        }

        // --- 6. Return Final State ---
        return {
          ...updatedStatus,
          interactionCounts: currentCounts,
          activeTasks: currentActiveTasks,
          completedTasks: currentCompletedTasks,
          unlockedAchievements: currentAchievements,
        };
      }); // End setStatus callback
    } else {
      // --- Actions that DO NOT modify status ---
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
  }, [status, setStatus, setCurrentAnimation /*, setNewlyUnlocked */]); // Dependencies

  return {
    handleAction,
  };
}