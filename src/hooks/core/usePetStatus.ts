import { useRef, useEffect, useState, useCallback } from 'react'; // Add useState and useCallback

// 从各个子模块导入功能
import {
  useStateLoader,
  // useBubbleDisplay, // Removed import
  // useStateDecay, // Removed import
  useInventory,
  useInteraction,
  useStatusWarnings,
  useAnimations,
  useStatusDecay,         // Added import
  useLevelingSystem,      // Added import
  useTaskManager,         // Added import
  useAchievementManager,  // Added import
  useSpecialEvents,       // Added import
  useProactiveNeeds       // Added import
} from '../pet';

/**
 * 宠物状态管理的主Hook
 * 整合了各个功能模块，提供统一的接口
 */
export default function usePetStatus(activityLevel: 'calm' | 'normal' | 'playful' = 'normal') {
  // 加载状态
  const {
    status,
    setStatus,
    isLoaded,
    currentPetTypeId,
    setCurrentPetTypeId,
    initialPosition
  } = useStateLoader();

  // 创建状态引用，用于在回调函数中访问最新状态
  const statusRef = useRef(status);
  
  // 更新引用，确保始终持有最新状态
  useEffect(() => {
    statusRef.current = status;
  }, [status]);
  
  // Removed useBubbleDisplay hook call
  
  // --- Call new fine-grained hooks ---
  const decayInterval = 60000; // Example: 1 minute interval for periodic checks

  useStatusDecay(isLoaded, setStatus, decayInterval);
  const { newlyUnlockedLevelItems, clearNewlyUnlockedLevelItems } = useLevelingSystem(isLoaded, setStatus, decayInterval);
  const { newlyUnlockedTaskItems, clearNewlyUnlockedTaskItems } = useTaskManager(isLoaded, setStatus, statusRef, decayInterval);
  const { newlyUnlockedAchievementItems, clearNewlyUnlockedAchievementItems } = useAchievementManager(isLoaded, setStatus, statusRef, decayInterval);
  useSpecialEvents(isLoaded, setStatus, statusRef, decayInterval);
  useProactiveNeeds(isLoaded, statusRef, decayInterval);
  // ------------------------------------

  // --- Combine newly unlocked items ---
  const [newlyUnlocked, setNewlyUnlocked] = useState<string[]>([]);

  useEffect(() => {
    const combined = [
      ...newlyUnlockedLevelItems,
      ...newlyUnlockedTaskItems,
      ...newlyUnlockedAchievementItems,
    ];
    // Avoid setting state if the combined array is identical to the current one
    if (combined.length > 0 || newlyUnlocked.length > 0) {
       // Simple comparison for now, might need deep comparison if items are complex
       if (JSON.stringify(combined) !== JSON.stringify(newlyUnlocked)) {
            setNewlyUnlocked(combined);
       }
    }
  }, [newlyUnlockedLevelItems, newlyUnlockedTaskItems, newlyUnlockedAchievementItems, newlyUnlocked]); // Added newlyUnlocked to dependencies

  const clearNewlyUnlocked = useCallback(() => {
    clearNewlyUnlockedLevelItems();
    clearNewlyUnlockedTaskItems();
    clearNewlyUnlockedAchievementItems();
    // setNewlyUnlocked([]); // State will update via useEffect
  }, [clearNewlyUnlockedLevelItems, clearNewlyUnlockedTaskItems, clearNewlyUnlockedAchievementItems]);
  // ------------------------------------

  // 物品管理
  const { addItem, removeItem } = useInventory(setStatus);
  
  // 互动逻辑
  const { interact } = useInteraction(setStatus, statusRef);
  
  // 低状态提醒
  const { lowStatusFlags } = useStatusWarnings(status); // Removed showBubble argument
  
  // 动画管理
  const { isBlinking, currentIdleAnimation } = useAnimations(isLoaded, status, statusRef, lowStatusFlags, activityLevel);

  // 返回统一的接口
  return {
    status,
    setStatus, // 谨慎使用，仅在需要直接操作状态时
    lowStatusFlags,
    newlyUnlocked, // Now combined
    clearNewlyUnlocked, // Now combined
    isLoaded,
    isBlinking,
    currentIdleAnimation,
    currentPetTypeId,
    setCurrentPetTypeId,
    initialPosition,
    interact,
    addItem,
    removeItem
    // 可根据需要添加其他函数
  };
}