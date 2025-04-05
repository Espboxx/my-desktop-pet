import { useState, useRef, useCallback } from 'react';
import { PetPosition, MouseHistoryPoint } from './types';
import { INTERACTION_CONSTANTS } from './constants';
import { MutableRefObject } from 'react';

interface UseMouseHandlingProps {
  petRef: React.RefObject<HTMLDivElement>;
  isMouseOverPet: MutableRefObject<boolean>;
  petPosition: PetPosition;
  setPetPosition: React.Dispatch<React.SetStateAction<PetPosition>>;
  setCurrentAnimation: (animation: string | null) => void;
  setShowMenu: (show: boolean) => void;
  setMenuPosition: React.Dispatch<React.SetStateAction<{ top: number; left: number } | null>>;
  showMenu: boolean;
  handleAction: (action: string) => void;
  clearReaction: () => void;
  longPressTimeoutRef: MutableRefObject<NodeJS.Timeout | null>;
  lastClickTimeRef: MutableRefObject<number>;
  reactionTimeoutRef: MutableRefObject<NodeJS.Timeout | null>;
  setEnableGlobalEyeTracking: (enabled: boolean) => void;
  lastInteractionTimeRef: MutableRefObject<number>;
}

interface UseMouseHandlingReturn {
  handleMouseDown: (e: React.MouseEvent) => void;
  handleMouseEnter: (e: React.MouseEvent) => void;
  handleMouseLeave: (e: React.MouseEvent) => void;
  isDraggingRef: MutableRefObject<boolean>;
  isCurrentlyDragging: boolean;
  mouseDownButton: MutableRefObject<number | null>;
}

