import { useState, useRef, useCallback, useEffect } from 'react';

interface InteractionFeedbackOptions {
  hoverDelay?: number;
  clickFeedbackDuration?: number;
  dragThreshold?: number;
  enableHapticFeedback?: boolean;
  enableSoundFeedback?: boolean;
  smoothTransitions?: boolean;
}

interface InteractionState {
  isHovering: boolean;
  isPressed: boolean;
  isDragging: boolean;
  dragDistance: number;
  interactionIntensity: number; // 0-1, 交互强度
}

/**
 * 用户交互手感优化hook
 * 提供流畅的视觉反馈、触觉反馈和音效反馈
 */
export function useInteractionFeedback(options: InteractionFeedbackOptions = {}) {
  const {
    hoverDelay = 100,
    clickFeedbackDuration = 150,
    dragThreshold = 5,
    enableHapticFeedback = true,
    enableSoundFeedback = false,
    smoothTransitions = true
  } = options;

  const [interactionState, setInteractionState] = useState<InteractionState>({
    isHovering: false,
    isPressed: false,
    isDragging: false,
    dragDistance: 0,
    interactionIntensity: 0
  });

  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const leaveTimeoutRef = useRef<NodeJS.Timeout | null>(null); // 添加离开防抖
  const pressTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dragStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const lastInteractionTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);
  const isHoverStableRef = useRef<boolean>(false); // 稳定悬停状态

  // 触觉反馈 - 使用新的用户激活管理器
  const triggerHapticFeedback = useCallback((intensity: 'light' | 'medium' | 'heavy' = 'light') => {
    if (!enableHapticFeedback || !navigator.vibrate) return;

    const patterns = {
      light: [10],
      medium: [20],
      heavy: [30, 10, 30]
    };

    // 使用用户激活管理器检查状态
    const userActivationManager = require('../../services/userActivation/UserActivationManager').getUserActivationManager();
    if (!userActivationManager.canUseUserActivatedAPIs()) {
      // 静默失败，符合安全策略
      return;
    }

    try {
      navigator.vibrate(patterns[intensity]);
    } catch (error) {
      // 静默处理错误
    }
  }, [enableHapticFeedback]);

  // 音效反馈
  const triggerSoundFeedback = useCallback((type: 'hover' | 'click' | 'drag' | 'release') => {
    if (!enableSoundFeedback) return;
    
    // 这里可以播放不同的音效
    // 暂时使用Web Audio API生成简单音效
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      const frequencies = {
        hover: 800,
        click: 1000,
        drag: 600,
        release: 400
      };
      
      oscillator.frequency.setValueAtTime(frequencies[type], audioContext.currentTime);
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch (error) {
      console.warn('Audio feedback failed:', error);
    }
  }, [enableSoundFeedback]);

  // 使用ref存储当前强度值，避免闭包问题
  const currentIntensityRef = useRef(interactionState.interactionIntensity);

  // 更新ref值
  useEffect(() => {
    currentIntensityRef.current = interactionState.interactionIntensity;
  }, [interactionState.interactionIntensity]);

  // 平滑过渡动画
  const animateInteractionIntensity = useCallback((targetIntensity: number, duration: number = 200) => {
    if (!smoothTransitions) {
      setInteractionState(prev => ({ ...prev, interactionIntensity: targetIntensity }));
      currentIntensityRef.current = targetIntensity;
      return;
    }

    const startTime = Date.now();
    const startIntensity = currentIntensityRef.current; // 使用ref值而不是state
    const intensityDiff = targetIntensity - startIntensity;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // 使用缓动函数
      const easeOutCubic = 1 - Math.pow(1 - progress, 3);
      const currentIntensity = startIntensity + intensityDiff * easeOutCubic;

      setInteractionState(prev => ({ ...prev, interactionIntensity: currentIntensity }));
      currentIntensityRef.current = currentIntensity;

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        animationFrameRef.current = null;
      }
    };

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    animationFrameRef.current = requestAnimationFrame(animate);
  }, [smoothTransitions]); // 移除interactionState.interactionIntensity依赖

  // 鼠标进入处理（添加防抖机制）
  const handleMouseEnter = useCallback((_e: React.MouseEvent) => {
    // 清除可能存在的离开延迟
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }

    // 如果已经在稳定悬停状态，不需要重新处理
    if (isHoverStableRef.current) {
      return;
    }

    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }

    hoverTimeoutRef.current = setTimeout(() => {
      isHoverStableRef.current = true;
      setInteractionState(prev => ({ ...prev, isHovering: true }));
      animateInteractionIntensity(0.3);
      triggerHapticFeedback('light');
      triggerSoundFeedback('hover');
      lastInteractionTimeRef.current = Date.now();
    }, Math.max(hoverDelay, 50)); // 最小50ms防抖延迟
  }, [hoverDelay, animateInteractionIntensity, triggerHapticFeedback, triggerSoundFeedback]);

  // 鼠标离开处理（添加防抖机制）
  const handleMouseLeave = useCallback((_e: React.MouseEvent) => {
    // 清除进入延迟
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }

    // 添加离开防抖，防止因为缩放导致的快速进入/离开循环
    leaveTimeoutRef.current = setTimeout(() => {
      isHoverStableRef.current = false;
      setInteractionState(prev => ({
        ...prev,
        isHovering: false,
        isPressed: false
      }));
      animateInteractionIntensity(0);
    }, 100); // 100ms离开防抖延迟
  }, [animateInteractionIntensity]);

  // 鼠标按下处理
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // 清除所有可能的延迟，确保交互状态稳定
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }

    dragStartPosRef.current = { x: e.clientX, y: e.clientY };
    isHoverStableRef.current = true; // 确保悬停状态稳定

    setInteractionState(prev => ({
      ...prev,
      isPressed: true,
      isHovering: true // 确保悬停状态
    }));
    animateInteractionIntensity(0.7);
    triggerHapticFeedback('medium');
    triggerSoundFeedback('click');

    // 添加按压反馈超时
    if (pressTimeoutRef.current) {
      clearTimeout(pressTimeoutRef.current);
    }
    pressTimeoutRef.current = setTimeout(() => {
      setInteractionState(prev => ({ ...prev, isPressed: false }));
    }, clickFeedbackDuration);
  }, [animateInteractionIntensity, triggerHapticFeedback, triggerSoundFeedback, clickFeedbackDuration]);

  // 鼠标移动处理
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragStartPosRef.current) return;
    
    const dx = e.clientX - dragStartPosRef.current.x;
    const dy = e.clientY - dragStartPosRef.current.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > dragThreshold && !interactionState.isDragging) {
      setInteractionState(prev => ({ 
        ...prev, 
        isDragging: true,
        dragDistance: distance 
      }));
      animateInteractionIntensity(1.0);
      triggerHapticFeedback('heavy');
      triggerSoundFeedback('drag');
    } else if (interactionState.isDragging) {
      setInteractionState(prev => ({ ...prev, dragDistance: distance }));
      
      // 根据拖拽距离调整交互强度
      const intensity = Math.min(0.7 + (distance / 200) * 0.3, 1.0);
      animateInteractionIntensity(intensity);
    }
  }, [dragThreshold, interactionState.isDragging, animateInteractionIntensity, triggerHapticFeedback, triggerSoundFeedback]);

  // 鼠标抬起处理
  const handleMouseUp = useCallback((_e: React.MouseEvent) => {
    const wasDragging = interactionState.isDragging;
    const isHovering = interactionState.isHovering;

    setInteractionState(prev => ({
      ...prev,
      isPressed: false,
      isDragging: false,
      dragDistance: 0
    }));

    dragStartPosRef.current = null;
    animateInteractionIntensity(isHovering ? 0.3 : 0);

    if (wasDragging) {
      triggerHapticFeedback('light');
      triggerSoundFeedback('release');
    }

    if (pressTimeoutRef.current) {
      clearTimeout(pressTimeoutRef.current);
      pressTimeoutRef.current = null;
    }
  }, [interactionState.isDragging, interactionState.isHovering, animateInteractionIntensity, triggerHapticFeedback, triggerSoundFeedback]);

  // 清理函数
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
      if (leaveTimeoutRef.current) clearTimeout(leaveTimeoutRef.current);
      if (pressTimeoutRef.current) clearTimeout(pressTimeoutRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  // 计算视觉反馈样式
  const getInteractionStyles = useCallback((baseTransform: string = '') => {
    const { isHovering, isDragging, interactionIntensity } = interactionState;

    // 减少缩放幅度，避免边界问题
    const scale = 1 + interactionIntensity * 0.02; // 最大2%缩放，减少边界影响
    const brightness = 1 + interactionIntensity * 0.15; // 减少亮度变化
    const shadow = interactionIntensity * 8; // 减少阴影强度

    // 组合transform变换，确保与基础transform兼容
    const combinedTransform = baseTransform
      ? `${baseTransform} scale(${scale})`
      : `scale(${scale})`;

    return {
      transform: combinedTransform,
      transformOrigin: 'center center', // 确保缩放中心稳定
      filter: `brightness(${brightness})`,
      boxShadow: `0 0 ${shadow}px rgba(255, 255, 255, ${interactionIntensity * 0.4})`,
      transition: smoothTransitions ? 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)' : 'none', // 缩短过渡时间
      cursor: isDragging ? 'grabbing' : isHovering ? 'grab' : 'pointer'
    };
  }, [interactionState, smoothTransitions]);

  return {
    interactionState,
    handlers: {
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
      onMouseDown: handleMouseDown,
      onMouseMove: handleMouseMove,
      onMouseUp: handleMouseUp
    },
    getInteractionStyles,
    triggerHapticFeedback,
    triggerSoundFeedback
  };
}
