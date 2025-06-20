import React, { useEffect, useState } from 'react';

interface UserInteractionInitializerProps {
  onUserInteraction: () => void;
  children: React.ReactNode;
}

/**
 * 用户交互初始化组件
 * 检测用户首次交互，启用触觉反馈等需要用户激活的功能
 */
const UserInteractionInitializer: React.FC<UserInteractionInitializerProps> = ({
  onUserInteraction,
  children
}) => {
  const [hasInteracted, setHasInteracted] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // 检查是否需要用户交互来启用功能
    const needsInteraction = 'vibrate' in navigator;
    
    if (!needsInteraction) {
      return;
    }

    // 延迟显示提示，避免立即打扰用户
    const timer = setTimeout(() => {
      if (!hasInteracted) {
        setShowPrompt(true);
      }
    }, 3000);

    const handleFirstInteraction = () => {
      if (!hasInteracted) {
        setHasInteracted(true);
        setShowPrompt(false);
        onUserInteraction();
        
        // 移除事件监听器
        document.removeEventListener('click', handleFirstInteraction);
        document.removeEventListener('touchstart', handleFirstInteraction);
        document.removeEventListener('keydown', handleFirstInteraction);
      }
    };

    // 监听各种用户交互事件
    document.addEventListener('click', handleFirstInteraction, { passive: true });
    document.addEventListener('touchstart', handleFirstInteraction, { passive: true });
    document.addEventListener('keydown', handleFirstInteraction, { passive: true });

    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('touchstart', handleFirstInteraction);
      document.removeEventListener('keydown', handleFirstInteraction);
    };
  }, [hasInteracted, onUserInteraction]);

  return (
    <>
      {children}
      
      {/* 用户交互提示 */}
      {showPrompt && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            background: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            padding: '12px 16px',
            borderRadius: '8px',
            fontSize: '14px',
            zIndex: 10000,
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
            animation: 'fadeInSlide 0.3s ease-out',
            maxWidth: '250px',
            cursor: 'pointer'
          }}
          onClick={() => {
            setHasInteracted(true);
            setShowPrompt(false);
            onUserInteraction();
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '16px' }}>🎮</span>
            <div>
              <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                启用触觉反馈
              </div>
              <div style={{ fontSize: '12px', opacity: 0.8 }}>
                点击任意位置启用振动反馈功能
              </div>
            </div>
          </div>
        </div>
      )}
      
      <style>{`
        @keyframes fadeInSlide {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </>
  );
};

export default UserInteractionInitializer;