export default function useMouseHandling({
  petRef,
  isMouseOverPet,
  petPosition,
  setPetPosition,
  setCurrentAnimation,
  setShowMenu,
  setMenuPosition,
  showMenu,
  handleAction,
  clearReaction,
  longPressTimeoutRef,
  lastClickTimeRef,
  reactionTimeoutRef,
  setEnableGlobalEyeTracking,
  lastInteractionTimeRef,
}: UseMouseHandlingProps): UseMouseHandlingReturn {
  // 状态和引用
  const isDraggingRef = useRef(false);
  const [isCurrentlyDragging, setIsCurrentlyDragging] = useState(false);
  const dragStartMousePos = useRef<{ clientX: number, clientY: number } | null>(null);
  const initialPetPosRef = useRef<PetPosition | null>(null);
  const mouseDownButton = useRef<number | null>(null);
  const mouseDownTimeRef = useRef<number | null>(null);
  
  const clickThreshold = INTERACTION_CONSTANTS.CLICK_THRESHOLD;
  const LONG_PRESS_THRESHOLD = INTERACTION_CONSTANTS.LONG_PRESS_THRESHOLD;
  const DOUBLE_CLICK_THRESHOLD = INTERACTION_CONSTANTS.DOUBLE_CLICK_THRESHOLD;
  const REACTION_ANIMATION_DURATION = INTERACTION_CONSTANTS.REACTION_ANIMATION_DURATION;
  
  // 鼠标进入处理
  const handleMouseEnter = useCallback((e: React.MouseEvent) => {
    isMouseOverPet.current = true;
    window.desktopPet.setMousePassthrough(false);
    clearReaction(); // 清除之前的反应状态
  }, [clearReaction, isMouseOverPet]);
  
  // 鼠标离开处理
  const handleMouseLeave = useCallback((e: React.MouseEvent) => {
    isMouseOverPet.current = false;
    clearReaction(); // 清除反应和计时器
    
    if (!isDraggingRef.current && !showMenu) {
      window.desktopPet.setMousePassthrough(true);
    }
  }, [clearReaction, isMouseOverPet, showMenu]);
  
  // 鼠标按下处理
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    mouseDownButton.current = e.button;
    const now = Date.now();
    
    if (e.button === 0) { // 左键按下
      dragStartMousePos.current = { clientX: e.clientX, clientY: e.clientY };
      initialPetPosRef.current = { ...petPosition };
      mouseDownTimeRef.current = now;
      isMouseOverPet.current = true; // 确保按下时标记为在宠物上
      clearReaction(); // 停止当前反应动画
      
      // 更新最后交互时间
      lastInteractionTimeRef.current = now;
      
      // 长按检测
      longPressTimeoutRef.current = setTimeout(() => {
        if (isDraggingRef.current) return; // 如果在拖动则忽略长按
        
        // 长按触发特殊动画
        setCurrentAnimation('long-press-animation');
        
        // 设置动画自动结束
        reactionTimeoutRef.current = setTimeout(clearReaction, REACTION_ANIMATION_DURATION * 1.5);
        
        longPressTimeoutRef.current = null;
      }, LONG_PRESS_THRESHOLD);
      
      // 检测是否为双击
      const timeSinceLastClick = now - lastClickTimeRef.current;
      if (timeSinceLastClick < DOUBLE_CLICK_THRESHOLD) {
        // 双击动画触发
        setCurrentAnimation('double-click-animation');
        
        // 设置动画自动结束
        reactionTimeoutRef.current = setTimeout(clearReaction, REACTION_ANIMATION_DURATION);
        
        if (longPressTimeoutRef.current) {
          clearTimeout(longPressTimeoutRef.current);
          longPressTimeoutRef.current = null;
        }
      }
      
      // 更新最后点击时间用于下次双击检测
      lastClickTimeRef.current = now;
      
      // 在拖动开始前暂时禁用全局眼睛跟踪，避免拖动时眼睛跟随鼠标
      setEnableGlobalEyeTracking(false);
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
      window.desktopPet.setMousePassthrough(false);

      if (showMenu) {
        setShowMenu(false);
        setMenuPosition(null);
      }

      e.preventDefault();
      e.stopPropagation();
    }
  }, [
    DOUBLE_CLICK_THRESHOLD, 
    LONG_PRESS_THRESHOLD, 
    REACTION_ANIMATION_DURATION, 
    clearReaction, 
    isMouseOverPet, 
    lastClickTimeRef, 
    lastInteractionTimeRef, 
    longPressTimeoutRef, 
    petPosition, 
    reactionTimeoutRef, 
    setCurrentAnimation, 
    setEnableGlobalEyeTracking, 
    setMenuPosition, 
    setShowMenu, 
    showMenu
  ]);
  
  // 全局鼠标移动（用于拖拽）
  const handleGlobalMouseMove = useCallback((e: MouseEvent) => {
    // 更新最后交互时间
    lastInteractionTimeRef.current = Date.now();
    
    // --- 处理拖动 ---
    if (mouseDownButton.current === 0 && dragStartMousePos.current && initialPetPosRef.current) {
      const dx = e.clientX - dragStartMousePos.current.clientX;
      const dy = e.clientY - dragStartMousePos.current.clientY;

      if (!isDraggingRef.current) {
        if (Math.abs(dx) > clickThreshold || Math.abs(dy) > clickThreshold) {
          isDraggingRef.current = true;
          setIsCurrentlyDragging(true); // 更新暴露的状态
          setCurrentAnimation('picked-up'); // 触发 "被提起" 动画
          
          // 如果开始拖动，取消长按检测
          if (longPressTimeoutRef.current) {
            clearTimeout(longPressTimeoutRef.current);
            longPressTimeoutRef.current = null;
          }
        }
      }

      if (isDraggingRef.current) {
        const newX = initialPetPosRef.current.x + dx;
        const newY = initialPetPosRef.current.y + dy;
        setPetPosition({ x: newX, y: newY });
      }
    }
    
    // 阻止默认浏览器行为
    e.preventDefault();
    e.stopPropagation();
  }, [
    clickThreshold, 
    lastInteractionTimeRef, 
    longPressTimeoutRef, 
    setPetPosition, 
    setCurrentAnimation, 
    setIsCurrentlyDragging
  ]);
  
  // 全局鼠标抬起（用于结束拖拽）
  const handleGlobalMouseUp = useCallback((e: MouseEvent) => {
    if (mouseDownButton.current === 0) {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
      
      // 更新最后交互时间
      lastInteractionTimeRef.current = Date.now();
      
      // 清除长按检测
      if (longPressTimeoutRef.current) {
        clearTimeout(longPressTimeoutRef.current);
        longPressTimeoutRef.current = null;
      }
      
      // 拖拽结束后重新启用全局眼睛跟踪
      setEnableGlobalEyeTracking(true);

      const wasDragging = isDraggingRef.current;
      const wasClick = !wasDragging;

      // 重置拖动状态
      isDraggingRef.current = false;
      setIsCurrentlyDragging(false); // 更新暴露的状态
      dragStartMousePos.current = null;
      initialPetPosRef.current = null;
      mouseDownTimeRef.current = null;

      if (wasClick) {
        handleAction('pet'); // 将点击视为"抚摸"交互
        window.desktopPet.setMousePassthrough(false); // 点击后保持非穿透
        isMouseOverPet.current = true; // 确保标记正确
        clearReaction(); // 清除点击时的任何残留反应
      } else {
        // --- 处理拖动结束 ---
        setCurrentAnimation('landed'); // 触发 "落地" 动画

        // 检查鼠标是否仍在宠物元素上
        const mouseX = e.clientX;
        const mouseY = e.clientY;
        let isOverPetNow = false;
        if (petRef.current) {
          const petRect = petRef.current.getBoundingClientRect();
          isOverPetNow =
            mouseX >= petRect.left &&
            mouseX <= petRect.right &&
            mouseY >= petRect.top &&
            mouseY <= petRect.bottom;
        }
        isMouseOverPet.current = isOverPetNow; // 更新鼠标悬停状态

        // 根据鼠标位置和菜单状态决定是否启用鼠标穿透
        if (!isOverPetNow && !showMenu) {
          window.desktopPet.setMousePassthrough(true);
        } else if (isOverPetNow) {
          window.desktopPet.setMousePassthrough(false); // 确保在宠物上时非穿透
        }
      }

      e.stopPropagation();
    }
    mouseDownButton.current = null;
  }, [
    clearReaction, 
    handleAction, 
    handleGlobalMouseMove, 
    isMouseOverPet, 
    lastInteractionTimeRef, 
    longPressTimeoutRef, 
    petRef, 
    setCurrentAnimation, 
    setEnableGlobalEyeTracking,
    showMenu
  ]);
  
  return {
    handleMouseDown,
    handleMouseEnter,
    handleMouseLeave,
    isDraggingRef,
    isCurrentlyDragging,
    mouseDownButton
  };
}