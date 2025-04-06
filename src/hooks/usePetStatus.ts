import { useRef, useEffect } from 'react';

// 从各个子模块导入功能
import {
  useStateLoader,
  useBubbleDisplay,
  useStateDecay,
  useInventory,
  useInteraction,
  useStatusWarnings,
  useAnimations
} from './pet';

/**
 * 宠物状态管理的主Hook
 * 整合了各个功能模块，提供统一的接口
 */
export default function usePetStatus() {
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
  
  // 气泡显示
  const { showBubble } = useBubbleDisplay(setStatus, statusRef);
  
  // 状态衰减和特殊事件
  const { newlyUnlocked, clearNewlyUnlocked } = useStateDecay(isLoaded, setStatus, statusRef, showBubble);
  
  // 物品管理
  const { addItem, removeItem } = useInventory(setStatus);
  
  // 互动逻辑
  const { interact } = useInteraction(setStatus, statusRef);
  
  // 低状态提醒
  const { lowStatusFlags } = useStatusWarnings(status, showBubble);
  
  // 动画管理
  const { isBlinking, currentIdleAnimation } = useAnimations(isLoaded, status, statusRef, lowStatusFlags);

  // 返回统一的接口
  return {
    status,
    setStatus, // 谨慎使用，仅在需要直接操作状态时
    lowStatusFlags,
    newlyUnlocked,
    clearNewlyUnlocked,
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