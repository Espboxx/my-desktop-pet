// Removed /// <reference path="../../electron/electron-env.d.ts" /> as it's included via tsconfig.json
import { useState, useEffect, useRef, useCallback } from 'react';
import { PetStatus, InteractionType, Task, TaskGoal, TaskGoalType, Achievement, IdleAnimation, SavedPetData, Inventory, Item, ItemType } from '../types/petTypes'; // Remove PetPosition from here, Add Inventory, Item, ItemType
import { PetPosition } from '../hooks/interaction/types'; // Correctly import PetPosition
import { LEVEL_UNLOCKS, ACHIEVEMENTS as predefinedAchievements, PET_TYPES } from '../constants/petConstants'; // Rename import and add PET_TYPES
import { gameData } from '../constants/taskData'; // Import task data
import { ITEMS as predefinedItems } from '../constants/itemData'; // Import item data

// Define animation durations (in ms) - match these with CSS durations
const IDLE_ANIMATION_DURATIONS: Record<IdleAnimation | string, number> = {
  'blink-animation': 300, // Existing blink duration
  'stretch-animation': 800,
  'idle-wiggle-animation': 600,
  'idleSpecial': 1000, // Example duration for an unlocked animation
  // Add other unlocked animations and their durations here
};

// Base idle animations available by default
const BASE_IDLE_ANIMATIONS: IdleAnimation[] = ['stretch-animation', 'idle-wiggle-animation'];
// Removed the duplicate 'declare global' block here,
// as the definition is now in electron/electron-env.d.ts

// 定义默认状态，以便在加载失败时使用
const defaultInitialStatus: PetStatus = {
  mood: 80,
  cleanliness: 80,
  hunger: 20, // Start less hungry
  energy: 80,
  exp: 0,
  level: 1,
  interactionCounts: {}, // Initialize new field
  unlockedAchievements: [], // Initialize new field
  activeTasks: [], // Initialize new field
  completedTasks: [], // Initialize new field
  unlockedIdleAnimations: [], // Initialize new field for unlocked animations
  bubble: {
    active: false,
    text: '',
    type: 'thought',
    timeout: null
  },
  inventory: {} // Initialize inventory
};

