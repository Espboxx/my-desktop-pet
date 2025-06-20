import React from 'react';
import { PetType, PetExpression } from '../../types/petTypes';

interface PetModelProps {
  petType: PetType;
  expression: PetExpression | undefined;
}

const PetModel: React.FC<PetModelProps> = ({ petType, expression }) => {
  if (!expression) {
    // Fallback if expression is somehow undefined
    return <span>?</span>;
  }

  switch (petType.modelType) {
    case 'image':
      // Prefer expression-specific image, fallback to base image
      const imageUrl = expression.imageUrl || petType.baseImageUrl;
      // Add a class for potential specific styling
      return imageUrl ? <img src={imageUrl} alt={expression.name || petType.name} className="pet-image" /> : <span>🖼️</span>; // Fallback emoji

    case 'spritesheet':
      if (petType.spritesheetUrl && petType.spriteWidth && petType.spriteHeight && expression.spriteFrame !== undefined) {
        let backgroundPosition = '0 0';
        // Assuming spriteFrame is an index for a horizontal spritesheet for simplicity
        if (typeof expression.spriteFrame === 'number') {
          backgroundPosition = `-${expression.spriteFrame * petType.spriteWidth}px 0px`;
        } else if (typeof expression.spriteFrame === 'object') {
           // Handle {x, y} coordinates if provided
           backgroundPosition = `-${expression.spriteFrame.x * petType.spriteWidth}px -${expression.spriteFrame.y * petType.spriteHeight}px`;
        }

        return (
          <div
            className="pet-sprite" // Add a class for potential specific styling
            style={{
              width: `${petType.spriteWidth}px`,
              height: `${petType.spriteHeight}px`,
              backgroundImage: `url(${petType.spritesheetUrl})`,
              backgroundPosition: backgroundPosition,
              backgroundRepeat: 'no-repeat',
              display: 'inline-block', // Ensure div takes up space
            }}
            aria-label={expression.name || petType.name}
          />
        );
      }
      return <span>🧩</span>; // Fallback emoji

    case 'svg':
      // Prefer expression-specific SVG, fallback to base SVG
      const svgData = expression.svgData || petType.baseSvgData;
      // Basic rendering, might need refinement based on how SVG data is stored/used
      // Add a class for potential specific styling
      return svgData ? <div dangerouslySetInnerHTML={{ __html: svgData }} className="pet-svg" /> : <span>✏️</span>; // Fallback emoji

    case 'emoji':
    default:
      // Existing emoji logic
      return <span>{expression.emoji || '❓'}</span>; // Fallback emoji
  }
};

export default PetModel;