import React, { useState, useEffect } from 'react';
import { PetStatus } from '@/types/petTypes';
import { LowStatusFlags } from '@/hooks/pet/useStatusWarnings';
import './OptimizedMenuLayout.css';

interface OptimizedMenuLayoutProps {
  status: PetStatus;
  lowStatusFlags: LowStatusFlags;
  isHovering: boolean;
  children?: React.ReactNode;
}

const OptimizedMenuLayout: React.FC<OptimizedMenuLayoutProps> = ({
  status,
  lowStatusFlags,
  isHovering,
  children
}) => {
  const [showDetailedView, setShowDetailedView] = useState(false);
  const [animationClass, setAnimationClass] = useState('');

  // 计算下一级所需经验
  const calculateExpToNextLevel = (level: number): number => {
    return 100 + level * 50;
  };

  const expToNextLevel = calculateExpToNextLevel(status.level);
  const expPercentage = Math.min(100, (status.exp / expToNextLevel) * 100);

  // 检查是否有紧急状态
  const hasUrgentStatus = Object.values(lowStatusFlags).some(flag => flag);

  // 获取状态颜色
  const getStatusColor = (value: number, isLow: boolean) => {
    if (isLow) return '#ef4444'; // 红色警告
    if (value >= 80) return '#10b981'; // 绿色良好
    if (value >= 50) return '#f59e0b'; // 黄色一般
    return '#ef4444'; // 红色较低
  };

  // 状态数据配置
  const statusItems = [
    {
      key: 'mood',
      label: '心情',
      icon: '❤️',
      value: status.mood,
      isLow: lowStatusFlags.mood,
      color: getStatusColor(status.mood, lowStatusFlags.mood)
    },
    {
      key: 'cleanliness',
      label: '清洁',
      icon: '✨',
      value: status.cleanliness,
      isLow: lowStatusFlags.cleanliness,
      color: getStatusColor(status.cleanliness, lowStatusFlags.cleanliness)
    },
    {
      key: 'hunger',
      label: '饥饿',
      icon: '🍎',
      value: status.hunger,
      isLow: lowStatusFlags.hunger,
      color: getStatusColor(status.hunger, lowStatusFlags.hunger)
    },
    {
      key: 'energy',
      label: '精力',
      icon: '⚡',
      value: status.energy,
      isLow: lowStatusFlags.energy,
      color: getStatusColor(status.energy, lowStatusFlags.energy)
    }
  ];

  // 悬停效果
  useEffect(() => {
    if (isHovering) {
      setShowDetailedView(true);
      setAnimationClass('expand');
    } else {
      setAnimationClass('collapse');
      const timer = setTimeout(() => {
        setShowDetailedView(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isHovering]);

  return (
    <div className={`optimized-menu-layout ${animationClass}`}>
      {/* 主状态显示 */}
      <div className="main-status-container">
        {showDetailedView ? (
          /* 详细状态视图 */
          <div className="detailed-status-view">
            {/* 等级和经验 */}
            <div className="level-exp-section">
              <div className="level-display">
                <span className="level-icon">🎯</span>
                <span className="level-text">Lv.{status.level}</span>
              </div>
              <div className="exp-bar-container">
                <div className="exp-bar">
                  <div 
                    className="exp-fill"
                    style={{ width: `${expPercentage}%` }}
                  />
                </div>
                <span className="exp-text">{status.exp}/{expToNextLevel}</span>
              </div>
            </div>

            {/* 状态列表 */}
            <div className="status-grid">
              {statusItems.map((item) => (
                <div key={item.key} className={`status-item ${item.isLow ? 'warning' : ''}`}>
                  <div className="status-header">
                    <span className="status-icon">{item.icon}</span>
                    <span className="status-label">{item.label}</span>
                  </div>
                  <div className="status-bar-container">
                    <div className="status-bar">
                      <div 
                        className="status-fill"
                        style={{ 
                          width: `${item.value}%`,
                          backgroundColor: item.color
                        }}
                      />
                    </div>
                    <span className="status-value">{item.value}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* 简化状态视图 */
          <div className="simple-status-view">
            <div className="simple-level">
              <span className="level-icon">🎯</span>
              <span className="level-text">Lv.{status.level}</span>
              {hasUrgentStatus && (
                <span className="urgent-indicator">⚠️</span>
              )}
            </div>
            {/* 迷你状态指示器 */}
            <div className="mini-status-indicators">
              {statusItems.map((item) => (
                <div 
                  key={item.key}
                  className={`mini-indicator ${item.isLow ? 'warning' : ''}`}
                  title={`${item.label}: ${item.value}`}
                >
                  <div 
                    className="mini-fill"
                    style={{ 
                      height: `${item.value}%`,
                      backgroundColor: item.color
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 交互按钮区域 */}
      {children && (
        <div className="interaction-section">
          {children}
        </div>
      )}
    </div>
  );
};

export default OptimizedMenuLayout;
