import React from 'react';
import type { BubbleInstance } from '../../services/bubble/BubbleContext'; // Import hook and type
import { useBubbleService } from '../../services/bubble/useBubbleService';

interface PetBubbleProps {
  // bubbleState is no longer needed, fetched from context
  bubblePositionRef: React.RefObject<{ top: number; left: number }>;
}

const PetBubble: React.FC<PetBubbleProps> = ({ bubblePositionRef }) => {
  const { bubbles } = useBubbleService(); // Get bubbles from the service

  // Helper to get class name based on type
  const getBubbleClassName = (type: BubbleInstance['type']): string => {
    switch (type) {
      case 'thought': return 'thought-bubble';
      case 'notification': return 'notification-bubble'; // Example class
      case 'unlock': return 'unlock-bubble'; // Example class
      case 'warning': return 'warning-bubble'; // Example class
      case 'speech': return 'speech-bubble'; // Example class
      default: return 'bubble-default'; // Fallback class
    }
  };

  // Render all active bubbles
  return (
    <>
      {bubbles.map((bubble) => (
        <div
          key={bubble.id} // Use unique ID as key
          className={getBubbleClassName(bubble.type)}
          style={{
            // Use the ref for positioning, ensure ref.current exists
            top: bubblePositionRef.current?.top ?? -55, // Provide default value
            left: bubblePositionRef.current?.left ?? 35, // Provide default value
            position: 'absolute', // Make sure positioning context is correct
            zIndex: 100 // Ensure bubbles are on top
          }}
        >
          {bubble.text}
        </div>
      ))}
    </>
  );
};

export default PetBubble;
