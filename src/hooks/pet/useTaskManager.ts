import { useEffect, useState, useCallback } from 'react';
import { PetStatus } from '@/types/petTypes';
import { gameData } from '@/constants/taskData';
import { ITEMS as predefinedItems } from '@/constants/itemData';
import { useBubbleService } from '@/services/bubble/BubbleContext'; // Import bubble service

/**
 * Hook to manage task progress, completion, and rewards.
 */
export function useTaskManager(
  isLoaded: boolean,
  setStatus: React.Dispatch<React.SetStateAction<PetStatus>>,
  statusRef: React.MutableRefObject<PetStatus>, // Use ref for checking conditions
  intervalMs: number = 60000 // Check tasks periodically
) {
  const [newlyUnlockedTaskItems, setNewlyUnlockedTaskItems] = useState<string[]>([]);
  const { showBubble } = useBubbleService(); // Use bubble service for notifications

  // Task Check and Completion
  useEffect(() => {
    if (!isLoaded) return;

    const intervalId = setInterval(() => {
      const currentStatus = statusRef.current; // Get current status from ref for checks
      if (!currentStatus || !currentStatus.activeTasks) return; // Ensure status and activeTasks exist

      const currentTasks = gameData.tasks;
      let statusNeedsUpdate = false; // Flag to track if setStatus is needed
      let updatedStatus = { ...currentStatus }; // Start with current status

      const newlyCompletedTasksInInterval: string[] = [];
      const taskNotifications: string[] = [];
      let currentActiveTasks = [...updatedStatus.activeTasks]; // Mutable list for this interval

      for (const taskId of currentStatus.activeTasks) { // Iterate based on status at interval start
        const task = currentTasks[taskId];
        // Check if already completed in this interval or previously
        if (!task || updatedStatus.completedTasks.includes(taskId) || newlyCompletedTasksInInterval.includes(taskId)) continue;

        let allGoalsMetForThisTask = true;
        let taskProgressMade = false; // Track if any goal progressed

        for (const goal of task.goals) {
          let goalMetInThisCheck = goal.completed || false;

          // Check goal based on currentStatus (from ref)
          switch (goal.type) {
            case 'reachStatus':
              if (goal.status && goal.targetValue !== undefined && goal.status in currentStatus) {
                const statusValue = currentStatus[goal.status as keyof PetStatus];
                if (typeof statusValue === 'number' && statusValue >= goal.targetValue) {
                  goalMetInThisCheck = true;
                }
              }
              break;
            // Interaction/Maintain goals are checked elsewhere (e.g., in useInteraction)
            // For now, assume they are updated externally and reflected in goal.completed
            case 'maintainStatus':
            case 'performInteraction':
               // We rely on external updates setting goal.completed = true
               // If goal.completed is true, goalMetInThisCheck remains true.
               break;
          }

          if (!goalMetInThisCheck) {
            allGoalsMetForThisTask = false;
            break; // No need to check other goals for this task
          } else if (!goal.completed) {
              // If a goal was met in this check but wasn't completed before, mark progress
              taskProgressMade = true;
              // We might need to update the goal object within the task data if we store progress there
              // For now, just noting progress was made.
          }
        } // End goal loop

        if (allGoalsMetForThisTask) {
          newlyCompletedTasksInInterval.push(taskId);
          taskNotifications.push(`任务完成: ${task.name}`);
          updatedStatus.exp += task.reward.exp; // Apply EXP reward immediately

          // Apply item rewards
          if (task.reward.items && task.reward.items.length > 0) {
            const currentInventory = { ...updatedStatus.inventory };
            task.reward.items.forEach(itemId => {
              const item = predefinedItems[itemId];
              if (item) {
                currentInventory[itemId] = (currentInventory[itemId] || 0) + 1;
                taskNotifications.push(`获得物品: ${item.name}`);
              } else {
                console.warn(`Task ${task.id} tried to reward non-existent item: ${itemId}`);
              }
            });
            updatedStatus.inventory = currentInventory;
          }

          // Handle unlocks
          if (task.reward.unlocks) {
             const unlockMessages = task.reward.unlocks.map(u => `任务解锁: ${u}`);
             setNewlyUnlockedTaskItems(prev => [...prev, ...unlockMessages]); // Update separate state
             taskNotifications.push(...unlockMessages); // Add to bubble notification
          }

          console.log(`Task Completed: ${task.name}`);
          currentActiveTasks = currentActiveTasks.filter(id => id !== taskId); // Remove from active
          statusNeedsUpdate = true; // Mark that status needs saving
        } else if (taskProgressMade) {
           // Optional: Log progress if needed
           // console.log(`Progress made on task: ${task.name}`);
           // If goal progress needs to be saved in PetStatus, mark statusNeedsUpdate = true
        }
      } // End task loop

      // Update PetStatus state only if changes occurred
      if (statusNeedsUpdate || newlyCompletedTasksInInterval.length > 0) {
        // Combine newly completed tasks with previous ones
        updatedStatus.completedTasks = [...updatedStatus.completedTasks, ...newlyCompletedTasksInInterval];
        updatedStatus.activeTasks = currentActiveTasks; // Update active tasks list

        setStatus(prev => ({ ...prev, ...updatedStatus })); // Update the state

        // Show combined task notifications after state update
        if (taskNotifications.length > 0) {
            setTimeout(() => {
                showBubble(taskNotifications.join('\n'), 'notification', 5000); // Show for 5 seconds
            }, 50); // Slight delay
        }
      }

    }, intervalMs); // Run check periodically

    return () => clearInterval(intervalId); // Cleanup interval
  }, [isLoaded, setStatus, statusRef, intervalMs, showBubble]); // Dependencies

  // Function to clear the newly unlocked items state
  const clearNewlyUnlockedTaskItems = useCallback(() => {
    setNewlyUnlockedTaskItems([]);
  }, []);

  return { newlyUnlockedTaskItems, clearNewlyUnlockedTaskItems };
}