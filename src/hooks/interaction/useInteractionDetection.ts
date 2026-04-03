// src/hooks/interaction/useInteractionDetection.ts
import { useRef, useCallback, useEffect } from 'react';
import { MouseHistoryPoint } from './types';
import { INTERACTION_CONSTANTS } from './constants';

interface UseInteractionDetectionProps {
  petRef: React.RefObject<HTMLDivElement>;
  isDraggingRef: React.RefObject<boolean>; // Use ref to avoid re-renders
  reactionAnimation: string | null; // To prevent detection during animation
  clearReaction: () => void; // To potentially clear reactions on new detections
  setReactionAnimation: (animation: string | null) => void; // To trigger reaction animations
}

interface UseInteractionDetectionReturn {
  // Refs to manage detection state and timers
  mousePosHistoryRef: React.MutableRefObject<MouseHistoryPoint[]>;
  mouseSpeedRef: React.MutableRefObject<number>;
  lastClickTimeRef: React.MutableRefObject<number>;
  longPressTimeoutRef: React.MutableRefObject<NodeJS.Timeout | null>;
  circleDetectionPointsRef: React.MutableRefObject<MouseHistoryPoint[]>;
  petDetectionPointsRef: React.MutableRefObject<MouseHistoryPoint[]>;
  hoverDetectTimeoutRef: React.MutableRefObject<NodeJS.Timeout | null>;
  reactionTimeoutRef: React.MutableRefObject<NodeJS.Timeout | null>; // Shared timeout for reactions

  // Detection logic triggered by mouse events
  handleMouseDownForDetection: (e: React.MouseEvent) => void;
  handleMouseMoveForDetection: (e: MouseEvent) => void; // Use MouseEvent for global move
  handleMouseUpForDetection: (e: MouseEvent) => void;
  handleMouseEnterForDetection: (e: React.MouseEvent) => void;
  handleMouseLeaveForDetection: (e: React.MouseEvent) => void;

  // Helper to reset detection states (e.g., on mouse leave)
  resetDetectionStates: () => void;
}

