import { useCallback, useRef, useEffect, useState } from 'react';
import { getUserActivationManager } from '../../services/userActivation/UserActivationManager';

/*
interface HapticPattern { // Unused interface
  duration: number;
  intensity?: number;
}
*/

interface HapticFeedbackOptions {
  enabled?: boolean;
  defaultIntensity?: number;
  cooldownMs?: number; // 防止过于频繁的触觉反馈
  debugMode?: boolean; // 调试模式
  fallbackBehavior?: 'silent' | 'log' | 'warn'; // 失败时的行为
}

/**
 * 触觉反馈增强hook
 * 提供丰富的触觉反馈模式和智能频率控制
 * 符合现代浏览器的用户激活安全策略
 */
export function useHapticFeedback(options: HapticFeedbackOptions = {}) {
  const {
    enabled = true,
    defaultIntensity = 0.5,
    cooldownMs = 50,
    debugMode = false,
    fallbackBehavior = 'silent'
  } = options;

  const lastFeedbackTimeRef = useRef<number>(0);
  const isVibratingRef = useRef<boolean>(false);
  const [userActivationManager] = useState(() => getUserActivationManager({ debugMode }));
  const [canUseVibration, setCanUseVibration] = useState(false);

  // 初始化用户激活状态监听
  useEffect(() => {
    // 检查初始状态
    setCanUseVibration(userActivationManager.canUseUserActivatedAPIs());

    // 监听用户交互
    const unsubscribe = userActivationManager.onUserInteraction(() => {
      setCanUseVibration(true);
      if (debugMode) {
        console.log('[useHapticFeedback] 用户激活状态更新，触觉反馈已启用');
      }
    });

    return unsubscribe;
  }, [userActivationManager, debugMode]);

  // 检查设备是否支持触觉反馈
  const isSupported = useCallback(() => {
    return 'vibrate' in navigator && typeof navigator.vibrate === 'function';
  }, []);

  // 检查是否可以使用触觉反馈
  const canUseFeedback = useCallback(() => {
    if (!enabled || !isSupported()) {
      return false;
    }

    // 检查用户激活状态
    if (!canUseVibration) {
      if (debugMode && fallbackBehavior === 'log') {
        console.log('[useHapticFeedback] 触觉反馈被阻止：需要用户交互激活');
      } else if (fallbackBehavior === 'warn') {
        console.warn('[useHapticFeedback] 触觉反馈被阻止：需要用户交互激活');
      }
      return false;
    }

    return true;
  }, [enabled, canUseVibration, debugMode, fallbackBehavior]);

  // 记录用户交互（保持向后兼容）
  const recordUserInteraction = useCallback(() => {
    userActivationManager.recordInteraction();
  }, [userActivationManager]);

  // 基础振动函数
  const vibrate = useCallback((pattern: number | number[]) => {
    if (!canUseFeedback()) {
      return false;
    }

    const now = Date.now();
    if (now - lastFeedbackTimeRef.current < cooldownMs) {
      if (debugMode) {
        console.log('[useHapticFeedback] 触觉反馈在冷却期内，跳过');
      }
      return false; // 在冷却期内，跳过
    }

    try {
      // 使用用户激活管理器的优化振动方法
      const success = userActivationManager.tryVibrate(pattern);
      if (success) {
        lastFeedbackTimeRef.current = now;
        isVibratingRef.current = true;

        // 计算振动总时长
        const totalDuration = Array.isArray(pattern)
          ? pattern.reduce((sum, val, index) => index % 2 === 0 ? sum + val : sum, 0)
          : pattern;

        setTimeout(() => {
          isVibratingRef.current = false;
        }, totalDuration);

        if (debugMode) {
          console.log('[useHapticFeedback] 触觉反馈执行成功', { pattern, totalDuration });
        }
      }
      return success;
    } catch (error) {
      // 处理错误
      if (fallbackBehavior === 'log') {
        console.log('[useHapticFeedback] 触觉反馈执行失败:', error);
      } else if (fallbackBehavior === 'warn') {
        console.warn('[useHapticFeedback] 触觉反馈执行失败:', error);
      }
      return false;
    }
  }, [canUseFeedback, cooldownMs, debugMode, fallbackBehavior]);

  // 预定义的触觉反馈模式
  const patterns = {
    // 基础反馈
    tap: () => vibrate(10),
    doubleTap: () => vibrate([10, 50, 10]),
    longPress: () => vibrate(50),
    
    // 交互反馈
    hover: () => vibrate(5),
    click: () => vibrate(15),
    drag: () => vibrate([20, 10, 20]),
    drop: () => vibrate(30),
    
    // 状态反馈
    success: () => vibrate([100, 50, 100]),
    error: () => vibrate([200, 100, 200, 100, 200]),
    warning: () => vibrate([50, 50, 50]),
    
    // 游戏反馈
    levelUp: () => vibrate([100, 50, 100, 50, 200]),
    achievement: () => vibrate([50, 25, 50, 25, 50, 25, 100]),
    heartbeat: () => vibrate([100, 100, 100, 100, 100]),
    
    // 情感反馈
    happy: () => vibrate([50, 25, 50, 25, 100]),
    sad: () => vibrate([200, 100, 200]),
    excited: () => vibrate([25, 25, 25, 25, 25, 25, 50]),
    
    // 物理反馈
    bounce: () => vibrate([30, 20, 20, 20, 10]),
    collision: () => vibrate(80),
    spring: () => vibrate([20, 10, 15, 10, 10, 10, 5]),
    
    // 节奏反馈
    pulse: () => vibrate([100, 100, 100, 100, 100]),
    wave: () => vibrate([10, 20, 30, 40, 50, 40, 30, 20, 10]),
    crescendo: () => vibrate([10, 5, 20, 5, 30, 5, 40, 5, 50])
  };

  // 自定义强度的触觉反馈
  const feedbackWithIntensity = useCallback((
    baseDuration: number,
    intensity: number = defaultIntensity
  ) => {
    const adjustedDuration = Math.round(baseDuration * intensity);
    return vibrate(Math.max(1, adjustedDuration));
  }, [defaultIntensity, vibrate]);

  // 渐变触觉反馈
  const gradualFeedback = useCallback((
    startIntensity: number,
    endIntensity: number,
    steps: number = 5,
    stepDuration: number = 20
  ) => {
    if (!canUseFeedback()) return false;

    const pattern: number[] = [];
    const intensityStep = (endIntensity - startIntensity) / (steps - 1);

    for (let i = 0; i < steps; i++) {
      const currentIntensity = startIntensity + intensityStep * i;
      const duration = Math.round(stepDuration * currentIntensity);
      pattern.push(Math.max(1, duration));

      if (i < steps - 1) {
        pattern.push(10); // 间隔
      }
    }

    return vibrate(pattern);
  }, [canUseFeedback, vibrate]);

  // 基于速度的动态反馈
  const velocityBasedFeedback = useCallback((velocity: number, maxVelocity: number = 1000) => {
    const normalizedVelocity = Math.min(velocity / maxVelocity, 1);
    const baseDuration = 10;
    const maxDuration = 50;
    
    const duration = baseDuration + (maxDuration - baseDuration) * normalizedVelocity;
    return vibrate(Math.round(duration));
  }, [vibrate]);

  // 基于距离的反馈
  const distanceBasedFeedback = useCallback((distance: number, maxDistance: number = 100) => {
    const normalizedDistance = Math.min(distance / maxDistance, 1);
    const intensity = 1 - normalizedDistance; // 距离越近，反馈越强
    
    return feedbackWithIntensity(30, intensity);
  }, [feedbackWithIntensity]);

  // 节奏性反馈
  const rhythmicFeedback = useCallback((
    beats: number[],
    beatDuration: number = 100,
    restDuration: number = 50
  ) => {
    const pattern: number[] = [];
    
    beats.forEach((intensity, index) => {
      const duration = Math.round(beatDuration * intensity);
      pattern.push(Math.max(1, duration));
      
      if (index < beats.length - 1) {
        pattern.push(restDuration);
      }
    });
    
    return vibrate(pattern);
  }, [vibrate]);

  // 停止当前振动
  const stopFeedback = useCallback(() => {
    if (isSupported()) {
      navigator.vibrate(0);
      isVibratingRef.current = false;
    }
  }, []);

  // 获取当前状态
  const getStatus = useCallback(() => {
    const activationInfo = userActivationManager.getActivationInfo();
    return {
      isSupported: isSupported(),
      isEnabled: enabled,
      isVibrating: isVibratingRef.current,
      lastFeedbackTime: lastFeedbackTimeRef.current,
      canUseVibration,
      userActivation: activationInfo
    };
  }, [enabled, canUseVibration, userActivationManager]);

  // 测试触觉反馈
  const testFeedback = useCallback(() => {
    console.log('Testing haptic feedback...');
    const status = getStatus();
    console.log('Haptic feedback status:', status);

    if (!status.canUseVibration) {
      console.warn('触觉反馈测试失败：需要用户交互激活');
      return false;
    }

    patterns.tap();
    setTimeout(() => patterns.doubleTap(), 200);
    setTimeout(() => patterns.success(), 600);
    return true;
  }, [patterns, getStatus]);

  return {
    // 基础功能
    vibrate,
    stopFeedback,
    isSupported,
    getStatus,
    testFeedback,
    recordUserInteraction, // 保持向后兼容

    // 预定义模式
    patterns,

    // 高级功能
    feedbackWithIntensity,
    gradualFeedback,
    velocityBasedFeedback,
    distanceBasedFeedback,
    rhythmicFeedback,

    // 状态
    isVibrating: isVibratingRef.current,
    canUseVibration,
    userHasInteracted: canUseVibration, // 保持向后兼容

    // 新增：用户激活管理器访问
    userActivationManager,
    canUseFeedback
  };
}
