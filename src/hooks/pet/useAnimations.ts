import { useState, useEffect, useRef } from 'react';
import { IdleAnimation, PetStatus } from '@/types/petTypes';
import { IDLE_ANIMATION_DURATIONS, BASE_IDLE_ANIMATIONS } from './constants';

/**
 * 宠物动画管理hook
 * 处理眨眼和空闲动画
 */
export function useAnimations(
  isLoaded: boolean,
  status: PetStatus,
  statusRef: React.MutableRefObject<PetStatus>,
  lowStatusFlags: Record<'mood' | 'cleanliness' | 'hunger' | 'energy', boolean>,
  activityLevel: 'calm' | 'normal' | 'playful' = 'normal' // 新增：活动级别参数
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

      // 根据活动级别调整眨眼频率
      const blinkDelays = {
        calm: { min: 3000, max: 15000 },     // 安静模式：眨眼较少
        normal: { min: 2000, max: 10000 },   // 正常模式：正常眨眼
        playful: { min: 1500, max: 6000 }    // 活跃模式：眨眼较频繁
      };

      const { min: minBlinkDelay, max: maxBlinkDelay } = blinkDelays[activityLevel];
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

  }, [isLoaded, lowStatusFlags.energy, lowStatusFlags.mood, currentIdleAnimation, statusRef, activityLevel]); // 添加activityLevel依赖

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

      // 根据活动级别和心情/能量调整延迟
      const baseDelays = {
        calm: { min: 15000, max: 30000 },     // 安静模式：动画很少
        normal: { min: 8000, max: 15000 },    // 正常模式：适中频率
        playful: { min: 4000, max: 10000 }    // 活跃模式：动画频繁
      };

      let { min: minDelay, max: maxDelay } = baseDelays[activityLevel];
      const currentStatus = statusRef.current;

      // 根据心情/能量进一步微调（在活动级别基础上）
      if (currentStatus.mood > 80 && currentStatus.energy > 80) { // 非常开心和精力充沛
        minDelay *= 0.8; // 减少20%延迟
        maxDelay *= 0.8;
      } else if (currentStatus.mood < 25 || currentStatus.energy < 25) { // 非常悲伤或疲倦
        minDelay *= 1.5; // 增加50%延迟
        maxDelay *= 1.5;
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
        // 丰富的动画池，根据宠物状态选择合适的动画
        const happyAnimations = [
          'idle-wiggle-animation',
          'idle-happy-jump',      // 开心跳跃
          'idle-spin-animation',  // 开心旋转
          'idle-bounce-animation' // 开心弹跳
        ];
        const tiredAnimations = [
          'stretch-animation',     // 疲倦伸展
          'idle-yawn',           // 打哈欠
          'idle-sleep-animation', // 困倦睡觉
          'idle-rest-animation'   // 休息
        ];
        const neutralAnimations = [
          'stretch-animation',
          'idle-wiggle-animation',
          'blink-animation',       // 眨眼
          'idle-look-around'      // 环顾四周
        ];

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

  }, [isLoaded, status.energy, status.mood, lowStatusFlags.energy, lowStatusFlags.mood, isBlinking, status.unlockedIdleAnimations, statusRef, activityLevel]); // 添加activityLevel依赖

  return {
    isBlinking,
    currentIdleAnimation
  };
}