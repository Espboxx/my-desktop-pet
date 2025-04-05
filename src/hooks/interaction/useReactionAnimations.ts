import { useState, useRef, useCallback } from 'react';
import { MouseHistoryPoint } from './types';
import { INTERACTION_CONSTANTS } from './constants';

interface UseReactionAnimationsProps {
  petRef: React.RefObject<HTMLDivElement>;
  isMouseOverPet: React.MutableRefObject<boolean>;
  isDraggingRef: React.MutableRefObject<boolean>;
  setCurrentAnimation: (animation: string | null) => void;
}

interface UseReactionAnimationsReturn {
  reactionAnimation: string | null;
  clearReaction: () => void;
  handleReaction: (e: MouseEvent) => void;
  setupIdleAnimation: () => void;
  mousePosHistory: React.MutableRefObject<MouseHistoryPoint[]>;
  mouseSpeed: React.MutableRefObject<number>;
  hoverDetectTimeoutRef: React.MutableRefObject<NodeJS.Timeout | null>;
  reactionTimeoutRef: React.MutableRefObject<NodeJS.Timeout | null>;
  longPressTimeoutRef: React.MutableRefObject<NodeJS.Timeout | null>;
  lastClickTimeRef: React.MutableRefObject<number>;
  circleDetectionPointsRef: React.MutableRefObject<MouseHistoryPoint[]>;
  petDetectionPointsRef: React.MutableRefObject<MouseHistoryPoint[]>;
  lastInteractionTimeRef: React.MutableRefObject<number>;
}

