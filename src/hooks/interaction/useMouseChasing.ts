import { useRef, useEffect, useCallback } from 'react';
import { PetPosition, MouseHistoryPoint } from './types';
import { INTERACTION_CONSTANTS } from './constants';

interface UseMouseChasingProps {
  petRef: React.RefObject<HTMLDivElement>;
  petPosition: PetPosition;
  setPetPosition: React.Dispatch<React.SetStateAction<PetPosition>>;
  mouseSpeed: React.MutableRefObject<number>;
  mousePosHistory: React.MutableRefObject<MouseHistoryPoint[]>;
  isDraggingRef: React.MutableRefObject<boolean>;
  setCurrentAnimation: (animation: string | null) => void;
  windowWidth: number;
  windowHeight: number;
}

// 追逐鼠标的相关常量
const CHASE_CONSTANTS = {
  CHASE_SPEED: 150, // 追逐速度（像素/秒）
  MIN_CHASE_DISTANCE: 20, // 最小追逐距离
  MAX_CHASE_DISTANCE: 100, // 最大追逐距离
  CHASE_DURATION: 800, // 追逐动画持续时间（毫秒）
  CHASE_COOLDOWN: 1500, // 追逐冷却时间（毫秒）
  DETECTION_RADIUS: 200, // 检测鼠标的半径（像素）
  EDGE_PADDING: 20, // 屏幕边缘填充（像素）
};