export function useInteractionDetection({
  petRef,
  isDraggingRef,
  reactionAnimation,
  clearReaction, // Pass down clearReaction
  setReactionAnimation, // Pass down setReactionAnimation
}: UseInteractionDetectionProps): UseInteractionDetectionReturn {
  // --- Refs for Detection State ---
  const mousePosHistoryRef = useRef<MouseHistoryPoint[]>([]);
  const mouseSpeedRef = useRef<number>(0);
  const lastClickTimeRef = useRef<number>(0);
  const longPressTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const circleDetectionPointsRef = useRef<MouseHistoryPoint[]>([]);
  const petDetectionPointsRef = useRef<MouseHistoryPoint[]>([]);
  const hoverDetectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reactionTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Use a shared reaction timeout ref

  // 新增：悬停累积时间相关的refs
  const totalHoverTimeRef = useRef(0);
  const hoverStartTimeRef = useRef<number | null>(null);
  const hoverAnimationTriggeredRef = useRef(false);
  const hoverUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // --- Helper Functions ---
  const internalClearReaction = useCallback(() => {
    if (reactionTimeoutRef.current) {
      clearTimeout(reactionTimeoutRef.current);
      reactionTimeoutRef.current = null;
    }
    setReactionAnimation(null); // Use the passed setter
  }, [setReactionAnimation]);


  const resetDetectionStates = useCallback(() => {
    // Clear timeouts specific to detection
    if (hoverDetectTimeoutRef.current) clearTimeout(hoverDetectTimeoutRef.current);
    if (longPressTimeoutRef.current) clearTimeout(longPressTimeoutRef.current);
    if (hoverUpdateIntervalRef.current) clearTimeout(hoverUpdateIntervalRef.current);
    hoverDetectTimeoutRef.current = null;
    longPressTimeoutRef.current = null;
    hoverUpdateIntervalRef.current = null;

    // Reset detection point arrays and speed
    mousePosHistoryRef.current = [];
    mouseSpeedRef.current = 0;
    circleDetectionPointsRef.current = [];
    petDetectionPointsRef.current = [];

    // 重置悬停累积时间相关状态
    totalHoverTimeRef.current = 0;
    hoverStartTimeRef.current = null;
    hoverAnimationTriggeredRef.current = false;

    // Don't reset lastClickTimeRef here, needed across leave/enter for double click

    // Clear any active reaction animation using the main clear function
    clearReaction(); // Call the main clearReaction passed from parent

  }, [clearReaction]); // Dependency on the main clearReaction

  // 悬停时间更新函数
  const updateHoverTime = useCallback(() => {
    if (hoverStartTimeRef.current === null) return;

    const now = Date.now();
    const sessionTime = now - hoverStartTimeRef.current;
    totalHoverTimeRef.current += sessionTime;
    hoverStartTimeRef.current = now; // 重置开始时间以便下次计算

    // 检查是否达到触发阈值
    if (totalHoverTimeRef.current >= INTERACTION_CONSTANTS.HOVER_ANIMATION_THRESHOLD &&
        !hoverAnimationTriggeredRef.current &&
        !reactionAnimation &&
        !isDraggingRef.current) {

      hoverAnimationTriggeredRef.current = true;
      setReactionAnimation('tilt-head');
      if (reactionTimeoutRef.current) clearTimeout(reactionTimeoutRef.current);
      reactionTimeoutRef.current = setTimeout(internalClearReaction, INTERACTION_CONSTANTS.REACTION_ANIMATION_DURATION);
    }
  }, [reactionAnimation, isDraggingRef, setReactionAnimation, internalClearReaction]);

  // --- Detection Logic ---

  // Detect Circular Motion (Helper)
  const detectCircularMotion = useCallback((points: MouseHistoryPoint[], petElement: HTMLDivElement | null): { isCircle: boolean; isClockwise: boolean } => {
    if (!petElement || points.length < INTERACTION_CONSTANTS.CIRCLING_MIN_POINTS) {
      return { isCircle: false, isClockwise: false };
    }

    const petRect = petElement.getBoundingClientRect();
    const petCenterX = petRect.left + petRect.width / 2;
    const petCenterY = petRect.top + petRect.height / 2;

    const angles = points.map(point => Math.atan2(point.y - petCenterY, point.x - petCenterX));

    let totalAngleChange = 0;
    for (let i = 1; i < angles.length; i++) {
      let change = angles[i] - angles[i - 1];
      if (change > Math.PI) change -= 2 * Math.PI;
      else if (change < -Math.PI) change += 2 * Math.PI;
      totalAngleChange += change;
    }

    const isCircle = Math.abs(totalAngleChange) > Math.PI * 1.5; // ~270 degrees
    const isClockwise = totalAngleChange < 0;

    return { isCircle, isClockwise };
  }, []); // No dependencies

  // --- Event Handlers for Detection ---

  const handleMouseDownForDetection = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click

    const now = Date.now();
    clearReaction(); // Clear existing reactions on new click

    // --- Double Click Detection ---
    const timeSinceLastClick = now - lastClickTimeRef.current;
    if (timeSinceLastClick < INTERACTION_CONSTANTS.DOUBLE_CLICK_THRESHOLD) {
      if (longPressTimeoutRef.current) clearTimeout(longPressTimeoutRef.current); // Cancel long press
      longPressTimeoutRef.current = null;
      setReactionAnimation('double-click-animation'); // Trigger animation
      reactionTimeoutRef.current = setTimeout(internalClearReaction, INTERACTION_CONSTANTS.REACTION_ANIMATION_DURATION);
      lastClickTimeRef.current = 0; // Reset last click time to prevent triple clicks etc.
      return; // Stop further processing if double click detected
    }
    lastClickTimeRef.current = now; // Update last click time

    // --- Long Press Detection ---
    if (longPressTimeoutRef.current) clearTimeout(longPressTimeoutRef.current); // Clear previous timeout
    longPressTimeoutRef.current = setTimeout(() => {
      // Only trigger if not dragging and no other reaction is active
      if (!isDraggingRef.current && !reactionAnimation) {
        setReactionAnimation('long-press-animation');
        reactionTimeoutRef.current = setTimeout(internalClearReaction, INTERACTION_CONSTANTS.REACTION_ANIMATION_DURATION * 1.5);
      }
      longPressTimeoutRef.current = null;
    }, INTERACTION_CONSTANTS.LONG_PRESS_THRESHOLD);

  }, [clearReaction, setReactionAnimation, internalClearReaction, isDraggingRef, reactionAnimation]);

  const handleMouseMoveForDetection = useCallback((e: MouseEvent) => {
    // Don't detect interactions while dragging
    if (isDraggingRef.current) {
      // Clear potential detection states if dragging starts mid-detection
      if (hoverDetectTimeoutRef.current) clearTimeout(hoverDetectTimeoutRef.current);
      if (hoverUpdateIntervalRef.current) clearTimeout(hoverUpdateIntervalRef.current);
      hoverDetectTimeoutRef.current = null;
      hoverUpdateIntervalRef.current = null;

      // 重置悬停相关状态
      totalHoverTimeRef.current = 0;
      hoverStartTimeRef.current = null;
      hoverAnimationTriggeredRef.current = false;

      circleDetectionPointsRef.current = [];
      petDetectionPointsRef.current = [];
      mousePosHistoryRef.current = [];
      mouseSpeedRef.current = 0;
      return;
    }

    const now = Date.now();
    const currentPos: MouseHistoryPoint = { x: e.clientX, y: e.clientY, time: now };

    // --- Mouse Speed Calculation ---
    mousePosHistoryRef.current.push(currentPos);
    mousePosHistoryRef.current = mousePosHistoryRef.current.filter(p => now - p.time < INTERACTION_CONSTANTS.MOUSE_HISTORY_DURATION);

    let isReactingFast = false;
    if (mousePosHistoryRef.current.length > 1) {
      const firstPos = mousePosHistoryRef.current[0];
      const lastPos = mousePosHistoryRef.current[mousePosHistoryRef.current.length - 1];
      const dx = lastPos.x - firstPos.x;
      const dy = lastPos.y - firstPos.y;
      const dt = (lastPos.time - firstPos.time) / 1000;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (dt > 0.01) {
        mouseSpeedRef.current = distance / dt;
        // --- Fast Move Detection ---
        if (mouseSpeedRef.current > INTERACTION_CONSTANTS.FAST_MOVE_THRESHOLD && !reactionAnimation) {
          isReactingFast = true;
          if (hoverDetectTimeoutRef.current) clearTimeout(hoverDetectTimeoutRef.current); // Cancel hover
          hoverDetectTimeoutRef.current = null;
          setReactionAnimation('look-around-fast');
          if (reactionTimeoutRef.current) clearTimeout(reactionTimeoutRef.current);
          reactionTimeoutRef.current = setTimeout(internalClearReaction, INTERACTION_CONSTANTS.FAST_REACTION_ANIMATION_DURATION);
        }
      } else {
        mouseSpeedRef.current = 0;
      }
    } else {
      mouseSpeedRef.current = 0;
    }

    // Clear hover timeout if moving significantly (even if not "fast")
    if (mouseSpeedRef.current > 50 && hoverDetectTimeoutRef.current) {
      clearTimeout(hoverDetectTimeoutRef.current);
      hoverDetectTimeoutRef.current = null;
    }

    // 悬停时间累积逻辑
    if (mouseSpeedRef.current < INTERACTION_CONSTANTS.FAST_MOVE_THRESHOLD / 3) {
      // 鼠标速度较低，可以累积悬停时间
      if (hoverStartTimeRef.current === null) {
        // 开始新的悬停会话
        hoverStartTimeRef.current = now;
      } else {
        // 更新累积时间
        updateHoverTime();
      }
    } else {
      // 鼠标移动过快，暂停累积时间
      if (hoverStartTimeRef.current !== null) {
        updateHoverTime(); // 保存当前会话的时间
        hoverStartTimeRef.current = null; // 暂停累积
      }
    }

    // Don't process further detections if a fast reaction just triggered
    if (isReactingFast || reactionAnimation) return;


    // --- Petting Detection ---
    petDetectionPointsRef.current.push(currentPos);
    petDetectionPointsRef.current = petDetectionPointsRef.current.filter(p => now - p.time < INTERACTION_CONSTANTS.PET_DETECTION_DURATION);

    if (petDetectionPointsRef.current.length >= INTERACTION_CONSTANTS.PETTING_MIN_POINTS) {
      const points = petDetectionPointsRef.current;
      let totalDistance = 0;
      let isSlow = true;
      for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const curr = points[i];
        const dx = curr.x - prev.x;
        const dy = curr.y - prev.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const dt = (curr.time - prev.time) / 1000;
        totalDistance += dist;
        if (dt > 0 && dist / dt > INTERACTION_CONSTANTS.FAST_MOVE_THRESHOLD / 3) {
          isSlow = false;
          break;
        }
      }
      if (isSlow && totalDistance >= INTERACTION_CONSTANTS.PETTING_MIN_DISTANCE && totalDistance <= INTERACTION_CONSTANTS.PETTING_MAX_DISTANCE) {
        setReactionAnimation('being-pet-animation');
        petDetectionPointsRef.current = []; // Reset points
        if (reactionTimeoutRef.current) clearTimeout(reactionTimeoutRef.current);
        reactionTimeoutRef.current = setTimeout(internalClearReaction, INTERACTION_CONSTANTS.REACTION_ANIMATION_DURATION);
        return; // Stop further processing if petting detected
      }
    }

    // --- Circle Detection ---
    circleDetectionPointsRef.current.push(currentPos);
    circleDetectionPointsRef.current = circleDetectionPointsRef.current.filter(p => now - p.time < INTERACTION_CONSTANTS.CIRCLE_DETECTION_DURATION);

    if (circleDetectionPointsRef.current.length >= INTERACTION_CONSTANTS.CIRCLING_MIN_POINTS) {
      const result = detectCircularMotion(circleDetectionPointsRef.current, petRef.current);
      if (result.isCircle) {
        setReactionAnimation(result.isClockwise ? 'circle-clockwise-animation' : 'circle-counterclockwise-animation');
        circleDetectionPointsRef.current = []; // Reset points
        if (reactionTimeoutRef.current) clearTimeout(reactionTimeoutRef.current);
        reactionTimeoutRef.current = setTimeout(internalClearReaction, INTERACTION_CONSTANTS.REACTION_ANIMATION_DURATION * 1.5);
        return; // Stop further processing if circling detected
      }
    }

  }, [isDraggingRef, reactionAnimation, setReactionAnimation, internalClearReaction, petRef, detectCircularMotion]);

  const handleMouseUpForDetection = useCallback(() => {
    // Clear long press timeout on any mouse up (if it hasn't fired)
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
    // Other up-related logic (like click action) is handled by drag/main hook
  }, []);

  const handleMouseEnterForDetection = useCallback(() => {
    // 只重置非悬停相关的检测状态
    if (hoverDetectTimeoutRef.current) clearTimeout(hoverDetectTimeoutRef.current);
    if (longPressTimeoutRef.current) clearTimeout(longPressTimeoutRef.current);
    hoverDetectTimeoutRef.current = null;
    longPressTimeoutRef.current = null;

    // 重置其他检测状态，但保留悬停累积时间
    mousePosHistoryRef.current = [];
    mouseSpeedRef.current = 0;
    circleDetectionPointsRef.current = [];
    petDetectionPointsRef.current = [];

    // 如果还没有开始悬停会话，开始新的会话
    if (hoverStartTimeRef.current === null) {
      hoverStartTimeRef.current = Date.now();
    }

    // 设置定期更新悬停时间的间隔
    if (hoverUpdateIntervalRef.current) clearTimeout(hoverUpdateIntervalRef.current);
    hoverUpdateIntervalRef.current = setInterval(() => {
      if (hoverStartTimeRef.current !== null && !isDraggingRef.current) {
        updateHoverTime();
      }
    }, INTERACTION_CONSTANTS.HOVER_DETECT_DURATION);

  }, [isDraggingRef, updateHoverTime]);

  const handleMouseLeaveForDetection = useCallback(() => {
    // 在重置状态前，如果有悬停动画正在播放，清除它
    if (hoverAnimationTriggeredRef.current && reactionAnimation === 'tilt-head') {
      internalClearReaction();
    }

    resetDetectionStates(); // Reset everything on leave
  }, [resetDetectionStates, reactionAnimation, internalClearReaction]);

  // 清理effect，确保组件卸载时清理所有定时器
  useEffect(() => {
    return () => {
      if (hoverDetectTimeoutRef.current) clearTimeout(hoverDetectTimeoutRef.current);
      if (longPressTimeoutRef.current) clearTimeout(longPressTimeoutRef.current);
      if (hoverUpdateIntervalRef.current) clearTimeout(hoverUpdateIntervalRef.current);
      if (reactionTimeoutRef.current) clearTimeout(reactionTimeoutRef.current);
    };
  }, []);

  return {
    mousePosHistoryRef,
    mouseSpeedRef,
    lastClickTimeRef,
    longPressTimeoutRef,
    circleDetectionPointsRef,
    petDetectionPointsRef,
    hoverDetectTimeoutRef,
    reactionTimeoutRef, // Return the shared ref

    handleMouseDownForDetection,
    handleMouseMoveForDetection,
    handleMouseUpForDetection,
    handleMouseEnterForDetection,
    handleMouseLeaveForDetection,

    resetDetectionStates,
  };
}
