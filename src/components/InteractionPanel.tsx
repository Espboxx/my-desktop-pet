// src/components/InteractionPanel.tsx
import React from 'react';
import { InteractionType } from '../types/petTypes';
import './InteractionPanel.css';
// Import icons from react-icons (using Font Awesome icons here)
import {
  FaBowlFood, // feed
  FaHandHoldingHeart, // petting
  FaShower, // clean
  FaGamepad, // play
  FaBed, // sleep
  FaHand, // massage (using hand icon) - Changed from FaHandPaper
  FaBook, // learn
  FaDumbbell, // train
} from 'react-icons/fa6'; // Using Fa6 for newer icons

interface InteractionPanelProps {
  onInteraction: (type: InteractionType) => void;
}

const InteractionPanel: React.FC<InteractionPanelProps> = ({ onInteraction }) => {
  const permanentInteractions: InteractionType[] = [
    'feed',
    'petting',
    'clean',
    'play',
    'sleep',
    'massage',
    'learn',
    'train',
  ];

  // Mapping from interaction type to icon component and label
  const interactionDetails: Record<InteractionType, { icon: React.ElementType; label: string }> = {
    feed: { icon: FaBowlFood, label: '喂食' },
    petting: { icon: FaHandHoldingHeart, label: '抚摸' },
    clean: { icon: FaShower, label: '清洁' },
    play: { icon: FaGamepad, label: '玩耍' },
    sleep: { icon: FaBed, label: '睡觉' },
    massage: { icon: FaHand, label: '按摩' }, // Changed from FaHandPaper
    learn: { icon: FaBook, label: '学习' },
    train: { icon: FaDumbbell, label: '训练' },
    special: { icon: () => null, label: '特殊' }, // Placeholder for completeness
  };

  return (
    <div className="interaction-panel">
      {permanentInteractions.map((type) => {
        const details = interactionDetails[type];
        const IconComponent = details.icon;
        return (
          <button
            key={type}
            className="interaction-button"
            onClick={() => onInteraction(type)}
            title={details.label} // Keep tooltip for accessibility
          >
            <IconComponent size={18} /> {/* Render the icon component */}
          </button>
        );
      })}
    </div>
  );
};

export default InteractionPanel;