export default function usePetStatus() {
  const [status, setStatus] = useState<PetStatus>(defaultInitialStatus);
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentPetTypeId, setCurrentPetTypeId] = useState<string>('default'); // Add state for current pet type ID
  const [initialPosition, setInitialPosition] = useState<PetPosition | null>(null); // State for loaded initial position
  // Explicitly define the keys for low status warnings
  const [lowStatusFlags, setLowStatusFlags] = useState<Record<'mood' | 'cleanliness' | 'hunger' | 'energy', boolean>>({
    mood: false,
    cleanliness: false,
    hunger: false, // Hunger warning might be when it's high
    energy: false,
  });
  const [newlyUnlocked, setNewlyUnlocked] = useState<string[]>([]);
  const statusRef = useRef(status); // Ref to hold the latest status
  const currentPetTypeIdRef = useRef(currentPetTypeId); // Ref for current pet type ID
  const [isBlinking, setIsBlinking] = useState(false); // State for blink animation
  const blinkTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Ref for blink timer
  const [currentIdleAnimation, setCurrentIdleAnimation] = useState<IdleAnimation | null>(null); // State for current idle animation
  const idleAnimationTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Ref for scheduling next idle animation
  const idleAnimationClearTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Ref for clearing the current idle animation class

  // Update ref whenever status changes
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  // Update pet type ID ref whenever it changes
  useEffect(() => {
    currentPetTypeIdRef.current = currentPetTypeId;
  }, [currentPetTypeId]);

  // 加载初始状态
  useEffect(() => {
    const loadState = async () => {
      let loadedSuccessfully = false;
      try {
        if (window.desktopPet && typeof window.desktopPet.getPetState === 'function') {
          // Assume getPetState now returns SavedPetData | null
          // Explicitly type savedData to help TypeScript
          const savedData: SavedPetData | null = await window.desktopPet.getPetState();
          console.log('从文件加载数据:', savedData);

          if (savedData && typeof savedData === 'object') {
            // Load Status
            if (savedData.status && typeof savedData.status === 'object' && 'mood' in savedData.status) {
              // Merge loaded status with defaults
              // Ensure inventory is loaded or defaulted
              const loadedStatus = {
                ...defaultInitialStatus,
                ...savedData.status,
                inventory: savedData.status.inventory && typeof savedData.status.inventory === 'object' ? savedData.status.inventory : {}
              };
              setStatus(loadedStatus);
              console.log('状态加载成功:', savedData.status);
            } else {
              console.log('加载的状态无效或缺失，使用默认状态。');
              setStatus(defaultInitialStatus);
            }

            // Load Pet Type ID
            if (savedData.petTypeId && typeof savedData.petTypeId === 'string') {
              // Validate if the loaded petTypeId exists in PET_TYPES
              // No need for dynamic import if PET_TYPES is already imported
              if (PET_TYPES[savedData.petTypeId]) {
                setCurrentPetTypeId(savedData.petTypeId);
                console.log('宠物类型ID加载成功:', savedData.petTypeId);
              } else {
                console.warn(`加载的宠物类型ID "${savedData.petTypeId}" 无效，使用默认值 'default'。`);
                setCurrentPetTypeId('default');
              }
            } else {
              console.log('未找到宠物类型ID或类型无效，使用默认值 \'default\'。');
              setCurrentPetTypeId('default'); // Fallback if petTypeId is missing or invalid
            }
            // Load Position (optional)
            if (savedData.position && typeof savedData.position === 'object' && 'x' in savedData.position && 'y' in savedData.position) {
                // Basic validation: ensure coordinates are numbers
                if (typeof savedData.position.x === 'number' && typeof savedData.position.y === 'number') {
                    setInitialPosition(savedData.position); // Set the loaded position
                    console.log('宠物位置加载成功:', savedData.position);
                } else {
                    console.warn('加载的位置坐标无效，将使用默认居中位置。');
                    setInitialPosition(null); // Indicate default should be used
                }
            } else {
                console.log('未找到保存的位置数据，将使用默认居中位置。');
                setInitialPosition(null); // Indicate default should be used
            }

            loadedSuccessfully = true; // Mark as successful if we got any valid data object
          } else {
            console.log('未找到保存的数据或数据无效，使用默认值。');
            setStatus(defaultInitialStatus);
            setCurrentPetTypeId('default');
            setInitialPosition(null); // Use default position
          }
        } else {
          console.warn('window.desktopPet.getPetState 不可用，使用默认值。');
          setStatus(defaultInitialStatus);
          setCurrentPetTypeId('default');
          setInitialPosition(null); // Use default position
        }
      } catch (error) {
        console.error('加载宠物状态失败:', error);
      } finally {
        // Ensure defaults are set if loading completely failed
        if (!loadedSuccessfully) {
          setStatus(defaultInitialStatus);
          setCurrentPetTypeId('default');
          setInitialPosition(null); // Use default position
        }
        setIsLoaded(true); // Mark loading as complete
      }
    };
    loadState();
  }, []); // Runs once on mount

  // 显示气泡的辅助函数 (Moved before the useEffect that uses it)
  const showBubble = useCallback((text: string, type: 'thought' | 'speech', duration = 3000) => {
      // 清除现有的超时
      if (statusRef.current.bubble.timeout) { // Use ref to avoid stale closure issues
          clearTimeout(statusRef.current.bubble.timeout);
      }

      // 使用 setTimeout 将状态更新推迟到下一个事件循环
      // 这样可以避免在渲染过程中更新状态
      setTimeout(() => {
          let timeoutId: number | null = null; // Declare timeoutId here
          setStatus(prev => {
              // Double check if another bubble was activated meanwhile
              if (prev.bubble.active && prev.bubble.text !== text) {
                  // If a different bubble is active, don't override, but clear its timeout
                  if (prev.bubble.timeout) clearTimeout(prev.bubble.timeout);
                  // Keep the existing bubble active
                  return prev;
              }

              // Set the new bubble active
              const newBubbleState = {
                  active: true,
                  text,
                  type,
                  timeout: null // Timeout ID will be set later
              };

              // Set the timer to hide this new bubble
              timeoutId = window.setTimeout(() => {
                  setStatus(current => {
                      // Only deactivate if this specific bubble is still the active one
                      if (current.bubble.active && current.bubble.text === text) {
                          return {
                              ...current,
                              bubble: { ...current.bubble, active: false, timeout: null }
                          };
                      }
                      return current; // Otherwise, state hasn't changed regarding this bubble
                  });
              }, duration);

              // Return the state with the new bubble and its timeout ID
              return {
                  ...prev,
                  bubble: { ...newBubbleState, timeout: timeoutId as unknown as number }
              };
          });
      }, 0); // Defer state update slightly
  }, [setStatus]); // Dependency: setStatus (stable)


  // 状态衰减、特殊事件、升级检查、任务检查、主动需求气泡
  useEffect(() => {
    if (!isLoaded) return; // Wait until state is loaded

    const intervalId = setInterval(() => {
      // --- Decay Rates, Time of Day, Random Events ---
      let moodDecay = 0.8;
      let cleanlinessDecay = 0.3;
      let hungerIncrease = 1.0;
      let energyDecay = 0.5;
      // ... (modifiers based on time and random events) ...

      // --- Update State ---
      setStatus(prev => {
        const currentTasks = gameData.tasks; // Get all defined tasks
        const currentAchievements = predefinedAchievements; // Use the imported achievements

        // Create a mutable copy of the previous state to work with
        let newStatus: PetStatus = {
          ...prev,
          mood: Math.floor(Math.max(0, prev.mood - moodDecay)),
          cleanliness: Math.floor(Math.max(0, prev.cleanliness - cleanlinessDecay)),
          hunger: Math.floor(Math.min(100, prev.hunger + hungerIncrease)),
          energy: Math.floor(Math.max(0, prev.energy - energyDecay)),
          exp: prev.exp + 1 // Experience always increases slightly
        };

        // --- Independent Special Events (Apply directly to newStatus) ---
        let specialEventOccurred = false;
        let eventMessage = "";

        // --- Level Up Check ---
        const expToNextLevel = 100 + (newStatus.level * 50);
        if (newStatus.exp >= expToNextLevel) {
          const oldLevel = prev.level;
          newStatus.exp -= expToNextLevel;
          newStatus.level += 1;
          const newLevel = newStatus.level;
          const unlockedItems: string[] = [];
          for (const [levelStr, items] of Object.entries(LEVEL_UNLOCKS)) {
             const level = Number(levelStr);
             if (!isNaN(level) && level > oldLevel && level <= newLevel) {
               unlockedItems.push(...items.map(item => `互动: ${item}`));
             }
           }
          if (unlockedItems.length > 0) {
            setNewlyUnlocked(prevUnlocked => [...prevUnlocked, ...unlockedItems]);
            console.log(`Level Up! ${newLevel}. Unlocked: ${unlockedItems.join(', ')}`);
          } else {
             console.log(`Level Up! Reached level ${newLevel}.`);
          }
        }

        // --- Task Check (Status-based goals) ---
        const newlyCompletedTasks: string[] = [];
        const taskNotifications: string[] = [];
        let currentActiveTasks = [...newStatus.activeTasks]; // Use newStatus here

        for (const taskId of prev.activeTasks) { // Iterate over tasks active at the start of the interval
          const task = currentTasks[taskId];
          // Use newStatus.completedTasks to check if already completed in this cycle
          if (!task || newStatus.completedTasks.includes(taskId)) continue;

          let allGoalsMetForThisTask = true;
          let taskProgressMade = false;

          for (const goal of task.goals) {
            let goalMetInThisCheck = goal.completed || false;

            switch (goal.type) {
              case 'reachStatus':
                if (goal.status && goal.targetValue !== undefined && goal.status in newStatus) {
                  const statusValue = newStatus[goal.status as keyof PetStatus];
                  if (typeof statusValue === 'number' && statusValue >= goal.targetValue) {
                    goalMetInThisCheck = true;
                  }
                }
                 break;
              // Other cases remain the same (maintainStatus, performInteraction)
              case 'maintainStatus': break;
              case 'performInteraction': break;
            }

            if (!goalMetInThisCheck) {
              allGoalsMetForThisTask = false;
            } else if (!goal.completed) {
                taskProgressMade = true;
            }
          } // End goal loop

          if (allGoalsMetForThisTask) {
            if (!prev.completedTasks.includes(taskId)) { // Ensure we only complete it once based on prev state
                newlyCompletedTasks.push(taskId);
                taskNotifications.push(`任务完成: ${task.name}`);
                newStatus.exp += task.reward.exp;

                // --- Add Item Rewards ---
                if (task.reward.items && task.reward.items.length > 0) {
                  const currentInventory = { ...newStatus.inventory }; // Create a mutable copy
                  task.reward.items.forEach(itemId => {
                    const item = predefinedItems[itemId]; // Get item details for notification
                    if (item) {
                      currentInventory[itemId] = (currentInventory[itemId] || 0) + 1;
                      taskNotifications.push(`获得物品: ${item.name}`); // Add item notification
                      console.log(`Item Added: ${item.name} (ID: ${itemId})`);
                    } else {
                      console.warn(`Task ${task.id} tried to reward non-existent item: ${itemId}`);
                    }
                  });
                  newStatus.inventory = currentInventory; // Update inventory in newStatus
                }
                // --- End Item Rewards ---

                if (task.reward.unlocks) {
                    setNewlyUnlocked(prevUnlocked => [...prevUnlocked, ...task.reward.unlocks!.map(u => `任务解锁: ${u}`)]);
                }
                console.log(`Task Completed: ${task.name}`);
                currentActiveTasks = currentActiveTasks.filter(id => id !== taskId); // Update mutable list
            }
          } else if (taskProgressMade) {
              // console.log(`Progress made on task: ${task.name}`);
          }
        } // End task loop

        // Update task lists in newStatus
        newStatus.activeTasks = currentActiveTasks;
        if (newlyCompletedTasks.length > 0) {
          // Use prev.completedTasks to avoid adding duplicates if interval runs fast
          newStatus.completedTasks = [...prev.completedTasks, ...newlyCompletedTasks];
          // Notifications are handled by setNewlyUnlocked outside this callback if needed
        }

        // --- Achievement Check (Refined) ---
        const newlyUnlockedAchievements: string[] = [];
        const achievementNotifications: string[] = [];

        for (const achievement of Object.values(currentAchievements)) {
          // Check against newStatus.unlockedAchievements
          if (newStatus.unlockedAchievements.includes(achievement.id)) {
            continue;
          }

          let allConditionsMet = true;
          for (const condition of achievement.conditions) {
            let conditionMet = false;
            switch (condition.type) {
              case 'statusThreshold':
                if (condition.status && condition.threshold !== undefined && condition.status in newStatus) {
                  const statusValue = newStatus[condition.status as keyof PetStatus];
                  if (typeof statusValue === 'number' && statusValue >= condition.threshold) {
                    conditionMet = true;
                  }
                }
                break;
              case 'levelReached':
                if (condition.level !== undefined && newStatus.level >= condition.level) {
                  conditionMet = true;
                }
                break;
              case 'interactionCount':
                if (condition.interactionType && condition.count !== undefined) {
                    const count = newStatus.interactionCounts[condition.interactionType] || 0;
                    if (count >= condition.count) {
                        conditionMet = true;
                    }
                }
                break;
              case 'taskCompleted':
                if (condition.taskId && newStatus.completedTasks.includes(condition.taskId)) {
                  conditionMet = true;
                }
                break;
            }
            if (!conditionMet) {
              allConditionsMet = false;
              break;
            }
          }

          if (allConditionsMet) {
            // Check against prev state to ensure it wasn't already unlocked
            if (!prev.unlockedAchievements.includes(achievement.id)) {
                newlyUnlockedAchievements.push(achievement.id);
                achievementNotifications.push(`成就解锁: ${achievement.name}`);
                newStatus.exp += achievement.reward?.exp || 0;
                if (achievement.reward?.unlocks) {
                    setNewlyUnlocked(prevUnlocked => [...prevUnlocked, ...achievement.reward!.unlocks!.map(u => `成就解锁: ${u}`)]);
                }
                if (achievement.reward?.idleAnimation) {
                    if (!newStatus.unlockedIdleAnimations.includes(achievement.reward.idleAnimation)) {
                        newStatus.unlockedIdleAnimations = [...newStatus.unlockedIdleAnimations, achievement.reward.idleAnimation];
                        console.log(`Unlocked Idle Animation: ${achievement.reward.idleAnimation}`);
                        setNewlyUnlocked(prevUnlocked => [...prevUnlocked, `解锁新动画: ${achievement.reward!.idleAnimation}`]);
                    }
                }
                console.log(`Achievement Unlocked: ${achievement.name}!`);
            }
          }
        } // End achievement loop

        if (newlyUnlockedAchievements.length > 0) {
          // Use prev.unlockedAchievements to avoid duplicates
          newStatus.unlockedAchievements = [...prev.unlockedAchievements, ...newlyUnlockedAchievements];
          // Notifications handled by setNewlyUnlocked outside
        }

        // --- Apply Special Events ---
        // Mood Boost
        if (!specialEventOccurred && Math.random() < 0.01) {
          eventMessage = "Special Event: Mood Boost!";
          newStatus.mood = Math.floor(Math.min(100, newStatus.mood + 50));
          specialEventOccurred = true;
        }
        // Sickness
        const SICKNESS_THRESHOLD = 15;
        const SICKNESS_CHANCE = 0.05;
        if (!specialEventOccurred && newStatus.cleanliness < SICKNESS_THRESHOLD && Math.random() < SICKNESS_CHANCE) {
          eventMessage = "Special Event: Pet got sick!";
          newStatus.mood = Math.floor(Math.max(0, newStatus.mood - 30));
          newStatus.energy = Math.floor(Math.max(0, newStatus.energy - 40));
          specialEventOccurred = true;
        }

        if (specialEventOccurred) {
            console.log(eventMessage);
        }

        // --- Final Return ---
        return newStatus;
      }); // End setStatus

      // --- Proactive Need Bubbles (Run after setStatus finishes) ---
      // Use a slight delay to ensure statusRef is updated after setStatus
      setTimeout(() => {
          const PROACTIVE_BUBBLE_CHANCE = 0.15; // 15% chance each minute
          const currentStatus = statusRef.current; // Use the updated status ref

          // Check only if no bubble is currently active
          if (!currentStatus.bubble.active && Math.random() < PROACTIVE_BUBBLE_CHANCE) {
              const HUNGER_NEED_THRESHOLD = 60; // Start feeling hungry
              const ENERGY_NEED_THRESHOLD = 40; // Start feeling tired
              const MOOD_NEED_THRESHOLD = 50;   // Start feeling bored/lonely

              let bubbleText = "";
              let bubbleType: 'thought' | 'speech' = 'thought'; // Default to thought

              // Prioritize needs: Hunger > Energy > Mood (Adjust priority as needed)
              if (currentStatus.hunger >= HUNGER_NEED_THRESHOLD && currentStatus.hunger < 80) { // Check moderate hunger
                  const hungerTexts = ["有点饿了...", "想吃点零食...", "肚子在叫了..."];
                  bubbleText = hungerTexts[Math.floor(Math.random() * hungerTexts.length)];
              } else if (currentStatus.energy <= ENERGY_NEED_THRESHOLD && currentStatus.energy > 20) { // Check moderate tiredness
                  const tiredTexts = ["有点困了...", "想打个盹...", "眼皮好重..."];
                  bubbleText = tiredTexts[Math.floor(Math.random() * tiredTexts.length)];
              } else if (currentStatus.mood <= MOOD_NEED_THRESHOLD && currentStatus.mood > 20) { // Check moderate boredom/sadness
                  const moodTexts = ["有点无聊...", "想玩...", "求关注~"];
                  bubbleText = moodTexts[Math.floor(Math.random() * moodTexts.length)];
              }
              // Add cleanliness check if desired
              // else if (currentStatus.cleanliness <= 50 && currentStatus.cleanliness > 20) { ... }

              if (bubbleText) {
                  console.log(`Proactive Bubble Triggered: ${bubbleText}`);
                  showBubble(bubbleText, bubbleType); // Call the existing showBubble function
              }
          }
      }, 10); // Small delay (10ms)

    }, 60000); // Run every minute

    return () => clearInterval(intervalId); // Cleanup interval
  }, [isLoaded, showBubble]); // Add showBubble to dependencies

  // 定期保存状态 - 已移至 PetWindow.tsx
  // useEffect(() => {
  //   if (!isLoaded) return;
  //
  //   const saveInterval = setInterval(() => {
  //     // ... save logic moved ...
  //   }, 60000);
  //
  //   return () => clearInterval(saveInterval);
  // }, [isLoaded]);

  // 退出时保存状态 - 已移至 PetWindow.tsx
  // useEffect(() => {
  //   const handleBeforeUnload = () => {
  //       // ... save logic moved ...
  //   };
  //
  //   window.addEventListener('beforeunload', handleBeforeUnload);
  //
  //   return () => {
  //       window.removeEventListener('beforeunload', handleBeforeUnload);
  //   };
  // }, [isLoaded]);

  // 清除新解锁内容状态的函数
  const clearNewlyUnlocked = useCallback(() => {
    setNewlyUnlocked([]);
  }, []); // setNewlyUnlocked is stable

  // 添加道具到库存
  const addItem = useCallback((itemId: string, quantity: number = 1) => {
    if (!predefinedItems[itemId]) {
      console.warn(`Attempted to add unknown item: ${itemId}`);
      return;
    }
    setStatus(prev => {
      const newInventory = { ...prev.inventory };
      newInventory[itemId] = (newInventory[itemId] || 0) + quantity;
      console.log(`Added ${quantity}x ${itemId}. New count: ${newInventory[itemId]}`);
      return { ...prev, inventory: newInventory };
    });
  }, []); // Dependencies: setStatus (stable)

  // 从库存移除道具
  const removeItem = useCallback((itemId: string, quantity: number = 1) => {
    let actuallyRemoved = 0;
    setStatus(prev => {
      const newInventory = { ...prev.inventory };
      const currentQuantity = newInventory[itemId] || 0;

      if (currentQuantity <= 0) {
        console.warn(`Attempted to remove item not in inventory: ${itemId}`);
        return prev; // No change
      }

      actuallyRemoved = Math.min(quantity, currentQuantity);
      newInventory[itemId] = currentQuantity - actuallyRemoved;

      if (newInventory[itemId] <= 0) {
        delete newInventory[itemId]; // Remove item if quantity is zero or less
      }
      console.log(`Removed ${actuallyRemoved}x ${itemId}. Remaining: ${newInventory[itemId] || 0}`);
      return { ...prev, inventory: newInventory };
    });
    return actuallyRemoved > 0; // Return true if item was successfully removed
  }, []); // Dependencies: setStatus (stable)

  // 互动逻辑 (修改以包含道具检查)
  const interact = useCallback((type: InteractionType, value: number, requiredItemType?: ItemType): boolean => {
    let itemToConsumeId: string | null = null;

    // --- 1. Check Item Availability (Corrected for Inventory: Record<string, number>) ---
    if (requiredItemType) {
      const inventory = statusRef.current.inventory;
      const availableItems = Object.entries(inventory)
        // Filter by quantity > 0 and matching item type from predefinedItems
        .filter(([itemId, quantity]) => quantity > 0 && predefinedItems[itemId]?.type === requiredItemType); // Correctly use quantity

      if (availableItems.length === 0) {
        console.log(`Interaction '${type}' requires a '${requiredItemType}' item, but none are available.`);
        // REMOVED showBubble call here
        return false; // Indicate interaction failed due to missing item
      }
      itemToConsumeId = availableItems[0][0]; // Select the first available item ID
    }

    // --- 2. Check Other Preconditions (e.g., Energy) ---
    let canPerformAction = true;
    let energyCost = 0;
    switch (type) {
      case 'play':
        energyCost = 10; // Example energy cost for playing
        if (statusRef.current.energy < energyCost) {
          canPerformAction = false;
          console.log("Interaction 'play' failed: Not enough energy.");
          // No bubble/notification here; let useActionHandling manage this based on return value
        }
        break;
      // Add other precondition checks here if needed
      // case 'feed': if (statusRef.current.hunger < 5) { canPerformAction = false; ... } break;
    }

    if (!canPerformAction) {
      return false; // Indicate interaction failed due to unmet preconditions
    }

    // --- 3. If all checks pass, attempt to consume item and update status ---
    let consumedSuccessfully = !itemToConsumeId; // Assume success if no item needed
    let statusUpdateAttempted = false;

    setStatus(prev => {
      let currentInventory = { ...prev.inventory };
      let currentItemQuantity = 0;

      // Attempt consumption if an item was required and identified
      if (itemToConsumeId) {
        currentItemQuantity = currentInventory[itemToConsumeId] || 0; // Get current quantity (number)
        if (currentItemQuantity > 0) {
          const newQuantity = currentItemQuantity - 1;
          if (newQuantity <= 0) {
            delete currentInventory[itemToConsumeId]; // Remove if zero
          } else {
            currentInventory[itemToConsumeId] = newQuantity; // Update quantity (number)
          }
          consumedSuccessfully = true;
          console.log(`Consumed 1x ${itemToConsumeId} for interaction '${type}'. Remaining: ${newQuantity}`);
        } else {
          // Item vanished between check and consumption (should be rare, but handle defensively)
          console.warn(`Concurrency issue? Tried to consume ${itemToConsumeId} but quantity was ${currentItemQuantity}`);
          consumedSuccessfully = false;
        }
      }

      // If consumption failed unexpectedly, abort status update
      if (!consumedSuccessfully) {
        statusUpdateAttempted = false;
        return prev;
      }

      // Proceed with status update
      statusUpdateAttempted = true;
      const newStatus = { ...prev, inventory: currentInventory }; // Start with updated inventory
      let baseMoodChange = 0;
      let baseCleanlinessChange = 0;
      let baseHungerChange = 0;
      let baseEnergyChange = -energyCost;
      let baseExpChange = 0;

      switch (type) {
        case 'feed':
          baseHungerChange = -value;
          baseMoodChange = 5;
          baseExpChange = 2;
          break;
        case 'clean':
          baseCleanlinessChange = value;
          baseMoodChange = 3;
          baseExpChange = 1;
          break;
        case 'play':
          baseMoodChange = value;
          baseExpChange = 3;
          break;
        case 'petting':
          baseMoodChange = 15;
          baseEnergyChange += 2;
          baseExpChange = 1;
          break;
        default:
          console.warn(`Unhandled interaction type in status update: ${type}`);
          break;
      }

      // Apply calculated changes
      newStatus.mood = Math.min(100, Math.max(0, prev.mood + baseMoodChange));
      newStatus.cleanliness = Math.min(100, Math.max(0, prev.cleanliness + baseCleanlinessChange));
      newStatus.hunger = Math.min(100, Math.max(0, prev.hunger + baseHungerChange));
      newStatus.energy = Math.min(100, Math.max(0, prev.energy + baseEnergyChange));
      newStatus.exp = prev.exp + baseExpChange;
      newStatus.interactionCounts[type] = (newStatus.interactionCounts[type] || 0) + 1;

      return newStatus;
    });

    if (statusUpdateAttempted) {
      console.log(`Interacted: ${type}, Value: ${value}${itemToConsumeId ? `, Consumed: ${itemToConsumeId}` : ''}`);
    }

    // Return true only if preconditions passed AND consumption (if needed) succeeded AND status update was attempted
    return consumedSuccessfully && statusUpdateAttempted;

  }, [setStatus]); // Removed showBubble dependency

  // Update low status flags (Moved this useEffect block down for clarity, no functional change)
  useEffect(() => {
      const newLowFlags = {
          mood: status.mood < 20,
          cleanliness: status.cleanliness < 20,
          hunger: status.hunger > 80, // Hunger warning when high
          energy: status.energy < 20
      };
      setLowStatusFlags(newLowFlags);

      // Trigger proactive thought bubbles for low status (Only if no other bubble is active)
      if (!status.bubble.active) {
          let warningText = "";
          // Simplified random selection for low status bubbles
          if (newLowFlags.mood && Math.random() < 0.3) warningText = ["心情不太好...", "有点难过...", "想要被安慰..."][Math.floor(Math.random() * 3)];
          else if (newLowFlags.hunger && Math.random() < 0.3) warningText = ["好饿啊...", "想吃东西...", "肚子咕咕叫了..."][Math.floor(Math.random() * 3)];
          else if (newLowFlags.energy && Math.random() < 0.3) warningText = ["好困...", "需要休息...", "要睡着了..."][Math.floor(Math.random() * 3)];
          else if (newLowFlags.cleanliness && Math.random() < 0.3) warningText = ["感觉不太干净...", "需要清洁...", "有点脏了..."][Math.floor(Math.random() * 3)];

          if (warningText) {
              showBubble(warningText, 'thought');
          }
      }
  }, [status, showBubble]); // Dependencies: status, showBubble

  // --- Blink Animation Logic ---
  useEffect(() => {
    const clearBlinkTimeout = () => {
      if (blinkTimeoutRef.current) {
        clearTimeout(blinkTimeoutRef.current);
        blinkTimeoutRef.current = null;
      }
    };

    const scheduleBlink = () => {
      clearBlinkTimeout();
      // Only schedule if not currently playing another idle animation
      if (currentIdleAnimation) {
          // If another animation is playing, reschedule blink check after a short delay
          blinkTimeoutRef.current = setTimeout(scheduleBlink, 1000);
          return;
      }

      const minBlinkDelay = 2000; // Minimum delay between blinks
      const maxBlinkDelay = 10000; // Maximum delay
      const randomDelay = minBlinkDelay + Math.random() * (maxBlinkDelay - minBlinkDelay);

      blinkTimeoutRef.current = setTimeout(() => {
        // Check conditions right before blinking
        const currentStatus = statusRef.current; // Get current status
        const canBlinkNow = isLoaded && currentStatus.energy > 25 && currentStatus.mood > 25 && !lowStatusFlags.energy && !lowStatusFlags.mood && !currentIdleAnimation;

        if (canBlinkNow) {
            setIsBlinking(true);
            // Clear blink state after animation duration
            setTimeout(() => setIsBlinking(false), IDLE_ANIMATION_DURATIONS['blink-animation']);
        }
        // Always reschedule the next blink check
        scheduleBlink();
      }, randomDelay);
    };

    // Initial schedule
    scheduleBlink();

    // Cleanup on unmount
    return clearBlinkTimeout;

  }, [isLoaded, lowStatusFlags.energy, lowStatusFlags.mood, currentIdleAnimation]); // Dependencies


  // --- Idle Animation Logic ---
  useEffect(() => {
    const clearIdleAnimationTimeouts = () => {
      if (idleAnimationTimeoutRef.current) {
        clearTimeout(idleAnimationTimeoutRef.current);
        idleAnimationTimeoutRef.current = null;
      }
      if (idleAnimationClearTimeoutRef.current) {
        clearTimeout(idleAnimationClearTimeoutRef.current);
        idleAnimationClearTimeoutRef.current = null;
      }
    };

    const scheduleIdleAnimation = () => {
      clearIdleAnimationTimeouts(); // Clear previous timeouts

      // Adjust delay based on mood/energy
      let minDelay = 8000; // Increased default min delay
      let maxDelay = 15000; // Increased default max delay
      const currentStatus = statusRef.current;

      if (currentStatus.mood > 80 && currentStatus.energy > 80) { // Very happy and energetic
          minDelay = 6000;
          maxDelay = 12000;
      } else if (currentStatus.mood < 25 || currentStatus.energy < 25) { // Very sad or tired
          minDelay = 12000;
          maxDelay = 20000;
      }

      const randomDelay = minDelay + Math.random() * (maxDelay - minDelay);

      idleAnimationTimeoutRef.current = setTimeout(() => {
        // --- State-Driven Idle Animation Selection ---
        const currentStatus = statusRef.current;
        const availableAnimations = [...BASE_IDLE_ANIMATIONS, ...(currentStatus.unlockedIdleAnimations || [])];

        if (availableAnimations.length === 0) {
            scheduleIdleAnimation(); // Reschedule if no animations available
            return;
        }

        const HAPPY_THRESHOLD = 70;
        const TIRED_THRESHOLD = 30;

        // Define animation pools (using existing base animations as examples)
        // TODO: Add more specific animations later (e.g., 'idle-yawn', 'idle-happy-jump')
        const happyAnimations = ['idle-wiggle-animation'];
        const tiredAnimations = ['stretch-animation']; // Interpreted as tired stretch/yawn for now
        const neutralAnimations = ['stretch-animation', 'idle-wiggle-animation'];

        let prioritizedPool: string[] = [];

        // Determine the prioritized pool based on status
        if (currentStatus.energy < TIRED_THRESHOLD) {
            prioritizedPool = tiredAnimations.filter(anim => availableAnimations.includes(anim));
            console.log("Idle: Prioritizing tired animations");
        } else if (currentStatus.mood > HAPPY_THRESHOLD && currentStatus.energy > TIRED_THRESHOLD) { // Ensure not tired when happy
            prioritizedPool = happyAnimations.filter(anim => availableAnimations.includes(anim));
             console.log("Idle: Prioritizing happy animations");
        } else {
            // Includes neutral mood/energy, or sad mood (until sad animations are added)
            prioritizedPool = neutralAnimations.filter(anim => availableAnimations.includes(anim));
             console.log("Idle: Prioritizing neutral animations");
        }

        let selectedAnimation: string;
        // Select animation: prioritize status-specific pool, fallback to general pool
        if (prioritizedPool.length > 0) {
            selectedAnimation = prioritizedPool[Math.floor(Math.random() * prioritizedPool.length)];
             console.log(`Idle: Selected from prioritized pool: ${selectedAnimation}`);
        } else {
            // Fallback if no specific animations are available for the current state
            selectedAnimation = availableAnimations[Math.floor(Math.random() * availableAnimations.length)];
             console.log(`Idle: Selected from fallback pool: ${selectedAnimation}`);
        }

        const duration = IDLE_ANIMATION_DURATIONS[selectedAnimation] || 500; // Default duration if not specified

        // Only play if not currently blinking or doing another idle animation
        if (!isBlinking && !currentIdleAnimation) {
          setCurrentIdleAnimation(selectedAnimation as IdleAnimation);

          // Schedule clearing the animation class after its duration
          idleAnimationClearTimeoutRef.current = setTimeout(() => {
            setCurrentIdleAnimation(null);
            // Schedule the next idle animation *after* the current one finishes
            scheduleIdleAnimation();
          }, duration);
        } else {
            // If blinking or another idle animation is happening, reschedule check sooner
            scheduleIdleAnimation();
        }
      }, randomDelay);
    };

    // Check conditions before scheduling
    const canPlayIdleAnimation = isLoaded && status.energy > 30 && status.mood > 30 && !lowStatusFlags.energy && !lowStatusFlags.mood;

    if (canPlayIdleAnimation) {
      scheduleIdleAnimation();
    } else {
      // If conditions aren't met, clear any existing timeouts and ensure animation state is null
      clearIdleAnimationTimeouts();
      setCurrentIdleAnimation(null); // Ensure animation is cleared
      // Optionally, schedule a check later to see if conditions improve
      // idleAnimationTimeoutRef.current = setTimeout(scheduleIdleAnimation, 15000); // Check again in 15s
    }

    // Cleanup on unmount or when conditions change
    return clearIdleAnimationTimeouts;

  }, [isLoaded, status.energy, status.mood, lowStatusFlags.energy, lowStatusFlags.mood, isBlinking, status.unlockedIdleAnimations]); // Add dependencies

  // Return the state and functions
  return {
    status,
    setStatus, // Expose setStatus if direct manipulation is needed elsewhere (use with caution)
    lowStatusFlags,
    newlyUnlocked,
    clearNewlyUnlocked,
    isLoaded,
    isBlinking, // Expose blinking state
    currentIdleAnimation, // Expose current idle animation
    currentPetTypeId, // Expose current pet type ID
    setCurrentPetTypeId, // Expose function to set pet type ID
    initialPosition, // Expose the loaded initial position
    interact, // Expose the interact function
    // Add other functions if needed, e.g., manually trigger achievement check
  };
}