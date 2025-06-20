import React from 'react';
import { PetStatus } from '../../types/petTypes'; // Import PetStatus type
import { LowStatusFlags } from '../../hooks/pet/useStatusWarnings'; // Import LowStatusFlags type

interface PetStatusBarProps {
  status: PetStatus;
  lowStatusFlags: LowStatusFlags;
  isHovering: boolean;
}

const PetStatusBar: React.FC<PetStatusBarProps> = ({ status, lowStatusFlags, isHovering }) => {
  // Calculate EXP needed for next level function (moved from PetWindow)
  const calculateExpToNextLevel = (level: number): number => {
    return 100 + level * 50;
  };

  const expToNextLevel = calculateExpToNextLevel(status.level);
  const expPercentage = Math.min(100, (status.exp / expToNextLevel) * 100);

  // 获取状态图标
  const getStatusIcon = (type: string) => {
    const icons: Record<string, string> = {
      mood: '❤️',
      cleanliness: '✨',
      hunger: '🍎',
      energy: '⚡',
      exp: '🌟'
    };
    return icons[type] || '📊';
  };

  return (
    <div className={`status-bar ${isHovering ? 'full' : 'simple'}`}>
      {isHovering ? (
        <>
          {/* Full Status Display */}
          <div className="status-item">
            <span className="status-label">
              <span className="status-icon">{getStatusIcon('mood')}</span>
              心情
            </span>
            <div className="status-meter">
              <div
                className={`status-meter-fill mood ${lowStatusFlags.mood ? 'low-warning' : ''}`}
                style={{ width: `${status.mood}%` }}
              />
            </div>
            <span className="status-value">{status.mood}</span>
          </div>
          <div className="status-item">
            <span className="status-label">
              <span className="status-icon">{getStatusIcon('cleanliness')}</span>
              清洁
            </span>
            <div className="status-meter">
              <div
                className={`status-meter-fill cleanliness ${lowStatusFlags.cleanliness ? 'low-warning' : ''}`}
                style={{ width: `${status.cleanliness}%` }}
              />
            </div>
            <span className="status-value">{status.cleanliness}</span>
          </div>
          <div className="status-item">
            <span className="status-label">
              <span className="status-icon">{getStatusIcon('hunger')}</span>
              饥饿
            </span>
            <div className="status-meter">
              <div
                className={`status-meter-fill hunger ${lowStatusFlags.hunger ? 'low-warning' : ''}`}
                style={{ width: `${status.hunger}%` }}
              />
            </div>
            <span className="status-value">{status.hunger}</span>
          </div>
          <div className="status-item">
            <span className="status-label">
              <span className="status-icon">{getStatusIcon('energy')}</span>
              精力
            </span>
            <div className="status-meter">
              <div
                className={`status-meter-fill energy ${lowStatusFlags.energy ? 'low-warning' : ''}`}
                style={{ width: `${status.energy}%` }}
              />
            </div>
            <span className="status-value">{status.energy}</span>
          </div>
          <div className="status-item">
            <span className="status-label">
              <span className="status-icon">{getStatusIcon('exp')}</span>
              经验
            </span>
            <div className="status-meter">
              <div
                className="status-meter-fill exp"
                style={{ width: `${expPercentage}%` }}
              />
            </div>
            <span className="status-value exp-value">{`${status.exp} / ${expToNextLevel}`}</span>
          </div>
        </>
      ) : (
        <>
          {/* Simplified Status Display (Level and critical status) */}
          <div className="status-item simple-level">
            <span className="status-icon">🎯</span>
            <span className="status-value">Lv.{status.level}</span>
            {/* 显示关键状态警告 */}
            {(lowStatusFlags.mood || lowStatusFlags.energy || lowStatusFlags.hunger) && (
              <span className="status-warning">⚠️</span>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default PetStatusBar;