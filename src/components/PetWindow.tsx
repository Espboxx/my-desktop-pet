import React, { useState, useEffect, useRef, useCallback } from 'react'; // Add useCallback
import { PetType, PetExpression } from '../types/petTypes'; // Import PetExpression
import { PET_TYPES } from '../constants/petConstants';
import { useSharedPetStatus } from '../context/PetStatusContext'; // Import context hook
import usePetAnimation from '../hooks/usePetAnimation';
import usePetInteraction from '../hooks/usePetInteraction';
import useAutonomousMovement from '../hooks/useAutonomousMovement'; // Import the new hook
import '../styles/PetWindow.css';

const PetWindow: React.FC = () => {
  const desktopPet = window.desktopPet;
  const [isHovering, setIsHovering] = useState(false); // State to track hover

  // Use shared context hook to manage status
  const {
    status,
    setStatus,
    lowStatusFlags,
    newlyUnlocked,
    clearNewlyUnlocked,
    isLoaded, // Get status and functions from context
    isBlinking, // Get blinking state from context
    currentIdleAnimation, // Get current idle animation state from context
    currentPetTypeId, // Get current pet type ID from context
    initialPosition // Get the loaded initial position
  } = useSharedPetStatus();
  const [unlockNotification, setUnlockNotification] = useState<string | null>(null); // Notification state
  
  // 气泡位置引用
  const bubblePositionRef = useRef<{top: number, left: number}>({top: -55, left: 35}); // Adjusted bubble position

  const {
    currentAnimation,
    setCurrentAnimation,
    statusChangeAnimation,
    // setStatusChangeAnimation, // Not used directly in rendering logic below
    levelUpAnimation,
    // setLevelUpAnimation // Not used directly in rendering logic below
  } = usePetAnimation();

  const {
    handleMouseDown,
    handleMouseEnter: originalHandleMouseEnter,
    handleMouseLeave: originalHandleMouseLeave,
    handleContextMenu,
    handleAction,
    petPosition,
    menuPosition,
    showMenu,
    // setShowMenu, // Not used directly
    menuRef,
    petRef,
    isMouseOverPet, // Keep this as it's used in getExpressionConfig
    mouseDirection, // Get mouse direction
    isDragging, // Renamed from isCurrentlyDragging
    reactionAnimation, // Get reaction animation state
    setPetPosition // Get the position setter
  } = usePetInteraction({ status, setStatus, setCurrentAnimation, initialPosition }); // Pass initialPosition
  // State for pet dimensions
  const [petDimensions, setPetDimensions] = useState({ width: 80, height: 80 }); // Default size

  // Effect to get pet dimensions after mount/update
  useEffect(() => {
    if (petRef.current) {
      const rect = petRef.current.getBoundingClientRect();
      // Check if dimensions are valid before setting state
      if (rect.width > 0 && rect.height > 0) {
           setPetDimensions({ width: rect.width, height: rect.height });
      } else {
          // Fallback or retry logic if dimensions are zero initially
          // For now, just log a warning
          console.warn("Pet dimensions are zero initially. Using default.");
      }
    }
  }, [petRef]); // Re-run if petRef changes (though unlikely)

  // Get screen dimensions (consider resize events for dynamic updates)
  const [screenDimensions, setScreenDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });

  useEffect(() => {
      const handleResize = () => {
          setScreenDimensions({ width: window.innerWidth, height: window.innerHeight });
      };
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
  }, []);


  // Initialize autonomous movement hook
  useAutonomousMovement({
    petPosition,
    setPetPosition,
    setCurrentAnimation,
    isDragging,
    showMenu,
    screenWidth: screenDimensions.width,
    screenHeight: screenDimensions.height,
    petWidth: petDimensions.width,
    petHeight: petDimensions.height,
  });

  // Load settings (Simplified, assuming settings might be part of initial state loading now)
  // React.useEffect(() => {
  //   const loadSettings = async () => {
  //     try {
  //       const settings = await desktopPet.getPetSettings();
  //       setStatus((prev: PetStatus) => ({ ...prev, ...settings }));
  //     } catch (error) {
  //       console.error('加载设置失败:', error);
  //     }
  //   };
  //   loadSettings();
  // }, [setStatus]); // Added setStatus dependency

  // Find the PetType object based on the ID from context, fallback to default
  const currentPetType: PetType = PET_TYPES[currentPetTypeId] || PET_TYPES['default'];

  // --- Expression selection logic ---
  const getExpressionConfig = () => {
    // Priority: Interaction or status change animations
    if (currentAnimation) {
      // Example: if (currentAnimation === 'eat-animation') return petType.expressions['eating'] || petType.expressions['normal'];
      return currentPetType.expressions['happy'] || currentPetType.expressions['normal']; // Temporary happy during animation
    }
    if (statusChangeAnimation) {
      return currentPetType.expressions['normal']; // Normal during status change animation
    }

    // Priority 3: Eye tracking (only when mouse is over pet and no other animation is overriding)
    if (isMouseOverPet.current && mouseDirection !== 'center') { // isMouseOverPet is used here
      const lookExpressionKey = `look_${mouseDirection.replace('-', '_')}`;
      // Ensure the look expression exists, otherwise fallback might be needed, but normal is okay for now
      if (currentPetType.expressions[lookExpressionKey]) {
        return currentPetType.expressions[lookExpressionKey];
      }
      // If look expression doesn't exist, proceed to status-based expressions
    }

    // Priority 4: Status-based expressions
    // Simplified logic:
    if (status.mood > 80 && currentPetType.expressions['happy']) return currentPetType.expressions['happy'];
    if (status.mood < 20 && currentPetType.expressions['sad']) return currentPetType.expressions['sad']; // Assuming a 'sad' expression exists
    if (lowStatusFlags.energy && currentPetType.expressions['sleepy']) return currentPetType.expressions['sleepy']; // Assuming 'sleepy' expression

    // Random high-level expressions (adjust probability)
    if (status.mood > 70) {
      const rand = Math.random();
      if (status.level >= 15 && rand > 0.85 && currentPetType.expressions['level15']) return currentPetType.expressions['level15'];
      if (status.level >= 10 && rand > 0.75 && currentPetType.expressions['level10']) return currentPetType.expressions['level10'];
      if (status.level >= 5 && rand > 0.65 && currentPetType.expressions['level5']) return currentPetType.expressions['level5'];
    }

    // --- Removed block that incorrectly tried to select expression based on idle animation name ---

    // Default to normal if no special animation chosen or available
    return currentPetType.expressions['normal'];
  };

  const expressionConfig = getExpressionConfig();
  // --------------------

  // 动画优先级管理函数
  const getAnimationClasses = (): string => {
    // 拖拽动画优先级最高 - 移除 dragging-shake 以提高性能
    // if (isDragging) { // Use isDragging
    //   return `dragging-shake`; // 移除这个动画，因为它与 transform: translate 冲突
    // }
    // 拖动时，只应用 picked-up 和 landed 动画（由 usePetInteraction 控制 currentAnimation）
    
    // 交互动画优先级第二
    if (currentAnimation) {
      return currentAnimation;
    }
    
    // 状态变化动画优先级第三
    if (statusChangeAnimation) {
      return statusChangeAnimation;
    }
    
    // 反应动画优先级第四
    if (reactionAnimation) {
      return reactionAnimation;
    }
    
    // 眨眼和空闲动画可以同时存在，因为它们作用于不同的部分
    let baseClasses = '';
    
    // 眨眼动画
    if (isBlinking) {
      baseClasses += ` blink-animation`;
    }
    
    // 空闲动画（如伸展、摇晃等）
    if (currentIdleAnimation && !isBlinking) {
      baseClasses += ` ${currentIdleAnimation}`;
    }
    
    return baseClasses.trim();
  };

  // --- Unlock notification logic ---
  useEffect(() => {
    if (newlyUnlocked.length > 0) {
      // Combine unlocks from status hook and potential expression unlocks
      const allUnlocks = [...newlyUnlocked];
      // Example: Check for expression unlocks (if expressions have unlock levels)
      // for (const key in petType.expressions) {
      //   const expression = petType.expressions[key];
      //   if (expression.unlockLevel === status.level) {
      //     allUnlocks.push(`表情: ${expression.name}`);
      //   }
      // }

      if (allUnlocks.length > 0) {
        const notificationMessage = `新解锁: ${allUnlocks.join(', ')}!`;
        setUnlockNotification(notificationMessage);
        clearNewlyUnlocked(); // Clear the hook state

        const timer = setTimeout(() => {
          setUnlockNotification(null);
        }, 4000); // Display for 4 seconds

        return () => clearTimeout(timer);
      } else {
        // If no relevant unlocks found, still clear the hook state
        clearNewlyUnlocked();
      }
    }
  }, [newlyUnlocked, clearNewlyUnlocked, status.level, currentPetType.expressions]); // Added dependencies
  // --------------------

  // --- Wrapped Mouse Handlers ---
  const wrappedHandleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    originalHandleMouseEnter(e);
    setIsHovering(true);
  };

  const wrappedHandleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    originalHandleMouseLeave(e);
    setIsHovering(false);
  };

  // 用于显示思考气泡的函数
  const showThoughtBubble = (text: string, duration = 3000) => {
    if (!petRef.current) return;
    
    // 更新状态以显示气泡
    setStatus(prev => ({
      ...prev,
      bubble: {
        active: true,
        text,
        type: 'thought',
        timeout: null
      }
    }));
    
    // 设置自动隐藏气泡的计时器
    const timeoutId = window.setTimeout(() => {
      setStatus(prev => ({
        ...prev,
        bubble: {
          ...prev.bubble,
          active: false
        }
      }));
    }, duration);
    
    // 更新超时引用
    setStatus(prev => ({
      ...prev,
      bubble: {
        ...prev.bubble,
        timeout: timeoutId as unknown as number
      }
    }));
  };
  // ---------------------------

  // Loading state check moved below all hook calls

  // (Removed handleTestBubble function)

  // 清理计时器
  useEffect(() => {
    return () => {
      if (status.bubble.timeout) {
        clearTimeout(status.bubble.timeout);
      }
    };
  }, [status.bubble.timeout]);

  // --- 自动思考逻辑 ---
  useEffect(() => {
    const thoughtTexts = [
      "今天天气真好~",
      "有点饿了...",
      "主人在干什么呢？",
      "zzZ...", // 困了
      "要努力升级！",
      "感觉自己萌萌哒！",
      "想听音乐...",
      "今天也要元气满满！",
      "（思考人生）",
      "好想玩游戏...",
      "清洁度好像有点低了...", // 状态相关
      "心情不错！" // 状态相关
    ];

    const intervalId = setInterval(() => {
      // 如果当前没有气泡，并且随机数大于 0.7 (30% 概率触发思考)
      if (!status.bubble.active && Math.random() > 0.7) {
        let possibleTexts = [...thoughtTexts];

        // 根据状态筛选想法 (示例)
        if (status.hunger < 40) {
          possibleTexts.push("肚子咕咕叫了...", "想吃好吃的！");
        }
        if (status.mood < 40) {
          possibleTexts.push("有点不开心...", "需要主人的关爱~");
        }
        if (status.energy < 30) {
          possibleTexts.push("好困啊...", "想睡觉了...");
        }
        if (status.cleanliness < 50) {
          possibleTexts.push("身上有点脏了...", "需要洗澡澡！");
        }

        const randomText = possibleTexts[Math.floor(Math.random() * possibleTexts.length)];
        showThoughtBubble(randomText, 3500); // 显示 3.5 秒
      }
    }, 15000); // 每 15 秒检查一次

    // 组件卸载时清除定时器
    return () => clearInterval(intervalId);

  }, [status.bubble.active, status.hunger, status.mood, status.energy, status.cleanliness, setStatus]); // 添加依赖项
  // --------------------

  // Show loading state if not loaded yet (Moved here)
  if (!isLoaded) {
      return <div className="loading-placeholder">加载中...</div>; // Basic loading indicator
  }
  // Helper function to render pet based on model type
  const renderPetModel = (petType: PetType, expression: PetExpression | undefined) => {
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

  return (
    <div
      className="pet-container"
      style={{
        transform: `translate(${petPosition.x}px, ${petPosition.y}px)`
      }}
      ref={petRef} // Assign petRef to the container
    >
      {/* Pet Element */}
      <div
        className={`pet ${getAnimationClasses()}`}
        onMouseDown={handleMouseDown}
        onMouseEnter={wrappedHandleMouseEnter} // Use wrapped handler
        onMouseLeave={wrappedHandleMouseLeave} // Use wrapped handler
        onContextMenu={handleContextMenu}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }} // Use isDragging
      >
        <div
          className="pet-body"
          // Apply style conditionally based on model type
          style={currentPetType.modelType === 'emoji' ? {
            backgroundColor: currentPetType.color,
            borderColor: currentPetType.borderColor,
          } : {
            // Reset background/border for non-emoji types if needed, or leave empty
            backgroundColor: 'transparent',
            borderColor: 'transparent',
          }}
        >
          {/* Render pet based on its type */}
          {renderPetModel(currentPetType, expressionConfig)}
        </div>
        
        {/* 思考气泡 */}
        {status.bubble.active && status.bubble.type === 'thought' && (
          <div
            className="thought-bubble"
            style={{
              top: bubblePositionRef.current.top,
              left: bubblePositionRef.current.left
            }}
          >
            {status.bubble.text}
          </div>
        )}
      </div>
      
      {/* (Removed Test Button) */}
        {/* Menu */}
        {showMenu && menuPosition && (
        <div
          className="pet-menu"
          style={{
            // Position relative to the container, adjust as needed
            top: menuPosition.top - petPosition.y,
            left: menuPosition.left - petPosition.x
          }}
          ref={menuRef}
        >
          <button onClick={() => handleAction('feed')}>喂食</button>
          <button onClick={() => handleAction('pet')}>抚摸</button>
          <button onClick={() => handleAction('play')}>玩耍</button>
          <button onClick={() => handleAction('clean')}>清洁</button>
          <button onClick={() => handleAction('sleep')}>睡觉</button>
          <button onClick={() => handleAction('massage')}>按摩</button>
          <button onClick={() => handleAction('photo')}>拍照</button>
          {status.level >= 3 && <button onClick={() => handleAction('train')}>训练</button>}
          {status.level >= 5 && <button onClick={() => handleAction('learn')}>学习</button>}
          <hr />
          <button onClick={() => handleAction('status')}>状态详情</button>
          <button onClick={() => handleAction('skin')}>切换皮肤</button>
          <button onClick={() => handleAction('name')}>设置名称</button>
          <hr />
          <button onClick={() => handleAction('settings')}>设置</button>
          <button onClick={() => handleAction('minimize')}>最小化</button>
          <button onClick={() => handleAction('exit')}>退出</button>
        </div>
      )}

      {/* Status Bar - Positioned absolutely via CSS */}
      <div className={`status-bar ${isHovering ? 'full' : 'simple'}`}>
         {isHovering ? (
           <>
             {/* Full Status Display */}
             <div className="status-item">
               <span className="status-label">心情</span>
               <div className="status-meter">
                 <div
                   className={`status-meter-fill mood ${lowStatusFlags.mood ? 'low-warning' : ''}`}
                   style={{ width: `${status.mood}%` }}
                 />
               </div>
               <span className="status-value">{status.mood}</span>
             </div>
             <div className="status-item">
               <span className="status-label">清洁</span>
               <div className="status-meter">
                 <div
                   className={`status-meter-fill cleanliness ${lowStatusFlags.cleanliness ? 'low-warning' : ''}`}
                   style={{ width: `${status.cleanliness}%` }}
                 />
               </div>
               <span className="status-value">{status.cleanliness}</span>
             </div>
             <div className="status-item">
               <span className="status-label">饥饿</span>
               <div className="status-meter">
                 <div
                   className={`status-meter-fill hunger ${lowStatusFlags.hunger ? 'low-warning' : ''}`}
                   style={{ width: `${status.hunger}%` }}
                 />
               </div>
               <span className="status-value">{status.hunger}</span>
             </div>
             <div className="status-item">
               <span className="status-label">精力</span>
               <div className="status-meter">
                 <div
                   className={`status-meter-fill energy ${lowStatusFlags.energy ? 'low-warning' : ''}`}
                   style={{ width: `${status.energy}%` }}
                 />
               </div>
               <span className="status-value">{status.energy}</span>
             </div>
             <div className="status-item">
               <span className="status-label">经验</span>
               <div className="status-meter">
                 <div
                   className="status-meter-fill exp"
                   style={{ width: `${Math.min(100, (status.exp / (100 + status.level * 50)) * 100)}%` }}
                 />
               </div>
               {/* Calculate EXP needed for next level */}
               {(() => {
                 const expToNextLevel = 100 + status.level * 50;
                 return (
                   <span className="status-value exp-value">{`${status.exp} / ${expToNextLevel}`}</span>
                 );
               })()}
             </div>
           </>
         ) : (
           <>
             {/* Simplified Status Display (Level Only) */}
             <div className="status-item simple-level">
               <span className="status-value">Lv.{status.level}</span>
             </div>
           </>
         )}
       </div>

      {/* Level Up Animation */}
      {levelUpAnimation && (
        <div className="level-up-animation">
          升级! {status.level}
        </div>
      )}

      {/* Unlock Notification */}
      {unlockNotification && (
        <div className="unlock-notification">
          {unlockNotification}
        </div>
      )}
    </div>
  );
};

export default PetWindow;
