import { useState, useEffect } from 'react';
import { PetStatus } from '../../types/petTypes';

/**
 * 状态警告hook
 * 处理低状态提醒和相应的气泡消息
 */
export function useStatusWarnings(
  status: PetStatus,
  showBubble: (text: string, type: 'thought' | 'speech', duration?: number) => void
) {
  // 显式定义低状态标志的键
  const [lowStatusFlags, setLowStatusFlags] = useState<Record<'mood' | 'cleanliness' | 'hunger' | 'energy', boolean>>({
    mood: false,
    cleanliness: false,
    hunger: false, // 高时发出饥饿警告
    energy: false,
  });

  // 更新低状态标志
  useEffect(() => {
    const newLowFlags = {
      mood: status.mood < 20,
      cleanliness: status.cleanliness < 20,
      hunger: status.hunger > 80, // 高时发出饥饿警告
      energy: status.energy < 20
    };
    setLowStatusFlags(newLowFlags);

    // 为低状态触发主动思考气泡（仅当没有其他气泡活动时）
    if (!status.bubble.active) {
      let warningText = "";
      // 低状态气泡的简化随机选择
      if (newLowFlags.mood && Math.random() < 0.3) warningText = ["心情不太好...", "有点难过...", "想要被安慰..."][Math.floor(Math.random() * 3)];
      else if (newLowFlags.hunger && Math.random() < 0.3) warningText = ["好饿啊...", "想吃东西...", "肚子咕咕叫了..."][Math.floor(Math.random() * 3)];
      else if (newLowFlags.energy && Math.random() < 0.3) warningText = ["好困...", "需要休息...", "要睡着了..."][Math.floor(Math.random() * 3)];
      else if (newLowFlags.cleanliness && Math.random() < 0.3) warningText = ["感觉不太干净...", "需要清洁...", "有点脏了..."][Math.floor(Math.random() * 3)];

      if (warningText) {
        showBubble(warningText, 'thought');
      }
    }
  }, [status, showBubble]); // 依赖: status, showBubble

  return { lowStatusFlags };
}