import React, { createContext, useState, useCallback, useRef, ReactNode } from 'react';

// Define bubble types
export type BubbleType = 'thought' | 'speech' | 'notification' | 'unlock' | 'warning';

// Define the state for a single bubble instance
export interface BubbleInstance {
  id: number;
  text: string;
  type: BubbleType;
  duration: number; // Duration in ms
  timeoutId: NodeJS.Timeout | null;
}

// Define the context value type
interface BubbleContextType {
  bubbles: BubbleInstance[];
  showBubble: (text: string, type: BubbleType, duration?: number) => void;
  hideBubble: (id: number) => void;
}

// Create the context with a default value (can be undefined or a mock implementation)
export const BubbleContext = createContext<BubbleContextType | undefined>(undefined);

// Define props for the provider
interface BubbleProviderProps {
  children: ReactNode;
}

// Create the provider component
export const BubbleProvider: React.FC<BubbleProviderProps> = ({ children }) => {
  const [bubbles, setBubbles] = useState<BubbleInstance[]>([]);
  const nextId = useRef(0);

  const hideBubble = useCallback((id: number) => {
    setBubbles((prevBubbles) => prevBubbles.filter((bubble) => {
      if (bubble.id === id) {
        if (bubble.timeoutId) {
          clearTimeout(bubble.timeoutId);
        }
        return false; // Remove the bubble
      }
      return true; // Keep other bubbles
    }));
  }, []);

  const showBubble = useCallback((text: string, type: BubbleType, duration = 4000) => {
    const id = nextId.current++;
    let timeoutId: NodeJS.Timeout | null = null;

    // Set timeout to automatically hide the bubble
    timeoutId = setTimeout(() => {
      hideBubble(id);
    }, duration);

    const newBubble: BubbleInstance = { id, text, type, duration, timeoutId };

    // Add the new bubble
    // For simplicity, let's show only one bubble at a time for now
    // Clear existing bubbles before showing a new one
    setBubbles(prevBubbles => {
        prevBubbles.forEach(b => {
            if (b.timeoutId) clearTimeout(b.timeoutId);
        });
        return [newBubble]; // Replace existing bubbles
    });

    // // If you want multiple bubbles, use this instead:
    // setBubbles((prevBubbles) => [...prevBubbles, newBubble]);

  }, [hideBubble]); // Added hideBubble dependency

  const contextValue: BubbleContextType = {
    bubbles,
    showBubble,
    hideBubble,
  };

  return (
    <BubbleContext.Provider value={contextValue}>
      {children}
    </BubbleContext.Provider>
  );
};