export default function useReactionAnimations({
  petRef,
  isMouseOverPet,
  isDraggingRef,
  setCurrentAnimation,
}: UseReactionAnimationsProps): UseReactionAnimationsReturn {
  const [reactionAnimation, setReactionAnimation] = useState<string | null>(null);
  
  // 各种动画和交互引用
  const mousePosHistory = useRef<MouseHistoryPoint[]>([]);
  const mouseSpeed = useRef<number>(0);
  const reactionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hoverDetectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastClickTimeRef = useRef<number>(0);
  const longPressTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const circleDetectionPointsRef = useRef<MouseHistoryPoint[]>([]);
  const petDetectionPointsRef = useRef<MouseHistoryPoint[]>([]);
  const lastInteractionTimeRef = useRef<number>(Date.now());
  const idleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // 引用常量
  const {
    FAST_MOVE_THRESHOLD,
    HOVER_DETECT_DURATION,
    REACTION_ANIMATION_DURATION,
    FAST_REACTION_ANIMATION_DURATION,
    PET_DETECTION_DURATION,
    CIRCLE_DETECTION_DURATION,
    IDLE_ANIMATION_DELAY,
  } = INTERACTION_CONSTANTS;

  // 清理所有动画反应状态
  const clearReaction = useCallback(() => {
    if (reactionTimeoutRef.current) {
      clearTimeout(reactionTimeoutRef.current);
      reactionTimeoutRef.current = null;
    }
    if (hoverDetectTimeoutRef.current) {
      clearTimeout(hoverDetectTimeoutRef.current);
      hoverDetectTimeoutRef.current = null;
    }
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
    if (idleTimeoutRef.current) {
      clearTimeout(idleTimeoutRef.current);
      idleTimeoutRef.current = null;
    }
    setReactionAnimation(null);
    mousePosHistory.current = []; // 重置历史
    mouseSpeed.current = 0; // 重置速度
  }, []);

  // 检测圆形运动的辅助函数
  const detectCircularMotion = useCallback((points: MouseHistoryPoint[], petElement: HTMLDivElement | null) => {
    if (!petElement) return { isCircle: false, isClockwise: false };
    
    // 获取宠物元素的中心点
    const petRect = petElement.getBoundingClientRect();
    const petCenterX = petRect.left + petRect.width / 2;
    const petCenterY = petRect.top + petRect.height / 2;
    
    // 计算各点相对于宠物中心的角度
    const angles = points.map(point => {
      const dx = point.x - petCenterX;
      const dy = point.y - petCenterY;
      return Math.atan2(dy, dx);
    });
    
    // 计算角度变化
    let totalAngleChange = 0;
    for (let i = 1; i < angles.length; i++) {
      let change = angles[i] - angles[i-1];
      
      // 处理角度跨越 -π 到 π 的边界
      if (change > Math.PI) change -= 2 * Math.PI;
      else if (change < -Math.PI) change += 2 * Math.PI;
      
      totalAngleChange += change;
    }
    
    // 检查是否形成了至少3/4圆
    const isCircle = Math.abs(totalAngleChange) > Math.PI * 1.5;
    const isClockwise = totalAngleChange < 0;
    
    return { isCircle, isClockwise };
  }, []);

  // 处理鼠标悬停进入
  const handleMouseEnterReaction = useCallback(() => {
    clearReaction(); // 清除之前的反应状态
    
    // 开始悬停检测
    hoverDetectTimeoutRef.current = setTimeout(() => {
      // 只有在鼠标仍然悬停，没有拖动，速度较低且没有其他反应时才触发倾斜头部
      if (isMouseOverPet.current && !isDraggingRef.current && mouseSpeed.current < FAST_MOVE_THRESHOLD / 3 && !reactionAnimation) {
        setReactionAnimation('tilt-head');
        // 清除之前的反应计时器
        if (reactionTimeoutRef.current) clearTimeout(reactionTimeoutRef.current);
        reactionTimeoutRef.current = setTimeout(clearReaction, REACTION_ANIMATION_DURATION);
      }
      hoverDetectTimeoutRef.current = null; // 计时器结束
    }, HOVER_DETECT_DURATION);
  }, [FAST_MOVE_THRESHOLD, HOVER_DETECT_DURATION, REACTION_ANIMATION_DURATION, clearReaction, isDraggingRef, isMouseOverPet, reactionAnimation]);

  // 处理反应
  const handleReaction = useCallback((e: MouseEvent) => {
    // 更新最后交互时间
    lastInteractionTimeRef.current = Date.now();
    
    if (!isMouseOverPet.current || isDraggingRef.current) {
      return; // 如果不在宠物上或正在拖动，不处理反应
    }
    
    const now = Date.now();
    const currentPos = { x: e.clientX, y: e.clientY, time: now };
    
    // --- 处理快速移动反应 & 鼠标历史 ---
    mousePosHistory.current.push(currentPos);
    // 保持历史短（最后100ms内的点）
    mousePosHistory.current = mousePosHistory.current.filter(p => now - p.time < 100);
    
    // --- 处理抚摸检测 ---
    petDetectionPointsRef.current.push(currentPos);
    petDetectionPointsRef.current = petDetectionPointsRef.current.filter(p => now - p.time < PET_DETECTION_DURATION);
    
    // 如果有足够的点，检查是否为抚摸动作（慢速、连续移动）
    if (petDetectionPointsRef.current.length >= 5 && !reactionAnimation) {
      const petPoints = petDetectionPointsRef.current;
      let totalDistance = 0;
      let isSlowMovement = true;
      
      for (let i = 1; i < petPoints.length; i++) {
        const prev = petPoints[i-1];
        const curr = petPoints[i];
        const dx = curr.x - prev.x;
        const dy = curr.y - prev.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const dt = (curr.time - prev.time) / 1000;
        
        totalDistance += dist;
        
        // 检查速度是否足够慢（低于阈值1/3）
        if (dt > 0 && dist/dt > FAST_MOVE_THRESHOLD/3) {
          isSlowMovement = false;
          break;
        }
      }
      
      // 如果是慢速连续移动且总距离适中
      if (isSlowMovement && totalDistance > 50 && totalDistance < 300) {
        setReactionAnimation('being-pet-animation');
        petDetectionPointsRef.current = []; // 重置检测点
        
        // 设置动画自动结束
        if (reactionTimeoutRef.current) clearTimeout(reactionTimeoutRef.current);
        reactionTimeoutRef.current = setTimeout(clearReaction, REACTION_ANIMATION_DURATION);
      }
    }
    
    // --- 处理画圈检测 ---
    circleDetectionPointsRef.current.push(currentPos);
    // 只保留最近的点用于检测
    circleDetectionPointsRef.current = circleDetectionPointsRef.current.filter(p => now - p.time < CIRCLE_DETECTION_DURATION);
    
    // 如果有足够的点，检查是否围绕宠物画圈
    if (circleDetectionPointsRef.current.length >= 8 && !reactionAnimation) {
      // 检查是否形成了一个圆形路径
      const result = detectCircularMotion(circleDetectionPointsRef.current, petRef.current);
      if (result.isCircle) {
        setReactionAnimation(result.isClockwise ? 'circle-clockwise-animation' : 'circle-counterclockwise-animation');
        circleDetectionPointsRef.current = []; // 重置检测点
        
        // 设置动画自动结束
        if (reactionTimeoutRef.current) clearTimeout(reactionTimeoutRef.current);
        reactionTimeoutRef.current = setTimeout(clearReaction, REACTION_ANIMATION_DURATION * 1.5);
      }
    }

    // 处理鼠标速度和快速移动反应
    let isReactingFast = false;

    if (mousePosHistory.current.length > 1) {
      const firstPos = mousePosHistory.current[0];
      const lastPos = mousePosHistory.current[mousePosHistory.current.length - 1];
      const dx = lastPos.x - firstPos.x;
      const dy = lastPos.y - firstPos.y;
      const dt = (lastPos.time - firstPos.time) / 1000; // 秒
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (dt > 0.01) { // 避免除以零并确保经过了足够的时间
        mouseSpeed.current = distance / dt; // 像素每秒

        if (mouseSpeed.current > FAST_MOVE_THRESHOLD && !reactionAnimation) {
          isReactingFast = true; // 设置标志
          // 如果快速移动则清除悬停检测
          if (hoverDetectTimeoutRef.current) {
            clearTimeout(hoverDetectTimeoutRef.current);
            hoverDetectTimeoutRef.current = null;
          }
          // 设置快速反应动画
          setReactionAnimation('look-around-fast');
          // 清除之前的反应超时
          if (reactionTimeoutRef.current) clearTimeout(reactionTimeoutRef.current);
          // 设置新的超时来清除此快速反应
          reactionTimeoutRef.current = setTimeout(clearReaction, FAST_REACTION_ANIMATION_DURATION);
        }
      } else {
        mouseSpeed.current = 0;
      }
    } else {
      mouseSpeed.current = 0;
    }

    // 如果鼠标移动明显（即使不够快到触发反应），则清除悬停检测超时
    if (mouseSpeed.current > 50 && hoverDetectTimeoutRef.current) {
      clearTimeout(hoverDetectTimeoutRef.current);
      hoverDetectTimeoutRef.current = null;
    }
  }, [CIRCLE_DETECTION_DURATION, FAST_MOVE_THRESHOLD, FAST_REACTION_ANIMATION_DURATION, PET_DETECTION_DURATION, REACTION_ANIMATION_DURATION, clearReaction, detectCircularMotion, isDraggingRef, isMouseOverPet, petRef, reactionAnimation]);

  // 设置闲置动画检测
  const setupIdleAnimation = useCallback(() => {
    // 清除已有的闲置检测
    if (idleTimeoutRef.current) {
      clearTimeout(idleTimeoutRef.current);
    }
    
    // 设置新的闲置检测
    idleTimeoutRef.current = setTimeout(() => {
      // 只有在未处于活跃状态时才显示闲置动画
      if (!reactionAnimation && !isDraggingRef.current) {
        const idleAnimations = ['idle-yawn', 'idle-stretch', 'idle-lookAround', 'idle-scratch'];
        const randomIdle = idleAnimations[Math.floor(Math.random() * idleAnimations.length)];
        setReactionAnimation(randomIdle);
        
        // 设置动画结束后自动清理
        reactionTimeoutRef.current = setTimeout(() => {
          clearReaction();
          // 继续检测闲置
          setupIdleAnimation();
        }, REACTION_ANIMATION_DURATION * 1.5);
      } else {
        // 如果当前有其他活动，稍后再检查
        setupIdleAnimation();
      }
    }, IDLE_ANIMATION_DELAY);
  }, [IDLE_ANIMATION_DELAY, REACTION_ANIMATION_DURATION, clearReaction, isDraggingRef, reactionAnimation]);

  return {
    reactionAnimation,
    clearReaction,
    handleReaction,
    setupIdleAnimation,
    mousePosHistory,
    mouseSpeed,
    hoverDetectTimeoutRef,
    reactionTimeoutRef,
    longPressTimeoutRef,
    lastClickTimeRef,
    circleDetectionPointsRef,
    petDetectionPointsRef,
    lastInteractionTimeRef,
  };
}