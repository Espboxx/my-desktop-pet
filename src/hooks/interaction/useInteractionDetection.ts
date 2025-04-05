// src/hooks/interaction/useInteractionDetection.ts
import { useRef, useCallback } from 'react';
import { MouseHistoryPoint, PetPosition } from './types'; // Assuming PetPosition might be needed for circle detection center
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
    hoverDetectTimeoutRef.current = null;
    longPressTimeoutRef.current = null;

    // Reset detection point arrays and speed
    mousePosHistoryRef.current = [];
    mouseSpeedRef.current = 0;
    circleDetectionPointsRef.current = [];
    petDetectionPointsRef.current = [];

    // Don't reset lastClickTimeRef here, needed across leave/enter for double click

    // Clear any active reaction animation using the main clear function
    clearReaction(); // Call the main clearReaction passed from parent

  }, [clearReaction]); // Dependency on the main clearReaction

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
      hoverDetectTimeoutRef.current = null;
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

  const handleMouseUpForDetection = useCallback((e: MouseEvent) => {
    // Clear long press timeout on any mouse up (if it hasn't fired)
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
    // Other up-related logic (like click action) is handled by drag/main hook
  }, []);

  const handleMouseEnterForDetection = useCallback((e: React.MouseEvent) => {
    resetDetectionStates(); // Reset states on enter

    // --- Hover Detection ---
    if (hoverDetectTimeoutRef.current) clearTimeout(hoverDetectTimeoutRef.current); // Clear previous just in case
    hoverDetectTimeoutRef.current = setTimeout(() => {
      // Check conditions again inside timeout: still over, not dragging, low speed, no reaction
      if (petRef.current /* check isMouseOverPet ref from parent? */ && !isDraggingRef.current && mouseSpeedRef.current < INTERACTION_CONSTANTS.FAST_MOVE_THRESHOLD / 3 && !reactionAnimation) {
        setReactionAnimation('tilt-head');
        if (reactionTimeoutRef.current) clearTimeout(reactionTimeoutRef.current);
        reactionTimeoutRef.current = setTimeout(internalClearReaction, INTERACTION_CONSTANTS.REACTION_ANIMATION_DURATION);
      }
      hoverDetectTimeoutRef.current = null;
    }, INTERACTION_CONSTANTS.HOVER_DETECT_DURATION);

  }, [resetDetectionStates, petRef, isDraggingRef, reactionAnimation, setReactionAnimation, internalClearReaction]);

  const handleMouseLeaveForDetection = useCallback((e: React.MouseEvent) => {
    resetDetectionStates(); // Reset everything on leave
  }, [resetDetectionStates]);


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