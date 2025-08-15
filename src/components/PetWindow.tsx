import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'; // Add useCallback and useMemo
import { PetType } from '../types/petTypes';
import { PET_TYPES } from '../constants/petConstants';
import { useSharedPetStatus } from '../context/PetStatusContext'; // Import context hook
import usePetAnimation from '../hooks/pet/usePetAnimation'; // Corrected import path
import useSettings from '../hooks/settings/useSettings'; // Import settings hook
import usePetInteraction from '../hooks/interaction'; // Corrected import path
import useAutonomousMovement from '../hooks/pet/useAutonomousMovement'; // Corrected import path
import useMouseChasing from '../hooks/interaction/useMouseChasing'; // 导入鼠标追逐钩子
import useReactionAnimations from '../hooks/interaction/useReactionAnimations'; // 直接导入反应动画钩子
import { useInteractionFeedback } from '../hooks/interaction/useInteractionFeedback'; // 导入交互反馈hook
import { useSmoothMovement } from '../hooks/animation/useSmoothMovement'; // 导入平滑移动hook
import { useHapticFeedback } from '../hooks/interaction/useHapticFeedback'; // 导入触觉反馈hook
import InteractionPanel from './InteractionPanel'; // Import the new panel component
import PetModel from './Pet/PetModel'; // Import the new PetModel component
import PetBubble from './Pet/PetBubble'; // Import the new PetBubble component
import PetStatusBar from './Pet/PetStatusBar'; // Import the new PetStatusBar component
import PetContextMenu from './Pet/PetContextMenu'; // Import the new PetContextMenu component
import HapticFeedbackTest from './HapticFeedbackTest'; // Import the test component
import { useBubbleService } from '../services/bubble/BubbleContext'; // Corrected import path for bubble service hook
import { usePerformanceMonitor } from '../hooks/core/usePerformanceMonitor'; // Import performance monitor
import { useErrorHandler } from './ErrorBoundary'; // Import error handler
import { useWindowEffects } from '../hooks/core/useWindowEffects'; // Import window effects hook
import { PERFORMANCE_CONFIG, isPerformanceMonitoringEnabled, isHapticFeedbackEnabled } from '../config/performanceConfig'; // Import performance config
import { autoRunDragTests } from '../utils/dragTestHelper'; // Import drag test helper
import { useImagePreloader } from '../hooks/useImagePreloader'; // Import image preloader
import '../utils/manualDragTest'; // Import manual drag test tool
import '../utils/firstClickTestHelper'; // Import first click test tool
import '../utils/windowEffectsTestHelper'; // Import window effects test tool
import '../styles/PetWindow.css';
import '../styles/InteractionEnhancements.css'; // 导入交互增强样式

