import { useState, useEffect, useRef } from 'react';
import { IdleAnimation, PetStatus } from '../../types/petTypes';
import { IDLE_ANIMATION_DURATIONS, BASE_IDLE_ANIMATIONS } from './constants';

/**
 * 宠物动画管理hook
 * 处理眨眼和空闲动画
 */
export function useAnimations(
  isLoaded: boolean,
  status: PetStatus,
  statusRef: React.MutableRefObject<PetStatus>,
  lowStatusFlags: Record<'mood' | 'cleanliness' | 'hunger' | 'energy', boolean>
) {
  // 眨眼动画状态
  const [isBlinking, setIsBlinking] = useState(false);
  const blinkTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 空闲动画状态
  const [currentIdleAnimation, setCurrentIdleAnimation] = useState<IdleAnimation | null>(null);
  const idleAnimationTimeoutRef = useRef<NodeJS.Timeout | null>(null); 
  const idleAnimationClearTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // --- 眨眼动画逻辑 ---
  useEffect(() => {
    const clearBlinkTimeout = () => {
      if (blinkTimeoutRef.current) {
        clearTimeout(blinkTimeoutRef.current);
        blinkTimeoutRef.current = null;
      }
    };

    const scheduleBlink = () => {
      clearBlinkTimeout();
      // 仅在当前没有播放其他空闲动画时安排
      if (currentIdleAnimation) {
        // 如果正在播放另一个动画，则在短暂延迟后重新安排眨眼检查
        blinkTimeoutRef.current = setTimeout(scheduleBlink, 1000);
        return;
      }

      const minBlinkDelay = 2000; // 眨眼之间的最小延迟
      const maxBlinkDelay = 10000; // 最大延迟
      const randomDelay = minBlinkDelay + Math.random() * (maxBlinkDelay - minBlinkDelay);

      blinkTimeoutRef.current = setTimeout(() => {
        // 眨眼前检查条件
        const currentStatus = statusRef.current; // 获取当前状态
        const canBlinkNow = isLoaded && currentStatus.energy > 25 && currentStatus.mood > 25 && 
                            !lowStatusFlags.energy && !lowStatusFlags.mood && !currentIdleAnimation;

        if (canBlinkNow) {
          setIsBlinking(true);
          // 动画持续时间后清除眨眼状态
          setTimeout(() => setIsBlinking(false), IDLE_ANIMATION_DURATIONS['blink-animation']);
        }
        // 总是重新安排下一次眨眼检查
        scheduleBlink();
      }, randomDelay);
    };

    // 初始安排
    scheduleBlink();

    // 卸载时清理
    return clearBlinkTimeout;

  }, [isLoaded, lowStatusFlags.energy, lowStatusFlags.mood, currentIdleAnimation, statusRef]); // 依赖项

  // --- 空闲动画逻辑 ---
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
      clearIdleAnimationTimeouts(); // 清除先前的超时

      // 根据心情/能量调整延迟
      let minDelay = 8000; // 增加默认最小延迟
      let maxDelay = 15000; // 增加默认最大延迟
      const currentStatus = statusRef.current;

      if (currentStatus.mood > 80 && currentStatus.energy > 80) { // 非常开心和精力充沛
        minDelay = 6000;
        maxDelay = 12000;
      } else if (currentStatus.mood < 25 || currentStatus.energy < 25) { // 非常悲伤或疲倦
        minDelay = 12000;
        maxDelay = 20000;
      }

      const randomDelay = minDelay + Math.random() * (maxDelay - minDelay);

      idleAnimationTimeoutRef.current = setTimeout(() => {
        // --- 状态驱动的空闲动画选择 ---
        const currentStatus = statusRef.current;
        const availableAnimations = [...BASE_IDLE_ANIMATIONS, ...(currentStatus.unlockedIdleAnimations || [])];

        if (availableAnimations.length === 0) {
          scheduleIdleAnimation(); // 如果没有可用的动画，则重新安排
          return;
        }

        const HAPPY_THRESHOLD = 70;
        const TIRED_THRESHOLD = 30;

        // 定义动画池（使用现有的基本动画作为示例）
        // TODO: 稍后添加更具体的动画（例如'idle-yawn', 'idle-happy-jump'）
        const happyAnimations = ['idle-wiggle-animation'];
        const tiredAnimations = ['stretch-animation']; // 暂时解释为疲倦的伸展/打哈欠
        const neutralAnimations = ['stretch-animation', 'idle-wiggle-animation'];

        let prioritizedPool: string[] = [];

        // 根据状态确定优先池
        if (currentStatus.energy < TIRED_THRESHOLD) {
          prioritizedPool = tiredAnimations.filter(anim => availableAnimations.includes(anim as IdleAnimation));
          console.log("Idle: 优先考虑疲倦动画");
        } else if (currentStatus.mood > HAPPY_THRESHOLD && currentStatus.energy > TIRED_THRESHOLD) { // 确保在开心时不疲倦
          prioritizedPool = happyAnimations.filter(anim => availableAnimations.includes(anim as IdleAnimation));
          console.log("Idle: 优先考虑开心动画");
        } else {
          // 包括中性心情/能量，或悲伤心情（直到添加悲伤动画）
          prioritizedPool = neutralAnimations.filter(anim => availableAnimations.includes(anim as IdleAnimation));
          console.log("Idle: 优先考虑中性动画");
        }

        let selectedAnimation: string;
        // 选择动画：优先考虑特定状态的池，回退到一般池
        if (prioritizedPool.length > 0) {
          selectedAnimation = prioritizedPool[Math.floor(Math.random() * prioritizedPool.length)];
          console.log(`Idle: 从优先池中选择: ${selectedAnimation}`);
        } else {
          // 如果当前状态没有特定的动画可用，则回退
          selectedAnimation = availableAnimations[Math.floor(Math.random() * availableAnimations.length)];
          console.log(`Idle: 从回退池中选择: ${selectedAnimation}`);
        }

        const duration = IDLE_ANIMATION_DURATIONS[selectedAnimation] || 500; // 如果未指定，则为默认持续时间

        // 仅在当前没有眨眼或做其他空闲动画时播放
        if (!isBlinking && !currentIdleAnimation) {
          setCurrentIdleAnimation(selectedAnimation as IdleAnimation);

          // 安排在其持续时间后清除动画类
          idleAnimationClearTimeoutRef.current = setTimeout(() => {
            setCurrentIdleAnimation(null);
            // 在当前动画结束后*安排下一个空闲动画
            scheduleIdleAnimation();
          }, duration);
        } else {
          // 如果正在眨眼或发生另一个空闲动画，则更快地重新安排检查
          scheduleIdleAnimation();
        }
      }, randomDelay);
    };

    // 安排前检查条件
    const canPlayIdleAnimation = isLoaded && status.energy > 30 && status.mood > 30 && 
                                 !lowStatusFlags.energy && !lowStatusFlags.mood;

    if (canPlayIdleAnimation) {
      scheduleIdleAnimation();
    } else {
      // 如果条件不满足，则清除任何现有的超时并确保动画状态为null
      clearIdleAnimationTimeouts();
      setCurrentIdleAnimation(null); // 确保动画被清除
      // 可选，安排稍后检查以查看条件是否改善
      // idleAnimationTimeoutRef.current = setTimeout(scheduleIdleAnimation, 15000); // 15秒后再次检查
    }

    // 卸载或条件变化时清理
    return clearIdleAnimationTimeouts;

  }, [isLoaded, status.energy, status.mood, lowStatusFlags.energy, lowStatusFlags.mood, isBlinking, status.unlockedIdleAnimations, statusRef]); // 添加依赖项

  return {
    isBlinking,
    currentIdleAnimation
  };
}