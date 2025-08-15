import { useEffect, useRef, useCallback } from 'react';
import { PetPosition } from '../interaction/types'; // Correct import path for PetPosition

interface UseAutonomousMovementProps {
  petPosition: PetPosition;
  setPetPosition: React.Dispatch<React.SetStateAction<PetPosition>>;
  setCurrentAnimation: (animation: string | null) => void;
  isDragging: boolean; // To pause movement when user is dragging
  showMenu: boolean; // To pause movement when menu is open
  // Add other interaction states if needed (e.g., isInteracting)
  windowWidth: number;  // Use window dimensions instead of screen
  windowHeight: number; // Use window dimensions instead of screen
  petWidth: number; // Get pet dimensions to calculate boundaries
  petHeight: number;
  activityLevel?: 'calm' | 'normal' | 'playful'; // 新增：活动级别设置
}

// 基础移动间隔配置（毫秒）
const MOVEMENT_INTERVALS = {
  calm: 45000,     // 45秒 - 安静模式，很少移动
  normal: 25000,   // 25秒 - 正常模式，适中频率
  playful: 12000   // 12秒 - 活跃模式，频繁移动
};

const MOVEMENT_DURATION = 1000; // Duration of the move animation (adjust as needed)

// 移动距离配置
const MOVE_DISTANCES = {
  calm: { min: 20, max: 80 },      // 安静模式：短距离移动
  normal: { min: 30, max: 150 },   // 正常模式：中等距离移动
  playful: { min: 50, max: 200 }   // 活跃模式：长距离移动
};

const EDGE_PADDING = 20; // Padding from screen edges

export default function useAutonomousMovement({
  petPosition,
  setPetPosition,
  setCurrentAnimation,
  isDragging,
  showMenu,
  windowWidth,  // Use window dimensions
  windowHeight, // Use window dimensions
  petWidth,
  petHeight,
  activityLevel = 'normal', // 默认为正常活动级别
}: UseAutonomousMovementProps) {
  const movementTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMovingRef = useRef(false);

  const calculateNewPosition = useCallback((): PetPosition => {
    const angle = Math.random() * 2 * Math.PI; // Random direction
    const { min, max } = MOVE_DISTANCES[activityLevel];
    const distance = Math.random() * (max - min) + min;

    let newX = petPosition.x + Math.cos(angle) * distance;
    let newY = petPosition.y + Math.sin(angle) * distance;

    // Clamp position within screen bounds, considering pet size and padding
    const minX = EDGE_PADDING;
    const maxX = windowWidth - petWidth - EDGE_PADDING; // Use windowWidth
    const minY = EDGE_PADDING;
    const maxY = windowHeight - petHeight - EDGE_PADDING; // Use windowHeight

    newX = Math.max(minX, Math.min(newX, maxX));
    newY = Math.max(minY, Math.min(newY, maxY));

    // Ensure pet doesn't get stuck if boundaries are too small
    if (maxX < minX || maxY < minY) {
        console.warn("Screen boundaries too small for autonomous movement.");
        return petPosition; // Return current position if boundaries invalid
    }


    return { x: newX, y: newY };
  }, [petPosition, windowWidth, windowHeight, petWidth, petHeight, activityLevel]); // 添加activityLevel依赖

  const startMovement = useCallback(() => {
    if (isMovingRef.current || isDragging || showMenu) return; // Don't move if already moving or user interacting

    isMovingRef.current = true;
    const targetPosition = calculateNewPosition();

    // TODO: Add a 'walking' or 'moving' animation
    setCurrentAnimation('walk-animation'); // Placeholder animation name

    // Animate the movement (simple linear interpolation for now)
    // For smoother animation, consider libraries like react-spring or framer-motion
    // Or, use CSS transitions on the pet container
    const startX = petPosition.x;
    const startY = petPosition.y;
    const dx = targetPosition.x - startX;
    const dy = targetPosition.y - startY;
    const startTime = Date.now();

    const animate = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / MOVEMENT_DURATION);

      setPetPosition({
        x: startX + dx * progress,
        y: startY + dy * progress,
      });

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Movement finished
        setCurrentAnimation(null); // Clear walking animation
        isMovingRef.current = false;
        // Schedule next movement
        scheduleNextMovement();
      }
    };

    requestAnimationFrame(animate);

  }, [calculateNewPosition, setCurrentAnimation, setPetPosition, petPosition, isDragging, showMenu]);


  const scheduleNextMovement = useCallback(() => {
    if (movementTimeoutRef.current) {
      clearTimeout(movementTimeoutRef.current);
    }

    // 根据活动级别获取基础间隔时间
    const baseInterval = MOVEMENT_INTERVALS[activityLevel];
    // 添加随机性：±20%的变化
    const randomizedInterval = baseInterval * (0.8 + Math.random() * 0.4);

    movementTimeoutRef.current = setTimeout(() => {
        // Check again before starting movement, in case interaction started during timeout
        if (!isDragging && !showMenu) {
             startMovement();
        } else {
            // If interaction is happening, reschedule after a shorter delay
            scheduleNextMovement();
        }
    }, randomizedInterval);
  }, [startMovement, isDragging, showMenu, activityLevel]); // 添加activityLevel依赖

  useEffect(() => {
    // Start the first movement cycle
    scheduleNextMovement();

    // Cleanup on unmount
    return () => {
      if (movementTimeoutRef.current) {
        clearTimeout(movementTimeoutRef.current);
      }
      // Potentially stop any ongoing animation frame loop if component unmounts mid-move
      isMovingRef.current = false; // Prevent rescheduling if unmounted
    };
  }, [scheduleNextMovement]); // Initial setup

  // Effect to reschedule if interaction starts/stops
  useEffect(() => {
      if (isDragging || showMenu) {
          // If interaction starts, clear the scheduled movement
          if (movementTimeoutRef.current) {
              clearTimeout(movementTimeoutRef.current);
              movementTimeoutRef.current = null;
          }
          // If currently moving, we might want to stop it immediately or let it finish
          // For now, let it finish, but prevent new moves from starting
      } else {
          // If interaction stops and no movement is scheduled, schedule one
          if (!movementTimeoutRef.current && !isMovingRef.current) {
              scheduleNextMovement();
          }
      }
  }, [isDragging, showMenu, scheduleNextMovement]);


  // No return value needed as it directly modifies state via setters
}