import { useState, useEffect, useRef } from 'react';

// 动画持续时间映射表（单位：毫秒）
const ANIMATION_DURATIONS: Record<string, number> = {
  // 交互动画
  'happy-animation': 600,
  'pulse-animation': 500,
  'wiggle-animation': 400,
  'shake-animation': 400,
  'fast-shake-animation': 300,
  'jump-animation': 500,
  'spin-animation': 600,
  'play-animation': 600,
  'train-animation': 700,
  'clean-animation': 600,
  'learn-animation': 700,
  'sleep-animation': 1500, // 睡眠动画可能是持续的
  'eat-animation': 500,
  
  // 拖拽动画
  'picked-up': 300,
  'landed': 400,
  
  // 状态变化动画
  'tired-animation': 600,
  'thinking-animation': 700,
  'distracted-animation': 600,
  'sick-animation': 1000,
  
  // 空闲动画 (与usePetStatus.ts中的配置保持一致)
  'blink-animation': 300,
  'stretch-animation': 800,
  'idle-wiggle-animation': 600,
  
  // 反应动画
  'tilt-head': 600,
  'look-around-fast': 400
};

export default function usePetAnimation() {
  const [currentAnimation, setCurrentAnimation] = useState<string | null>(null);
  const [statusChangeAnimation, setStatusChangeAnimation] = useState<string | null>(null);
  const [levelUpAnimation, setLevelUpAnimation] = useState<boolean>(false);
  
  // 创建两个不同的引用来分别管理不同类型的动画超时
  const statusAnimationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentAnimationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 处理状态变化动画的添加和移除
  useEffect(() => {
    if (statusChangeAnimation) {
      // 清除之前的状态动画定时器
      if (statusAnimationTimeoutRef.current) {
        clearTimeout(statusAnimationTimeoutRef.current);
      }
      
      // 获取动画持续时间，默认为500ms
      const duration = ANIMATION_DURATIONS[statusChangeAnimation] || 500;
      
      // 设置新的定时器来移除动画
      statusAnimationTimeoutRef.current = setTimeout(() => {
        setStatusChangeAnimation(null);
        statusAnimationTimeoutRef.current = null;
      }, duration);
    }

    return () => {
      if (statusAnimationTimeoutRef.current) {
        clearTimeout(statusAnimationTimeoutRef.current);
      }
    };
  }, [statusChangeAnimation]);

  // 处理当前动画（交互动画）的添加和移除
  useEffect(() => {
    if (currentAnimation) {
      // 如果当前有其他交互动画在运行，先清除它
      if (currentAnimationTimeoutRef.current) {
        clearTimeout(currentAnimationTimeoutRef.current);
      }
      
      // 获取动画持续时间，默认为600ms
      const duration = ANIMATION_DURATIONS[currentAnimation] || 600;
      
      // 设置新的定时器来移除动画，持续性动画如睡眠动画除外
      if (currentAnimation !== 'sleep-animation') {
        currentAnimationTimeoutRef.current = setTimeout(() => {
          setCurrentAnimation(null);
          currentAnimationTimeoutRef.current = null;
        }, duration);
      }
    }

    return () => {
      if (currentAnimationTimeoutRef.current) {
        clearTimeout(currentAnimationTimeoutRef.current);
      }
    };
  }, [currentAnimation]);

  return {
    currentAnimation,
    setCurrentAnimation,
    statusChangeAnimation,
    setStatusChangeAnimation,
    levelUpAnimation,
    setLevelUpAnimation
  };
}