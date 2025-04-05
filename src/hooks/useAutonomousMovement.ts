import { useState, useEffect, useRef, useCallback } from 'react';
import { PetPosition } from './interaction/types'; // Correct import path for PetPosition

interface UseAutonomousMovementProps {
  petPosition: PetPosition;
  setPetPosition: React.Dispatch<React.SetStateAction<PetPosition>>;
  setCurrentAnimation: (animation: string | null) => void;
  isDragging: boolean; // To pause movement when user is dragging
  showMenu: boolean; // To pause movement when menu is open
  // Add other interaction states if needed (e.g., isInteracting)
  screenWidth: number;
  screenHeight: number;
  petWidth: number; // Get pet dimensions to calculate boundaries
  petHeight: number;
}

const MOVEMENT_INTERVAL = 15000; // Move every 15 seconds (adjust as needed)
const MOVEMENT_DURATION = 1000; // Duration of the move animation (adjust as needed)
const MAX_MOVE_DISTANCE = 150; // Max distance per move (adjust as needed)
const MIN_MOVE_DISTANCE = 30; // Min distance per move
const EDGE_PADDING = 20; // Padding from screen edges

export default function useAutonomousMovement({
  petPosition,
  setPetPosition,
  setCurrentAnimation,
  isDragging,
  showMenu,
  screenWidth,
  screenHeight,
  petWidth,
  petHeight,
}: UseAutonomousMovementProps) {
  const movementTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMovingRef = useRef(false);

  const calculateNewPosition = useCallback((): PetPosition => {
    const angle = Math.random() * 2 * Math.PI; // Random direction
    const distance = Math.random() * (MAX_MOVE_DISTANCE - MIN_MOVE_DISTANCE) + MIN_MOVE_DISTANCE;

    let newX = petPosition.x + Math.cos(angle) * distance;
    let newY = petPosition.y + Math.sin(angle) * distance;

    // Clamp position within screen bounds, considering pet size and padding
    const minX = EDGE_PADDING;
    const maxX = screenWidth - petWidth - EDGE_PADDING;
    const minY = EDGE_PADDING;
    const maxY = screenHeight - petHeight - EDGE_PADDING;

    newX = Math.max(minX, Math.min(newX, maxX));
    newY = Math.max(minY, Math.min(newY, maxY));

    // Ensure pet doesn't get stuck if boundaries are too small
    if (maxX < minX || maxY < minY) {
        console.warn("Screen boundaries too small for autonomous movement.");
        return petPosition; // Return current position if boundaries invalid
    }


    return { x: newX, y: newY };
  }, [petPosition, screenWidth, screenHeight, petWidth, petHeight]);

  const startMovement = useCallback(() => {
    if (isMovingRef.current || isDragging || showMenu) return; // Don't move if already moving or user interacting

    isMovingRef.current = true;
    const targetPosition = calculateNewPosition();

    // TODO: Add a 'walking' or 'moving' animation
    setCurrentAnimation('walk-animation'); // Placeholder animation name

    // Animate the movement (simple linear interpolation for now)
    // For smoother animation, consider libraries like react-spring or framer-motion
    // Or, use CSS transitions on the pet container
    const startX = petPosition.x;
    const startY = petPosition.y;
    const dx = targetPosition.x - startX;
    const dy = targetPosition.y - startY;
    const startTime = Date.now();

    const animate = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / MOVEMENT_DURATION);

      setPetPosition({
        x: startX + dx * progress,
        y: startY + dy * progress,
      });

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Movement finished
        setCurrentAnimation(null); // Clear walking animation
        isMovingRef.current = false;
        // Schedule next movement
        scheduleNextMovement();
      }
    };

    requestAnimationFrame(animate);

  }, [calculateNewPosition, setCurrentAnimation, setPetPosition, petPosition, isDragging, showMenu]);


  const scheduleNextMovement = useCallback(() => {
    if (movementTimeoutRef.current) {
      clearTimeout(movementTimeoutRef.current);
    }
    movementTimeoutRef.current = setTimeout(() => {
        // Check again before starting movement, in case interaction started during timeout
        if (!isDragging && !showMenu) {
             startMovement();
        } else {
            // If interaction is happening, reschedule after a shorter delay
            scheduleNextMovement();
        }
    }, MOVEMENT_INTERVAL * (0.8 + Math.random() * 0.4)); // Add some randomness to interval
  }, [startMovement, isDragging, showMenu]);

  useEffect(() => {
    // Start the first movement cycle
    scheduleNextMovement();

    // Cleanup on unmount
    return () => {
      if (movementTimeoutRef.current) {
        clearTimeout(movementTimeoutRef.current);
      }
      // Potentially stop any ongoing animation frame loop if component unmounts mid-move
      isMovingRef.current = false; // Prevent rescheduling if unmounted
    };
  }, [scheduleNextMovement]); // Initial setup

  // Effect to reschedule if interaction starts/stops
  useEffect(() => {
      if (isDragging || showMenu) {
          // If interaction starts, clear the scheduled movement
          if (movementTimeoutRef.current) {
              clearTimeout(movementTimeoutRef.current);
              movementTimeoutRef.current = null;
          }
          // If currently moving, we might want to stop it immediately or let it finish
          // For now, let it finish, but prevent new moves from starting
      } else {
          // If interaction stops and no movement is scheduled, schedule one
          if (!movementTimeoutRef.current && !isMovingRef.current) {
              scheduleNextMovement();
          }
      }
  }, [isDragging, showMenu, scheduleNextMovement]);


  // No return value needed as it directly modifies state via setters
}