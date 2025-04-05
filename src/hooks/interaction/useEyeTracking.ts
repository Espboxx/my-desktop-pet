// src/hooks/interaction/useEyeTracking.ts
import { useState, useRef, useCallback } from 'react';
import { MouseDirection, PetPosition } from './types'; // Assuming PetPosition might be needed if not using petRef directly
import { INTERACTION_CONSTANTS } from './constants';

interface UseEyeTrackingProps {
  petRef: React.RefObject<HTMLDivElement>;
  isDragging: boolean; // To stop tracking during drag
  reactionAnimation: string | null; // To stop tracking during reactions
}

interface UseEyeTrackingReturn {
  mouseDirection: MouseDirection;
  enableGlobalEyeTracking: boolean; // State for enabling/disabling
  toggleGlobalEyeTracking: (enabled: boolean) => void; // Function to toggle
  updateEyeDirection: (mouseX: number, mouseY: number, forceUpdate?: boolean) => void; // Core update function
  lastMousePositionRef: React.MutableRefObject<{ x: number, y: number } | null>; // Ref to store last position
}

export function useEyeTracking({
  petRef,
  isDragging,
  reactionAnimation,
}: UseEyeTrackingProps): UseEyeTrackingReturn {
  const [mouseDirection, setMouseDirection] = useState<MouseDirection>('center');
  const [enableGlobalEyeTracking, setEnableGlobalEyeTracking] = useState(true);
  const lastMousePositionRef = useRef<{ x: number, y: number } | null>(null);
  const eyeViewAngle = useRef(INTERACTION_CONSTANTS.EYE_VIEW_ANGLE); // Use constant

  const toggleGlobalEyeTracking = useCallback((enabled: boolean) => {
    setEnableGlobalEyeTracking(enabled);
    // Optionally reset direction when toggling?
    // if (!enabled) {
    //   setMouseDirection('center');
    // }
  }, []);

  const updateEyeDirection = useCallback((mouseX: number, mouseY: number, forceUpdate = false) => {
    // Store last known position regardless of tracking state
    lastMousePositionRef.current = { x: mouseX, y: mouseY };

    // Stop eye movement if disabled, dragging, or reacting animation is playing
    if (!enableGlobalEyeTracking || isDragging || reactionAnimation) {
       // If dragging, force eyes to center
       if (isDragging && mouseDirection !== 'center') {
           setMouseDirection('center');
       }
      return;
    }

    if (petRef.current) {
      const petRect = petRef.current.getBoundingClientRect();
      // Avoid division by zero or issues if rect is invalid
      if (petRect.width <= 0 || petRect.height <= 0) {
          if (mouseDirection !== 'center') setMouseDirection('center');
          return;
      }

      const petCenterX = petRect.left + petRect.width / 2;
      const petCenterY = petRect.top + petRect.height / 2;
      const deltaX = mouseX - petCenterX;
      const deltaY = mouseY - petCenterY;

      // Calculate angle and distance
      const angle = Math.atan2(deltaY, deltaX);
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      // Calculate view angle in radians
      const viewAngleRad = (eyeViewAngle.current * Math.PI) / 180;
      const facingAngle = 0; // Assume pet faces right (0 radians)

      // Calculate angle difference and normalize
      let angleDiff = angle - facingAngle;
      while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
      while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

      // Check if within view angle
      const isInViewAngle = Math.abs(angleDiff) <= viewAngleRad / 2;

      // Check if nearby
      const nearThreshold = petRect.width * INTERACTION_CONSTANTS.NEAR_DISTANCE_MULTIPLIER;
      const isNearby = distance < nearThreshold;

      // Determine if eyes should track
      // Track if: nearby OR (in view angle AND global tracking enabled) OR forceUpdate is true
      const shouldTrack = isNearby || (isInViewAngle && enableGlobalEyeTracking) || forceUpdate;

      if (!shouldTrack) {
        // If not tracking and not already centered, maybe center? Or hold last position?
        // Let's hold the last valid direction for now, unless forced update suggests centering.
        // If forceUpdate is false here, it means mouse is outside view and not nearby.
        // Consider if we want eyes to return to center in this case. For now, they hold.
        // if (mouseDirection !== 'center') setMouseDirection('center');
        return;
      }

      // Calculate direction based on angle
      const directionThreshold = petRect.width * INTERACTION_CONSTANTS.EYE_DIRECTION_THRESHOLD_MULTIPLIER;
      let direction: MouseDirection = 'center';

      if (Math.abs(deltaX) < directionThreshold && Math.abs(deltaY) < directionThreshold) {
        direction = 'center';
      } else {
        // Angle ranges (adjust as needed)
        if (angle >= -Math.PI / 8 && angle < Math.PI / 8) direction = 'right';
        else if (angle >= Math.PI / 8 && angle < 3 * Math.PI / 8) direction = 'down-right';
        else if (angle >= 3 * Math.PI / 8 && angle < 5 * Math.PI / 8) direction = 'down';
        else if (angle >= 5 * Math.PI / 8 && angle < 7 * Math.PI / 8) direction = 'down-left';
        else if (angle >= 7 * Math.PI / 8 || angle < -7 * Math.PI / 8) direction = 'left';
        else if (angle >= -7 * Math.PI / 8 && angle < -5 * Math.PI / 8) direction = 'up-left';
        else if (angle >= -5 * Math.PI / 8 && angle < -3 * Math.PI / 8) direction = 'up';
        else if (angle >= -3 * Math.PI / 8 && angle < -Math.PI / 8) direction = 'up-right';
      }

      // Update state only if direction changes
      if (direction !== mouseDirection) {
        setMouseDirection(direction);
      }
    } else {
        // If petRef is null, default to center
        if (mouseDirection !== 'center') setMouseDirection('center');
    }
  }, [petRef, enableGlobalEyeTracking, isDragging, reactionAnimation, mouseDirection]); // Include mouseDirection in deps

  return {
    mouseDirection,
    enableGlobalEyeTracking,
    toggleGlobalEyeTracking,
    updateEyeDirection,
    lastMousePositionRef,
  };
}