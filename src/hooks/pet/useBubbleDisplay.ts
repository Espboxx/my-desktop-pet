import { useCallback } from 'react';
import { PetStatus } from '../../types/petTypes';

/**
 * 气泡显示hook
 * @param setStatus 设置状态的函数
 * @returns 显示气泡的函数
 */
export function useBubbleDisplay(
  setStatus: React.Dispatch<React.SetStateAction<PetStatus>>,
  statusRef: React.MutableRefObject<PetStatus>
) {
  // 显示气泡的辅助函数
  const showBubble = useCallback((text: string, type: 'thought' | 'speech', duration = 3000) => {
    // 清除现有的超时
    if (statusRef.current.bubble.timeout) { // 使用ref避免过时闭包问题
      clearTimeout(statusRef.current.bubble.timeout);
    }

    // 使用 setTimeout 将状态更新推迟到下一个事件循环
    // 这样可以避免在渲染过程中更新状态
    setTimeout(() => {
      let timeoutId: number | null = null; // 在此处声明timeoutId
      setStatus(prev => {
        // 再次检查是否另一个气泡在此期间被激活
        if (prev.bubble.active && prev.bubble.text !== text) {
          // 如果一个不同的气泡是活动的，不要覆盖，而是清除其超时
          if (prev.bubble.timeout) clearTimeout(prev.bubble.timeout);
          // 保持现有气泡活动
          return prev;
        }

        // 设置新气泡为活动状态
        const newBubbleState = {
          active: true,
          text,
          type,
          timeout: null // 超时ID将稍后设置
        };

        // 设置计时器以隐藏这个新气泡
        timeoutId = window.setTimeout(() => {
          setStatus(current => {
            // 仅当这个特定气泡仍然是活动的才停用
            if (current.bubble.active && current.bubble.text === text) {
              return {
                ...current,
                bubble: { ...current.bubble, active: false, timeout: null }
              };
            }
            return current; // 否则，对于此气泡而言状态未改变
          });
        }, duration);

        // 返回带有新气泡和其超时ID的状态
        return {
          ...prev,
          bubble: { ...newBubbleState, timeout: timeoutId as unknown as number }
        };
      });
    }, 0); // 稍微延迟状态更新
  }, [setStatus, statusRef]); // 依赖: setStatus (稳定)

  return { showBubble };
}