// src/hooks/interaction/useIdleHandling.ts
import { useRef, useCallback, useEffect } from 'react';
import { INTERACTION_CONSTANTS, ANIMATION_GROUPS } from './constants';

interface UseIdleHandlingProps {
  reactionAnimation: string | null; // To check if already reacting
  isDragging: boolean; // To prevent idle during drag
  showMenu: boolean; // To prevent idle when menu is open
  setReactionAnimation: (animation: string | null) => void; // To set idle animation
  clearReaction: () => void; // To clear animation when done
  reactionTimeoutRef: React.MutableRefObject<NodeJS.Timeout | null>; // Shared timeout ref
}

interface UseIdleHandlingReturn {
  resetIdleTimer: () => void; // Function to call on any interaction
  lastInteractionTimeRef: React.MutableRefObject<number>; // Ref tracking last interaction
}

export function useIdleHandling({
  reactionAnimation,
  isDragging,
  showMenu,
  setReactionAnimation,
  clearReaction,
  reactionTimeoutRef, // Use the shared timeout ref
}: UseIdleHandlingProps): UseIdleHandlingReturn {
  const lastInteractionTimeRef = useRef<number>(Date.now());
  const idleTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const setupIdleAnimation = useCallback(() => {
    // Clear existing idle timer before setting a new one
    if (idleTimeoutRef.current) {
      clearTimeout(idleTimeoutRef.current);
    }

    idleTimeoutRef.current = setTimeout(() => {
      // Check conditions: no reaction, not dragging, menu closed
      if (!reactionAnimation && !isDragging && !showMenu) {
        // Select a random idle animation
        const idleAnimations = ANIMATION_GROUPS.IDLE;
        const randomIdle = idleAnimations[Math.floor(Math.random() * idleAnimations.length)];
        setReactionAnimation(randomIdle);

        // Clear previous reaction timeout just in case
        if (reactionTimeoutRef.current) {
            clearTimeout(reactionTimeoutRef.current);
        }
        // Set timeout to clear the idle animation and restart the idle check
        reactionTimeoutRef.current = setTimeout(() => {
          clearReaction(); // Use the main clear function
          setupIdleAnimation(); // Restart the idle timer loop
        }, INTERACTION_CONSTANTS.REACTION_ANIMATION_DURATION * 1.5); // Idle animations might be longer

      } else {
        // If conditions not met (e.g., user is interacting), restart the timer
        setupIdleAnimation();
      }
    }, INTERACTION_CONSTANTS.IDLE_ANIMATION_DELAY);

  }, [reactionAnimation, isDragging, showMenu, setReactionAnimation, clearReaction, reactionTimeoutRef]); // Dependencies

  // Function to reset the timer on any interaction
  const resetIdleTimer = useCallback(() => {
    lastInteractionTimeRef.current = Date.now();
    // Clear the existing idle timeout and set it up again
    if (idleTimeoutRef.current) {
      clearTimeout(idleTimeoutRef.current);
    }
    setupIdleAnimation(); // Restart the timer sequence
  }, [setupIdleAnimation]);

  // Start the initial idle timer on mount
  useEffect(() => {
    setupIdleAnimation();
    // Cleanup the timer on unmount
    return () => {
      if (idleTimeoutRef.current) {
        clearTimeout(idleTimeoutRef.current);
      }
      // Also clear reaction timeout if component unmounts during idle animation
      if (reactionTimeoutRef.current) {
          clearTimeout(reactionTimeoutRef.current)
      }
    };
  }, [setupIdleAnimation, reactionTimeoutRef]); // Initial setup dependency

  return {
    resetIdleTimer,
    lastInteractionTimeRef, // Expose if needed by other parts, though resetIdleTimer is primary interface
  };
}