export default function useMouseChasing({
  petRef,
  petPosition,
  setPetPosition,
  mouseSpeed,
  mousePosHistory,
  isDraggingRef,
  setCurrentAnimation,
  windowWidth,
  windowHeight,
}: UseMouseChasingProps) {
  // 引用是否正在追逐
  const isChasingRef = useRef(false);
  // 引用最后一次追逐时间
  const lastChaseTimeRef = useRef(0);
  // 引用追逐动画帧
  const chaseAnimationFrameRef = useRef<number | null>(null);
  // 引用宠物宽高
  const petDimensionsRef = useRef({ width: 80, height: 80 });

  // 更新宠物尺寸
  useEffect(() => {
    const updatePetDimensions = () => {
      if (petRef.current) {
        const rect = petRef.current.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          petDimensionsRef.current = { width: rect.width, height: rect.height };
        }
      }
    };

    updatePetDimensions();
    // 窗口大小变化时重新计算
    window.addEventListener('resize', updatePetDimensions);
    return () => window.removeEventListener('resize', updatePetDimensions);
  }, [petRef]);

  // 检查鼠标是否在宠物附近
  const isMouseNearPet = useCallback(
    (mouseX: number, mouseY: number): boolean => {
      if (!petRef.current) return false;

      const petRect = petRef.current.getBoundingClientRect();
      const petCenterX = petPosition.x;
      const petCenterY = petPosition.y;

      const dx = mouseX - petCenterX;
      const dy = mouseY - petCenterY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      return distance <= CHASE_CONSTANTS.DETECTION_RADIUS;
    },
    [petRef, petPosition]
  );

  // 计算朝向鼠标的新位置
  const calculateChasePosition = useCallback(
    (mouseX: number, mouseY: number): PetPosition => {
      // 计算方向向量
      const dx = mouseX - petPosition.x;
      const dy = mouseY - petPosition.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // 如果距离太近，不移动
      if (distance < CHASE_CONSTANTS.MIN_CHASE_DISTANCE) {
        return petPosition;
      }

      // 归一化方向向量
      const dirX = dx / distance;
      const dirY = dy / distance;

      // 计算移动距离（最大为MAX_CHASE_DISTANCE）
      const moveDistance = Math.min(
        distance * 0.6, // 移动距离为鼠标距离的60%
        CHASE_CONSTANTS.MAX_CHASE_DISTANCE
      );

      // 计算新位置
      let newX = petPosition.x + dirX * moveDistance;
      let newY = petPosition.y + dirY * moveDistance;

      // 确保宠物不会超出屏幕边界
      const minX = CHASE_CONSTANTS.EDGE_PADDING;
      const maxX = windowWidth - petDimensionsRef.current.width - CHASE_CONSTANTS.EDGE_PADDING;
      const minY = CHASE_CONSTANTS.EDGE_PADDING;
      const maxY = windowHeight - petDimensionsRef.current.height - CHASE_CONSTANTS.EDGE_PADDING;

      newX = Math.max(minX, Math.min(newX, maxX));
      newY = Math.max(minY, Math.min(newY, maxY));

      return { x: newX, y: newY };
    },
    [petPosition, windowWidth, windowHeight]
  );

  // 开始追逐动画
  const startChaseAnimation = useCallback(
    (targetPosition: PetPosition) => {
      if (isChasingRef.current || isDraggingRef.current) return;

      isChasingRef.current = true;
      lastChaseTimeRef.current = Date.now();

      // 设置追逐动画
      setCurrentAnimation('chase-animation');

      // 动画起始位置
      const startX = petPosition.x;
      const startY = petPosition.y;
      const dx = targetPosition.x - startX;
      const dy = targetPosition.y - startY;
      const startTime = Date.now();

      // 动画函数
      const animate = () => {
        const now = Date.now();
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / CHASE_CONSTANTS.CHASE_DURATION);

        // 使用缓动函数使动画更自然
        const easeProgress = 1 - Math.pow(1 - progress, 3); // 缓出效果

        setPetPosition({
          x: startX + dx * easeProgress,
          y: startY + dy * easeProgress,
        });

        if (progress < 1) {
          chaseAnimationFrameRef.current = requestAnimationFrame(animate);
        } else {
          // 追逐结束
          setCurrentAnimation(null);
          isChasingRef.current = false;
          chaseAnimationFrameRef.current = null;
        }
      };

      // 开始动画
      chaseAnimationFrameRef.current = requestAnimationFrame(animate);
    },
    [petPosition, setPetPosition, setCurrentAnimation, isDraggingRef]
  );

  // 处理鼠标移动，检查是否应该开始追逐
  const handleMouseMovement = useCallback(() => {
    // 如果正在追逐、正在拖动，或冷却期未结束，则不处理
    if (
      isChasingRef.current ||
      isDraggingRef.current ||
      Date.now() - lastChaseTimeRef.current < CHASE_CONSTANTS.CHASE_COOLDOWN
    ) {
      return;
    }

    // 检查鼠标速度是否足够快
    if (mouseSpeed.current > INTERACTION_CONSTANTS.FAST_MOVE_THRESHOLD) {
      // 获取最新的鼠标位置
      const mouseHistory = mousePosHistory.current;
      if (mouseHistory.length > 0) {
        const latestMousePos = mouseHistory[mouseHistory.length - 1];
        
        // 检查鼠标是否在宠物附近
        if (isMouseNearPet(latestMousePos.x, latestMousePos.y)) {
          // 计算追逐目标位置
          const targetPosition = calculateChasePosition(latestMousePos.x, latestMousePos.y);
          
          // 开始追逐动画
          startChaseAnimation(targetPosition);
        }
      }
    }
  }, [
    mouseSpeed,
    mousePosHistory,
    isDraggingRef,
    isMouseNearPet,
    calculateChasePosition,
    startChaseAnimation,
  ]);

  // 设置鼠标移动监听器
  useEffect(() => {
    const intervalId = setInterval(handleMouseMovement, 100); // 每100ms检查一次

    return () => {
      clearInterval(intervalId);
      if (chaseAnimationFrameRef.current) {
        cancelAnimationFrame(chaseAnimationFrameRef.current);
      }
    };
  }, [handleMouseMovement]);

  // 清理函数
  useEffect(() => {
    return () => {
      if (chaseAnimationFrameRef.current) {
        cancelAnimationFrame(chaseAnimationFrameRef.current);
        chaseAnimationFrameRef.current = null;
      }
    };
  }, []);

  // 返回空对象，因为我们直接使用传入的props进行状态更新
  return {};
}