const PetWindow: React.FC = () => {
  // 性能监控和错误处理
  const { captureError } = useErrorHandler();
  usePerformanceMonitor('PetWindow', isPerformanceMonitoringEnabled());

  // 开发环境调试信息
  if (process.env.NODE_ENV === 'development') {
    // console.debug('PetWindow: 组件渲染开始');

    // 检查配置是否正确加载
    if (!PERFORMANCE_CONFIG || !PERFORMANCE_CONFIG.INTERACTION) {
      console.error('PetWindow: PERFORMANCE_CONFIG 未正确加载');
    }
  }

  // Use shared context hook to manage status
  const {
    status,
    setStatus,
    lowStatusFlags,
    newlyUnlocked,
    clearNewlyUnlocked,
    isLoaded, // Get status and functions from context
    isBlinking, // Get blinking state from context
    currentIdleAnimation, // Get current idle animation state from context
    currentPetTypeId, // Get current pet type ID from context
    initialPosition, // Get the loaded initial position
    interact // Get the interact function from context
  } = useSharedPetStatus();
  const { showBubble } = useBubbleService(); // Get bubble service function

  // 获取设置
  const { settings } = useSettings();

  // 图像预加载 (性能优化)
  const imagePreloader = useImagePreloader(currentPetTypeId);

  // 触觉反馈 (直接使用配置，避免useMemo问题)
  const hapticFeedback = useHapticFeedback({
    enabled: isHapticFeedbackEnabled(),
    cooldownMs: PERFORMANCE_CONFIG.INTERACTION.HAPTIC_COOLDOWN
  });

  // 窗口特效管理
  const windowEffects = useWindowEffects();

  // 交互反馈 (直接使用配置，避免useMemo问题)
  const interactionFeedbackResult = useInteractionFeedback({
    hoverDelay: PERFORMANCE_CONFIG.INTERACTION.HOVER_DELAY,
    clickFeedbackDuration: PERFORMANCE_CONFIG.INTERACTION.CLICK_FEEDBACK_DURATION,
    enableHapticFeedback: false, // 通过专门的hapticFeedback处理
    enableSoundFeedback: false,
    smoothTransitions: true
  });

  const {
    interactionState,
    handlers: feedbackHandlers,
    getInteractionStyles
  } = interactionFeedbackResult;

  // 使用交互状态中的悬停状态
  const isHovering = interactionState.isHovering;

  // 气泡位置引用
  const bubblePositionRef = useRef<{top: number, left: number}>({top: -55, left: 35}); // Adjusted bubble position

  const {
    currentAnimation,
    setCurrentAnimation,
    statusChangeAnimation,
    // setStatusChangeAnimation, // Not used directly in rendering logic below
    levelUpAnimation,
    // setLevelUpAnimation // Not used directly in rendering logic below
  } = usePetAnimation();

  // --- Interaction Hook (Called unconditionally) ---
  // Define showThoughtBubble BEFORE passing it to the hook
  const interactionHookResult = usePetInteraction({
    status,
    setStatus,
    setCurrentAnimation,
    initialPosition,
    interact,
    // showNotification, // Removed - Will be handled by BubbleService
    // showThoughtBubble // Removed - Will be handled by BubbleService
  });

  const {
    handleMouseDown,
    handleMouseEnter: originalHandleMouseEnter,
    handleMouseLeave: originalHandleMouseLeave,
    handleContextMenu,
    handleAction,
    petPosition,
    menuPosition,
    showMenu,
    menuRef,
    petRef,
    mouseDirection, // Get mouse direction
    isDragging, // Renamed from isCurrentlyDragging
    reactionAnimation, // Get reaction animation state
    setPetPosition, // Get the position setter
    enableGlobalEyeTracking // Destructure the eye tracking state
  } = interactionHookResult;
  // State for pet dimensions
  const [petDimensions, setPetDimensions] = useState({ width: 80, height: 80 }); // Default size

  // 首次交互保护状态 - 修复首次点击隐藏问题
  const [hasInteracted, setHasInteracted] = useState(false);

  // Effect to get pet dimensions after mount/update
  useEffect(() => {
    if (petRef.current) {
      const rect = petRef.current.getBoundingClientRect();
      // Check if dimensions are valid before setting state
      if (rect.width > 0 && rect.height > 0) {
           setPetDimensions({ width: rect.width, height: rect.height });
      } else {
          // Fallback or retry logic if dimensions are zero initially
          // For now, just log a warning
          console.warn("Pet dimensions are zero initially. Using default.");
      }
    }
  }, [petRef]); // Re-run if petRef changes (though unlikely)

  // Get screen dimensions (consider resize events for dynamic updates)
  const [windowDimensions, setWindowDimensions] = useState({ width: window.innerWidth, height: window.innerHeight }); // Renamed state
useEffect(() => {
    const handleResize = () => {
        setWindowDimensions({ width: window.innerWidth, height: window.innerHeight }); // Use renamed setter
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
}, []);

// 当窗口大小改变时，确保宠物不会超出屏幕边界
useEffect(() => {
    // 获取宠物元素尺寸
    if (petRef.current) {
        const rect = petRef.current.getBoundingClientRect();
        const petWidth = rect.width;
        const petHeight = rect.height;

        // 设置边界，包含边缘填充
        const EDGE_PADDING = 20;
        const minX = EDGE_PADDING;
        const maxX = windowDimensions.width - petWidth - EDGE_PADDING;
        const minY = EDGE_PADDING;
        const maxY = windowDimensions.height - petHeight - EDGE_PADDING;

        // 检查当前位置是否超出边界并调整
        if (petPosition.x < minX || petPosition.x > maxX ||
            petPosition.y < minY || petPosition.y > maxY) {

            // 限制位置在屏幕内
            const clampedX = Math.max(minX, Math.min(petPosition.x, maxX));
            const clampedY = Math.max(minY, Math.min(petPosition.y, maxY));

            // 只有在位置真正改变时才更新，避免无限循环
            if (clampedX !== petPosition.x || clampedY !== petPosition.y) {
                setPetPosition({ x: clampedX, y: clampedY });
            }
        }
    }
}, [windowDimensions]); // 移除petPosition和setPetPosition依赖，避免无限循环



  // 创建正确的ref来管理拖拽状态
  const isDraggingRef = useRef(isDragging);
  const isMouseOverPetRef = useRef(false);

  // 更新ref值
  useEffect(() => {
    isDraggingRef.current = isDragging;
  }, [isDragging]);

  // 使用useReactionAnimations获取鼠标相关引用和反应动画
  const {
    mouseSpeed,
    mousePosHistory,
    reactionAnimation: reactionAnimationFromHook
  } = useReactionAnimations({
    petRef,
    isMouseOverPet: isMouseOverPetRef,
    isDraggingRef,
    setCurrentAnimation,
  });

  // 平滑移动系统 (仅用于自主移动，不影响拖拽)
  const smoothMovement = useSmoothMovement(
    petPosition, // 使用当前petPosition作为初始位置
    {
      friction: 0.88,
      springStrength: 0.12,
      maxSpeed: 600,
      enableInertia: true,
      enableBounce: true,
      bounceStrength: 0.4
    }
  );

  // 使用ref来存储上一次的位置，避免不必要的同步
  const lastSyncedPositionRef = useRef(petPosition);

  // 同步拖拽位置到平滑移动系统
  useEffect(() => {
    if (!isDragging) {
      // 检查位置是否真的改变了
      const positionChanged =
        Math.abs(petPosition.x - lastSyncedPositionRef.current.x) > 0.1 ||
        Math.abs(petPosition.y - lastSyncedPositionRef.current.y) > 0.1;

      if (positionChanged) {
        // 只有在不拖拽时且位置真正改变时才同步位置到平滑移动系统
        smoothMovement.setTargetPosition(petPosition, true); // 立即设置，不使用动画
        lastSyncedPositionRef.current = petPosition;
      }
    }
  }, [petPosition, isDragging]); // 移除smoothMovement依赖

  // 使用ref来避免依赖smoothMovement.position导致的循环
  const smoothMovementRef = useRef(smoothMovement);
  smoothMovementRef.current = smoothMovement;

  // 同步平滑移动位置到petPosition (仅在非拖拽状态)
  useEffect(() => {
    if (!isDragging && smoothMovement.isMoving) {
      // 当平滑移动系统在移动且不在拖拽时，更新petPosition
      const updatePosition = () => {
        const currentSmoothMovement = smoothMovementRef.current;
        if (!isDragging && currentSmoothMovement.isMoving) {
          // 检查位置是否真的改变了
          const positionChanged =
            Math.abs(currentSmoothMovement.position.x - petPosition.x) > 0.1 ||
            Math.abs(currentSmoothMovement.position.y - petPosition.y) > 0.1;

          if (positionChanged) {
            setPetPosition(currentSmoothMovement.position);
          }
        }
      };

      const animationFrame = requestAnimationFrame(updatePosition);
      return () => cancelAnimationFrame(animationFrame);
    }
  }, [smoothMovement.isMoving, isDragging, setPetPosition]); // 移除smoothMovement.position依赖

  // 初始化鼠标穿透状态 - 修复首次点击隐藏问题
  useEffect(() => {
    if (isLoaded && window.desktopPet?.setMousePassthrough) {
      // 确保初始状态为非穿透，允许用户交互
      window.desktopPet.setMousePassthrough(false);
      console.log('[PetWindow] 初始化鼠标穿透状态: false');
    }
  }, [isLoaded]);

  // 开发环境拖拽测试
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && isLoaded) {
      autoRunDragTests();
    }
  }, [isLoaded]);

  // 更新边界
  useEffect(() => {
    smoothMovement.updateBoundaries({
      minX: 40,
      maxX: windowDimensions.width - 40,
      minY: 40,
      maxY: windowDimensions.height - 40
    });
  }, [windowDimensions, smoothMovement]);

  // 创建智能的位置设置函数
  const smartSetPosition = useCallback((newPosition: any) => {
    if (isDragging) {
      // 拖拽时直接设置位置
      if (typeof newPosition === 'function') {
        setPetPosition(newPosition);
      } else {
        setPetPosition(newPosition);
      }
    } else {
      // 非拖拽时使用平滑移动
      if (typeof newPosition === 'function') {
        const currentPos = petPosition;
        const result = newPosition(currentPos);
        smoothMovement.setTargetPosition(result);
      } else {
        smoothMovement.setTargetPosition(newPosition);
      }
    }
  }, [isDragging, setPetPosition, petPosition, smoothMovement]);

  // Initialize autonomous movement hook (使用智能位置设置)
  useAutonomousMovement({
    petPosition: petPosition, // 使用原始位置
    setPetPosition: smartSetPosition, // 使用智能位置设置函数
    setCurrentAnimation,
    isDragging,
    showMenu,
    windowWidth: windowDimensions.width,  // Pass window width
    windowHeight: windowDimensions.height, // Pass window height
    petWidth: petDimensions.width,
    petHeight: petDimensions.height,
    activityLevel: settings.activityLevel, // 传递活动级别设置
  });

  // 初始化鼠标追逐hook
  useMouseChasing({
    petRef,
    petPosition: petPosition, // 使用原始位置
    setPetPosition: smartSetPosition, // 使用智能位置设置函数
    mouseSpeed,
    mousePosHistory,
    isDraggingRef,
    setCurrentAnimation,
    windowWidth: windowDimensions.width,
    windowHeight: windowDimensions.height,
  });

  // Find the PetType object based on the ID from context, fallback to default
  const currentPetType: PetType = PET_TYPES[currentPetTypeId] || PET_TYPES['default'];

  // 使用来自useReactionAnimations的反应动画，而不是来自usePetInteraction的
  const finalReactionAnimation = reactionAnimationFromHook || reactionAnimation;

  // --- Expression selection logic (优化为useMemo) ---
  const expressionConfig = useMemo(() => {
    // Priority: Interaction or status change animations
    if (currentAnimation) {
      return currentPetType.expressions['happy'] || currentPetType.expressions['normal']; // Temporary happy during animation
    }
    if (statusChangeAnimation) {
      return currentPetType.expressions['normal']; // Normal during status change animation
    }

    // Priority 3: Eye tracking (only when global tracking is enabled and no other animation is overriding)
    if (enableGlobalEyeTracking && mouseDirection !== 'center') {
      const lookExpressionKey = `look_${mouseDirection.replace('-', '_')}`;
      if (currentPetType.expressions[lookExpressionKey]) {
        return currentPetType.expressions[lookExpressionKey];
      }
    }

    // Priority 4: Status-based expressions
    if (status.mood > 80 && currentPetType.expressions['happy']) return currentPetType.expressions['happy'];
    if (status.mood < 20 && currentPetType.expressions['sad']) return currentPetType.expressions['sad'];
    if (lowStatusFlags.energy && currentPetType.expressions['sleepy']) return currentPetType.expressions['sleepy'];

    // Random high-level expressions (adjust probability)
    if (status.mood > 70) {
      const rand = Math.random();
      if (status.level >= 15 && rand > 0.85 && currentPetType.expressions['level15']) return currentPetType.expressions['level15'];
      if (status.level >= 10 && rand > 0.75 && currentPetType.expressions['level10']) return currentPetType.expressions['level10'];
      if (status.level >= 5 && rand > 0.65 && currentPetType.expressions['level5']) return currentPetType.expressions['level5'];
    }

    // Default to normal if no special animation chosen or available
    return currentPetType.expressions['normal'];
  }, [currentAnimation, statusChangeAnimation, enableGlobalEyeTracking, mouseDirection, currentPetType, status.mood, status.level, lowStatusFlags.energy]);

  // 动画优先级管理函数 (优化为useMemo)
  const animationClasses = useMemo((): string => {
    if (currentAnimation) return currentAnimation;
    if (statusChangeAnimation) return statusChangeAnimation;
    if (finalReactionAnimation) return finalReactionAnimation;

    let baseClasses = '';
    if (isBlinking) baseClasses += ` blink-animation`;
    if (currentIdleAnimation && !isBlinking) baseClasses += ` ${currentIdleAnimation}`;

    return baseClasses.trim();
  }, [currentAnimation, statusChangeAnimation, finalReactionAnimation, isBlinking, currentIdleAnimation]);

  // --- Unlock Notification Effect ---
  useEffect(() => {
    if (newlyUnlocked.length > 0) {
      const unlockMsg = `新解锁: ${newlyUnlocked.join(', ')}!`;
      showBubble(unlockMsg, 'unlock', 5000);
      clearNewlyUnlocked();
    }
  }, [newlyUnlocked, clearNewlyUnlocked, showBubble]);

  // --- Enhanced Mouse Handlers (集成交互反馈，优化触觉反馈) ---
  const wrappedHandleMouseEnter = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    try {
      // 首次交互保护 - 修复首次点击隐藏问题
      if (!hasInteracted) {
        setHasInteracted(true);
        // 确保首次交互时鼠标穿透状态正确
        if (window.desktopPet?.setMousePassthrough) {
          window.desktopPet.setMousePassthrough(false);
          console.log('[PetWindow] 首次交互，确保穿透状态: false');
        }
      }

      originalHandleMouseEnter(e);
      feedbackHandlers.onMouseEnter(e);
      // 更新isMouseOverPetRef
      isMouseOverPetRef.current = true;
      // 记录用户交互
      hapticFeedback.recordUserInteraction();
    } catch (error) {
      captureError(error as Error);
    }
  }, [originalHandleMouseEnter, feedbackHandlers, hapticFeedback, captureError, hasInteracted]);

  const wrappedHandleMouseLeave = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    try {
      originalHandleMouseLeave(e);
      feedbackHandlers.onMouseLeave(e);
      // 更新isMouseOverPetRef
      isMouseOverPetRef.current = false;
    } catch (error) {
      captureError(error as Error);
    }
  }, [originalHandleMouseLeave, feedbackHandlers, captureError]);

  // 增强的鼠标按下处理
  const enhancedHandleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    try {
      // 首次交互保护 - 修复首次点击隐藏问题
      if (!hasInteracted) {
        setHasInteracted(true);
        // 确保首次点击时鼠标穿透状态正确
        if (window.desktopPet?.setMousePassthrough) {
          window.desktopPet.setMousePassthrough(false);
          console.log('[PetWindow] 首次点击，确保穿透状态: false');
        }
      }

      // 首先记录用户交互（这会自动激活触觉反馈）
      hapticFeedback.recordUserInteraction();

      // 执行原有的处理逻辑
      handleMouseDown(e);
      feedbackHandlers.onMouseDown(e);

      // 触发丝滑置顶效果（仅在左键点击时）
      if (e.button === 0 && windowEffects.config?.enabled) {
        console.log('[PetWindow] 触发丝滑置顶效果');
        windowEffects.smoothBringToTop().catch(error => {
          console.warn('[PetWindow] 丝滑置顶失败:', error);
        });
      }

      // 提供触觉反馈（现在应该可以正常工作）
      if (interactionState.interactionIntensity > 0.5) {
        hapticFeedback.patterns.click();
      } else {
        hapticFeedback.patterns.tap();
      }
    } catch (error) {
      captureError(error as Error);
    }
  }, [handleMouseDown, feedbackHandlers, interactionState.interactionIntensity, hapticFeedback, captureError, hasInteracted]);

  // 增强的鼠标移动处理 (结合拖拽和交互反馈)
  const enhancedHandleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    try {
      // 记录用户交互（移动也算交互）
      hapticFeedback.recordUserInteraction();

      // 交互反馈处理
      feedbackHandlers.onMouseMove(e);
      // 注意：拖拽的鼠标移动由全局事件监听器处理，不需要在这里处理
    } catch (error) {
      captureError(error as Error);
    }
  }, [feedbackHandlers, hapticFeedback, captureError]);

  // 增强的鼠标抬起处理 (结合拖拽和交互反馈)
  const enhancedHandleMouseUp = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    try {
      // 记录用户交互
      hapticFeedback.recordUserInteraction();

      // 交互反馈处理
      feedbackHandlers.onMouseUp(e);
      // 注意：拖拽的鼠标抬起由全局事件监听器处理，不需要在这里处理
    } catch (error) {
      captureError(error as Error);
    }
  }, [feedbackHandlers, hapticFeedback, captureError]);

  // --- Loading State Check (AFTER all hooks) ---
  if (!isLoaded) {
      return <div className="loading-placeholder">加载中...</div>;
  }
  return (
    <div
      className="pet-container"
      onMouseEnter={wrappedHandleMouseEnter}
      onMouseLeave={wrappedHandleMouseLeave}
    >
      {/* Pet Element */}
      <div
        className={`pet ${animationClasses}`}
        ref={petRef}
        onMouseDown={enhancedHandleMouseDown}
        onMouseMove={enhancedHandleMouseMove}
        onMouseUp={enhancedHandleMouseUp}
        onContextMenu={handleContextMenu}
        style={{
          // 先获取基础样式，但排除transform
          ...(() => {
            const styles = getInteractionStyles('translate(-50%, -50%)');
            // 移除可能冲突的transition，使用我们自己的
            const { transition, ...restStyles } = styles;
            return restStyles;
          })(),
          position: 'absolute',
          left: `${petPosition.x}px`, // 使用原始的petPosition而不是smoothMovement
          top: `${petPosition.y}px`,
          // transform已经在getInteractionStyles中正确组合了
          willChange: isDragging ? 'transform' : 'auto', // 拖拽时优化性能
          transition: isDragging ? 'none' : 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)' // 与交互反馈保持一致
        }}
      >
        <div
          className="pet-body"
          style={currentPetType.modelType === 'emoji' ? {
            backgroundColor: currentPetType.color,
            borderColor: currentPetType.borderColor,
          } : {
            backgroundColor: 'transparent',
            borderColor: 'transparent',
          }}
        >
          <PetModel petType={currentPetType} expression={expressionConfig} />
        </div>
        
        <PetBubble bubblePositionRef={bubblePositionRef} />

        {/* Wrapper for UI elements that follow the pet */}
        <div className="pet-ui-container">
            <PetStatusBar status={status} lowStatusFlags={lowStatusFlags} isHovering={isHovering} />
            <InteractionPanel
              onInteraction={handleAction}
              style={{
                opacity: isHovering ? 1 : 0,
                transform: isHovering ? 'translateY(0)' : 'translateY(10px)'
              }}
            />
        </div>
      </div>

      {/* Context Menu is positioned globally, so it stays outside the pet div */}
      <PetContextMenu
        showMenu={showMenu}
        menuPosition={menuPosition}
        menuRef={menuRef}
        handleAction={handleAction}
      />

      {/* Level Up Animation */}
      {levelUpAnimation && (
        <div className="level-up-animation">
          升级! {status.level}
        </div>
      )}

      {/* 开发模式下显示触觉反馈测试面板 */}
      {process.env.NODE_ENV === 'development' && <HapticFeedbackTest />}
    </div>
  );
};

export default PetWindow;
