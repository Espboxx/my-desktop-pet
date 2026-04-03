import React, { useState, useCallback } from 'react';
import { PetType, PetExpression } from '@/types/petTypes';
import { useAutoFallback } from '@/hooks/utils/useCompatibility';
import './PetModel.css';

interface PetModelProps {
  petType: PetType;
  expression: PetExpression | undefined;
  size?: number; // 可选的尺寸参数
  className?: string; // 可选的CSS类名
}

const PetModel: React.FC<PetModelProps> = ({ petType, expression, size = 64, className = '' }) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  // 使用自动回退检查
  const { shouldUseFallback, fallbackReason, fallbackPetType } = useAutoFallback(petType);

  const handleImageLoad = useCallback(() => {
    setImageLoading(false);
    setImageError(false);
  }, []);

  const handleImageError = useCallback(() => {
    setImageLoading(false);
    setImageError(true);
  }, []);

  if (!expression) {
    // Fallback if expression is somehow undefined
    return <span className={className} title="表情未定义">?</span>;
  }

  // 使用回退的宠物类型（如果需要）
  const effectivePetType = shouldUseFallback && fallbackPetType ? fallbackPetType : petType;

  switch (effectivePetType.modelType) {
    case 'image':
    {
      // Prefer expression-specific image, fallback to base image, then to emoji
      const imageUrl = expression.imageUrl || petType.baseImageUrl;

      if (!imageUrl || imageError || shouldUseFallback) {
        // Fallback to emoji if no image URL, image failed to load, or compatibility issues
        const fallbackTitle = shouldUseFallback
          ? `${expression.name} (兼容性回退: ${fallbackReason})`
          : `${expression.name} (图像加载失败，使用emoji回退)`;

        return (
          <span
            className={`pet-emoji-fallback ${className}`}
            style={{
              fontSize: `${size * 0.75}px`,
              width: size,
              height: size,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
              backgroundColor: effectivePetType.color || 'transparent',
              border: effectivePetType.borderColor ? `2px solid ${effectivePetType.borderColor}` : 'none'
            }}
            title={fallbackTitle}
          >
            {expression.emoji || '❓'}
          </span>
        );
      }

      return (
        <div className={`pet-image-container ${className}`} style={{ width: size, height: size }}>
          {imageLoading && (
            <div
              className="pet-image-loading"
              style={{
                width: size,
                height: size,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: `${size * 0.3}px`,
                backgroundColor: effectivePetType.color || 'transparent',
                border: effectivePetType.borderColor ? `2px solid ${effectivePetType.borderColor}` : 'none'
              }}
            >
              ⏳
            </div>
          )}
          <img
            src={imageUrl}
            alt={expression.name || petType.name}
            className={`pet-image ${imageLoading ? 'loading' : ''}`}
            style={{
              width: size,
              height: size,
              objectFit: 'contain',
              display: imageLoading ? 'none' : 'block'
            }}
            onLoad={handleImageLoad}
            onError={handleImageError}
            title={expression.name}
          />
        </div>
      );
    }

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
    {
      // Prefer expression-specific SVG, fallback to base SVG
      const svgData = expression.svgData || petType.baseSvgData;
      // Basic rendering, might need refinement based on how SVG data is stored/used
      // Add a class for potential specific styling
      return svgData ? <div dangerouslySetInnerHTML={{ __html: svgData }} className="pet-svg" /> : <span>✏️</span>; // Fallback emoji
    }

    case 'emoji':
    default:
      // Existing emoji logic
      return <span>{expression.emoji || '❓'}</span>; // Fallback emoji
  }
};

export default PetModel;
