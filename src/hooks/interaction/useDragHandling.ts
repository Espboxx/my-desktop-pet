// src/hooks/interaction/useDragHandling.ts
import { useState, useRef, useCallback } from 'react';
import { PetPosition } from './types';
import { INTERACTION_CONSTANTS } from './constants';

interface UseDragHandlingProps {
  // initialPosition?: PetPosition; // Initial position comes from the main state
  onDragStart?: () => void; // Callback when dragging starts
  onDragEnd?: (finalPosition: PetPosition, wasClick: boolean) => void; // Callback when dragging ends
  setPetPositionExternally: (pos: PetPosition) => void; // Function to update position in the parent
  petPosition: PetPosition; // Current position from parent state
  setCurrentAnimation: (animation: string | null) => void; // To set 'picked-up'/'landed'
  clearReaction: () => void; // To clear reactions on drag start
  isMouseOverPet: React.MutableRefObject<boolean>; // Needs to be mutable
  petRef: React.RefObject<HTMLDivElement>; // To check bounds on mouse up
  showMenu: boolean; // To decide mouse passthrough on mouse up
  longPressTimeoutRef: React.MutableRefObject<NodeJS.Timeout | null>; // Needs to be mutable
}

interface UseDragHandlingReturn {
  isDragging: boolean; // Expose dragging state (renamed)
  handleMouseDownForDrag: (e: React.MouseEvent) => void; // Renamed for clarity
  handleGlobalMouseMoveForDrag: (e: MouseEvent) => void;
  handleGlobalMouseUpForDrag: (e: MouseEvent) => void;
  // Internal refs are not exposed unless necessary
  mouseDownButtonRef: React.RefObject<number | null>; // Expose ref if needed by other hooks (e.g., interaction detection)
}

export function useDragHandling({
  onDragStart,
  onDragEnd,
  setPetPositionExternally,
  petPosition, // Receive current position from parent
  setCurrentAnimation,
  clearReaction,
  isMouseOverPet,
  petRef,
  showMenu,
  longPressTimeoutRef,
}: UseDragHandlingProps): UseDragHandlingReturn {
  const [isDragging, setIsDragging] = useState(false); // Renamed state
  const isDraggingRef = useRef(false); // Internal flag: has drag threshold been passed?
  const dragStartMousePos = useRef<{ clientX: number, clientY: number } | null>(null);
  const initialPetPosRef = useRef<PetPosition | null>(null);
  const mouseDownButtonRef = useRef<number | null>(null); // Use Ref for button state

  const handleMouseDownForDrag = useCallback((e: React.MouseEvent) => {
    // Only handle left clicks for dragging
    if (e.button === 0) {
      mouseDownButtonRef.current = e.button;
      dragStartMousePos.current = { clientX: e.clientX, clientY: e.clientY };
      // Use the position passed from the parent at the moment of click
      initialPetPosRef.current = { ...petPosition };
      isMouseOverPet.current = true; // Assume mouse down on pet means over pet
      clearReaction(); // Stop any ongoing reaction

      // Listeners will be added by the main hook orchestrating mouse events
      window.desktopPet.setMousePassthrough(false); // Disable passthrough during potential drag
    }
     // Don't preventDefault/stopPropagation here, let the main handler do it
  }, [clearReaction, isMouseOverPet, petPosition]); // Dependencies

  const handleGlobalMouseMoveForDrag = useCallback((e: MouseEvent) => {
    // Only process if left button was initially pressed
    if (mouseDownButtonRef.current === 0 && dragStartMousePos.current && initialPetPosRef.current) {
      const dx = e.clientX - dragStartMousePos.current.clientX;
      const dy = e.clientY - dragStartMousePos.current.clientY;

      // Check if drag threshold is passed
      if (!isDraggingRef.current) {
        if (Math.abs(dx) > INTERACTION_CONSTANTS.CLICK_THRESHOLD || Math.abs(dy) > INTERACTION_CONSTANTS.CLICK_THRESHOLD) {
          isDraggingRef.current = true;
          setIsDragging(true); // Update state for external use
          setCurrentAnimation('picked-up');
          onDragStart?.(); // Notify parent

          // Cancel long press if dragging starts
          if (longPressTimeoutRef.current) {
            clearTimeout(longPressTimeoutRef.current);
            longPressTimeoutRef.current = null;
          }
        }
      }

      // If dragging, update position
      if (isDraggingRef.current) {
        const newX = initialPetPosRef.current.x + dx;
        const newY = initialPetPosRef.current.y + dy;
        // Update position via the passed function
        setPetPositionExternally({ x: newX, y: newY });
      }
    }
    // Prevent default browser drag behavior might be needed here or in the main handler
    // e.preventDefault();
    // e.stopPropagation();
  }, [setCurrentAnimation, onDragStart, setPetPositionExternally, longPressTimeoutRef]); // Dependencies

  const handleGlobalMouseUpForDrag = useCallback((e: MouseEvent) => {
    // Only process if the left button was the one initially pressed down
    if (mouseDownButtonRef.current === 0) {
      // Listeners will be removed by the main hook

      const wasDragging = isDraggingRef.current;
      const wasClick = !wasDragging;

      // Reset internal dragging state
      isDraggingRef.current = false;
      setIsDragging(false); // Update exposed state
      dragStartMousePos.current = null;
      initialPetPosRef.current = null;

      if (wasDragging) {
        setCurrentAnimation('landed');
        // Check if mouse is still over pet after landing
        const mouseX = e.clientX;
        const mouseY = e.clientY;
        let isOverPetNow = false;
        if (petRef.current) {
          const petRect = petRef.current.getBoundingClientRect();
          isOverPetNow =
            mouseX >= petRect.left &&
            mouseX <= petRect.right &&
            mouseY >= petRect.top &&
            mouseY <= petRect.bottom;
        }
        isMouseOverPet.current = isOverPetNow; // Update shared ref

        // Decide passthrough based on final state
        if (!isOverPetNow && !showMenu) {
          window.desktopPet.setMousePassthrough(true);
        } else {
          window.desktopPet.setMousePassthrough(false); // Keep non-passthrough if over pet or menu shown
        }
      } else {
         // If it wasn't a drag, it was a click.
         // The main hook or mouse handling hook will decide what action to take (e.g., 'pet')
         // Ensure passthrough is off after a click on the pet
         window.desktopPet.setMousePassthrough(false);
         isMouseOverPet.current = true; // Confirm mouse is over pet after click
      }

      // Notify parent about drag end, passing final position and whether it was a click
      // Pass the *current* petPosition from the parent state
      onDragEnd?.(petPosition, wasClick);

      // Don't stop propagation here, let the main handler decide
      // e.stopPropagation();
    }
    // Reset mouse button tracker regardless of which button was pressed
    mouseDownButtonRef.current = null;
  }, [setCurrentAnimation, onDragEnd, petPosition, petRef, isMouseOverPet, showMenu]); // Dependencies

  return {
    isDragging, // Renamed return value
    handleMouseDownForDrag,
    handleGlobalMouseMoveForDrag,
    handleGlobalMouseUpForDrag,
    mouseDownButtonRef, // Expose ref
  };
}