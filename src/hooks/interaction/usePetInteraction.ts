// src/hooks/interaction/usePetInteraction.ts
import { useState, useRef, useEffect, useCallback } from 'react';
import { PetStatus, InteractionType } from '../../types/petTypes';
import {
  CoreInteractionProps,
  UsePetInteractionReturn,
  PetPosition,
  MouseDirection,
  // Import other necessary types from './types' if needed
} from './types';
import { useDragHandling } from './useDragHandling';
import { useContextMenuHandling } from './useContextMenuHandling';
import { useEyeTracking } from './useEyeTracking';
import { useInteractionDetection } from './useInteractionDetection';
import { useActionHandling } from './useActionHandling';
import { useIdleHandling } from './useIdleHandling';
import { INTERACTION_CONSTANTS } from './constants'; // Might need some constants here

// Define the props expected by the main hook
interface UsePetInteractionProps {
  status: PetStatus;
  setStatus: React.Dispatch<React.SetStateAction<PetStatus>>;
  setCurrentAnimation: (animation: string | null) => void;
  initialPosition: PetPosition | null; // Add initial position prop
  // Add setNewlyUnlocked if needed for notifications
  // setNewlyUnlocked?: React.Dispatch<React.SetStateAction<string[]>>;
}

export function usePetInteraction({
  status,
  setStatus,
  setCurrentAnimation,
  // setNewlyUnlocked,
  initialPosition, // Destructure the new prop
}: UsePetInteractionProps): UsePetInteractionReturn {

  // --- Central State and Refs ---
  // Initialize with loaded position if available, otherwise default to center
  const [petPosition, setPetPosition] = useState<PetPosition>(
    initialPosition || { x: window.innerWidth / 2, y: window.innerHeight / 2 }
  );
  const [reactionAnimation, setReactionAnimation] = useState<string | null>(null);
  const petRef = useRef<HTMLDivElement>(null);
  const isMouseOverPet = useRef(false); // Mutable ref for shared status
  const reactionTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Shared timeout for reactions

  // --- Clear Reaction Helper ---
  // This function is passed down to sub-hooks that need to clear/set reaction state
  const clearReaction = useCallback(() => {
    if (reactionTimeoutRef.current) {
      clearTimeout(reactionTimeoutRef.current);
      reactionTimeoutRef.current = null;
    }
    // Clear specific detection states if needed (though sub-hooks might handle this)
    // e.g., interactionDetection.resetDetectionStates(); // Might be too broad
    setReactionAnimation(null);
  }, []); // No dependencies needed for this basic version

  // --- Instantiate Sub-Hooks ---

  const {
    showMenu,
    setShowMenu,
    menuPosition,
    menuRef,
    handleContextMenu,
  } = useContextMenuHandling({ petRef, isMouseOverPet, clearReaction });

  // Note: Pass the *mutable* isMouseOverPet ref
  // Pass the *mutable* reactionTimeoutRef
  const interactionDetection = useInteractionDetection({
    petRef,
    isDraggingRef: useRef(false), // Drag hook will manage its own isDragging state/ref
    reactionAnimation,
    clearReaction,
    setReactionAnimation,
    // reactionTimeoutRef, // Pass the shared ref
  });
   // Destructure refs needed by other hooks *after* instantiation
   const { longPressTimeoutRef } = interactionDetection;


  const { // Destructure isDragging instead of isCurrentlyDragging
    isDragging, // Renamed from isCurrentlyDragging
    handleMouseDownForDrag,
    handleGlobalMouseMoveForDrag,
    handleGlobalMouseUpForDrag,
    mouseDownButtonRef, // Get the ref for mouse button state
  } = useDragHandling({
    petPosition,
    setPetPositionExternally: setPetPosition, // Pass the state setter
    setCurrentAnimation,
    clearReaction,
    isMouseOverPet, // Pass the mutable ref
    petRef,
    showMenu,
    longPressTimeoutRef, // Pass the ref from interactionDetection
    onDragEnd: (finalPosition, wasClick) => {
        // Logic after drag ends, e.g., trigger 'pet' action if it was a click
        if (wasClick) {
            // handleAction('pet'); // Call handleAction directly if it was a click
        }
        // Reset idle timer after drag/click
        idleHandling.resetIdleTimer();
    },
  });

  const {
    mouseDirection,
    enableGlobalEyeTracking,
    toggleGlobalEyeTracking,
    updateEyeDirection,
    lastMousePositionRef, // Pass isDragging to useEyeTracking
  } = useEyeTracking({ petRef, isDragging, reactionAnimation }); // Use isDragging here

  const { handleAction } = useActionHandling({
    status,
    setStatus,
    setCurrentAnimation,
    // setNewlyUnlocked,
  });

  const idleHandling = useIdleHandling({ // Pass isDragging to useIdleHandling
    reactionAnimation,
    isDragging, // Use isDragging here
    showMenu,
    setReactionAnimation,
    clearReaction,
    reactionTimeoutRef, // Pass the shared ref
  });

  // --- Combined Event Handlers ---

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Reset idle timer on interaction
    idleHandling.resetIdleTimer();

    // Delegate to sub-hooks
    handleMouseDownForDrag(e);
    interactionDetection.handleMouseDownForDetection(e);

    // Close menu if open and clicking on pet
    if (showMenu) {
      setShowMenu(false);
      // Passthrough handled by context menu hook's effect or drag end
    }

    // Prevent default actions like text selection or image dragging
    e.preventDefault();
    e.stopPropagation();

    // Add global listeners (only once per mousedown)
    // Check if button ref indicates a button was pressed (left or right)
    if (mouseDownButtonRef.current !== null) {
        document.addEventListener('mousemove', handleGlobalMouseMove);
        document.addEventListener('mouseup', handleGlobalMouseUp);
    }

  }, [handleMouseDownForDrag, interactionDetection.handleMouseDownForDetection, idleHandling.resetIdleTimer, showMenu, setShowMenu, mouseDownButtonRef]); // Add mouseDownButtonRef

  const handleMouseEnter = useCallback((e: React.MouseEvent) => {
    isMouseOverPet.current = true;
    window.desktopPet.setMousePassthrough(false);
    // Reset idle timer on interaction
    idleHandling.resetIdleTimer();
    // Delegate to detection hook
    interactionDetection.handleMouseEnterForDetection(e);
    // No need to call eye tracking directly, global move handles it
  }, [interactionDetection.handleMouseEnterForDetection, idleHandling.resetIdleTimer]);

  const handleMouseLeave = useCallback((e: React.MouseEvent) => {
    isMouseOverPet.current = false;
    // Delegate to detection hook
    interactionDetection.handleMouseLeaveForDetection(e);
    // Don't reset eye direction here, let global tracking continue
    // Reset idle timer as leaving is an interaction boundary
    idleHandling.resetIdleTimer(); // Pass isDragging to handleMouseLeave

    // Only enable passthrough if not dragging and menu isn't shown // Use isDragging here
    if (!isDragging && !showMenu) { // Use isDragging here
      window.desktopPet.setMousePassthrough(true);
    }
  }, [interactionDetection.handleMouseLeaveForDetection, isDragging, showMenu, idleHandling.resetIdleTimer]); // Use isDragging in dependency array

  // --- Global Event Handlers ---
  // These are added on mousedown and removed on mouseup

  const handleGlobalMouseMove = useCallback((e: MouseEvent) => {
    // Reset idle timer on interaction
    idleHandling.resetIdleTimer();

    // Update last mouse position for eye tracking
    lastMousePositionRef.current = { x: e.clientX, y: e.clientY };

    // Delegate to drag handling
    handleGlobalMouseMoveForDrag(e);

    // Delegate to interaction detection (only if over pet - check inside?)
    // Need to check isMouseOverPet ref here before calling detection move
    if (isMouseOverPet.current) {
        interactionDetection.handleMouseMoveForDetection(e);
    }

    // Delegate to eye tracking (always, unless disabled/dragging/reacting)
    updateEyeDirection(e.clientX, e.clientY, false); // Don't force update here

    // Prevent default browser behavior during move if needed
    e.preventDefault();
    e.stopPropagation();

  }, [handleGlobalMouseMoveForDrag, interactionDetection.handleMouseMoveForDetection, updateEyeDirection, idleHandling.resetIdleTimer, lastMousePositionRef, isMouseOverPet]); // Add refs

  const handleGlobalMouseUp = useCallback((e: MouseEvent) => {
    // Reset idle timer on interaction
    idleHandling.resetIdleTimer();

    // Delegate to drag handling (which handles click vs drag end)
    handleGlobalMouseUpForDrag(e);

    // Delegate to interaction detection
    interactionDetection.handleMouseUpForDetection(e);

    // Re-enable eye tracking if it was disabled for drag
    if (!enableGlobalEyeTracking) {
        // This logic might be better inside useEyeTracking or useDragHandling's onDragEnd
        // toggleGlobalEyeTracking(true); // Let drag handler manage this?
    }

     // Check if it was a click (not a drag) and trigger 'pet' action
     // The drag handler now calls onDragEnd with wasClick flag
     // We can use that callback in useDragHandling instantiation
     const wasDragging = interactionDetection.longPressTimeoutRef.current === null && mouseDownButtonRef.current === 0; // Approximation, drag hook knows better
     if (!wasDragging && mouseDownButtonRef.current === 0) {
         // Check if the mouse up happened over the pet
         let isOverPetNow = false;
         if (petRef.current) {
             const petRect = petRef.current.getBoundingClientRect();
             isOverPetNow = e.clientX >= petRect.left && e.clientX <= petRect.right && e.clientY >= petRect.top && e.clientY <= petRect.bottom;
         }
         if (isOverPetNow) {
             handleAction('pet'); // Trigger pet action on click up over pet
         }
     }


    // Remove global listeners
    document.removeEventListener('mousemove', handleGlobalMouseMove);
    document.removeEventListener('mouseup', handleGlobalMouseUp);

    // Reset the mouse down button tracker in the drag hook
    // mouseDownButtonRef.current = null; // Drag hook handles this now

    e.stopPropagation();

  }, [handleGlobalMouseUpForDrag, interactionDetection.handleMouseUpForDetection, idleHandling.resetIdleTimer, handleAction, petRef, mouseDownButtonRef]); // Add handleAction, petRef, mouseDownButtonRef

  // --- Effect for Global Eye Tracking Listener ---
  // This listener is always active when tracking is enabled
  useEffect(() => {
    const handleGlobalEyeTrackingListener = (e: MouseEvent) => {
        // Only track if enabled, not dragging, and no reaction animation
        if (enableGlobalEyeTracking && !isDragging && !reactionAnimation) { // Use isDragging here
            updateEyeDirection(e.clientX, e.clientY, false);
        }
         // Also update last known position regardless of tracking state
         lastMousePositionRef.current = { x: e.clientX, y: e.clientY };
    };

    document.addEventListener('mousemove', handleGlobalEyeTrackingListener);

    return () => {
      document.removeEventListener('mousemove', handleGlobalEyeTrackingListener);
      // Clean up potential listeners from mousedown if component unmounts mid-drag
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
    // Add dependencies: ensure listener updates if tracking state changes // Pass isDragging to useEffect dependency array
  }, [enableGlobalEyeTracking, isDragging, reactionAnimation, updateEyeDirection, handleGlobalMouseMove, handleGlobalMouseUp, lastMousePositionRef]); // Use isDragging in dependency array


  // --- Return combined state and handlers ---
  return {
    // State
    petPosition,
    menuPosition,
    showMenu, // Return isDragging instead of isCurrentlyDragging
    mouseDirection,
    isDragging, // Renamed from isCurrentlyDragging
    reactionAnimation,
    enableGlobalEyeTracking, // from useEyeTracking

    // Refs (if needed externally)
    menuRef,
    petRef, // Add lastMousePosition ref to the return object
    isMouseOverPet, // Add the mutable ref back to the return object
    lastMousePosition: lastMousePositionRef, // Add the ref here, matching the type name

    // Handlers & Setters
    handleMouseDown,
    handleMouseEnter,
    handleMouseLeave,
    handleContextMenu, // from useContextMenuHandling
    handleAction, // from useActionHandling
    setShowMenu, // from useContextMenuHandling
    toggleGlobalEyeTracking, // from useEyeTracking
    setPetPosition, // Expose the position setter

    // Include refs from detection hook if they need to be accessed/reset externally
    // ...interactionDetectionRefs,
  };
}