// 窗口特效Hook
// 提供丝滑置顶等窗口特效功能

import { useState, useCallback, useEffect, useRef } from 'react';
import type { 
  SmoothTopMostConfig, 
  WindowEffectsResponse, 
  WindowEffectsConfigResponse,
  WindowAnimationStatusResponse 
} from '../../types/windowEffects';

interface UseWindowEffectsReturn {
  // 状态
  config: SmoothTopMostConfig | null;
  isAnimating: boolean;
  isLoading: boolean;
  error: string | null;
  
  // 方法
  smoothBringToTop: () => Promise<boolean>;
  cancelTopMost: () => Promise<boolean>;
  updateConfig: (newConfig: Partial<SmoothTopMostConfig>) => Promise<boolean>;
  refreshConfig: () => Promise<void>;
  refreshAnimationStatus: () => Promise<void>;
  
  // 便捷方法
  enableSmoothEffects: () => Promise<boolean>;
  disableSmoothEffects: () => Promise<boolean>;
  setAnimationDuration: (duration: number) => Promise<boolean>;
  setEasingFunction: (easing: SmoothTopMostConfig['easing']) => Promise<boolean>;
}

// 默认配置
const DEFAULT_CONFIG: SmoothTopMostConfig = {
  duration: 300,
  steps: 20,
  easing: 'easeInOut',
  enabled: true
};

export function useWindowEffects(): UseWindowEffectsReturn {
  // 状态管理
  const [config, setConfig] = useState<SmoothTopMostConfig | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 防止重复调用的引用
  const isInitializedRef = useRef(false);
  const animationCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 错误处理辅助函数
  const handleError = useCallback((error: string, context: string) => {
    console.error(`[useWindowEffects] ${context}:`, error);
    setError(error);
  }, []);

  // 清除错误
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // 检查API可用性
  const checkAPIAvailability = useCallback((): boolean => {
    if (!window.desktopPet?.smoothBringToTop) {
      handleError('窗口特效API不可用', 'API检查');
      return false;
    }
    return true;
  }, [handleError]);

  // 刷新配置
  const refreshConfig = useCallback(async (): Promise<void> => {
    if (!checkAPIAvailability()) return;

    try {
      setIsLoading(true);
      clearError();
      
      const response: WindowEffectsConfigResponse = await window.desktopPet.getWindowEffectsConfig();
      
      if (response.success && response.config) {
        setConfig(response.config);
        console.log('[useWindowEffects] 配置已刷新:', response.config);
      } else {
        handleError(response.error || '获取配置失败', '刷新配置');
        // 使用默认配置作为降级
        setConfig(DEFAULT_CONFIG);
      }
    } catch (error) {
      handleError((error as Error).message, '刷新配置');
      setConfig(DEFAULT_CONFIG);
    } finally {
      setIsLoading(false);
    }
  }, [checkAPIAvailability, handleError, clearError]);

  // 刷新动画状态
  const refreshAnimationStatus = useCallback(async (): Promise<void> => {
    if (!checkAPIAvailability()) return;

    try {
      const response: WindowAnimationStatusResponse = await window.desktopPet.isWindowAnimating();
      
      if (response.success) {
        setIsAnimating(response.isAnimating);
      } else {
        handleError(response.error || '获取动画状态失败', '刷新动画状态');
      }
    } catch (error) {
      handleError((error as Error).message, '刷新动画状态');
    }
  }, [checkAPIAvailability, handleError]);

  // 丝滑置顶
  const smoothBringToTop = useCallback(async (): Promise<boolean> => {
    if (!checkAPIAvailability()) return false;

    try {
      setIsLoading(true);
      clearError();
      
      console.log('[useWindowEffects] 开始执行丝滑置顶');
      const response: WindowEffectsResponse = await window.desktopPet.smoothBringToTop();
      
      if (response.success) {
        console.log('[useWindowEffects] 丝滑置顶成功');
        // 刷新动画状态
        await refreshAnimationStatus();
        return true;
      } else {
        handleError(response.error || '置顶失败', '丝滑置顶');
        return false;
      }
    } catch (error) {
      handleError((error as Error).message, '丝滑置顶');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [checkAPIAvailability, clearError, handleError, refreshAnimationStatus]);

  // 取消置顶
  const cancelTopMost = useCallback(async (): Promise<boolean> => {
    if (!checkAPIAvailability()) return false;

    try {
      setIsLoading(true);
      clearError();
      
      console.log('[useWindowEffects] 取消置顶');
      const response: WindowEffectsResponse = await window.desktopPet.cancelTopMost();
      
      if (response.success) {
        console.log('[useWindowEffects] 取消置顶成功');
        return true;
      } else {
        handleError(response.error || '取消置顶失败', '取消置顶');
        return false;
      }
    } catch (error) {
      handleError((error as Error).message, '取消置顶');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [checkAPIAvailability, clearError, handleError]);

  // 更新配置
  const updateConfig = useCallback(async (newConfig: Partial<SmoothTopMostConfig>): Promise<boolean> => {
    if (!checkAPIAvailability()) return false;

    try {
      setIsLoading(true);
      clearError();
      
      console.log('[useWindowEffects] 更新配置:', newConfig);
      const response: WindowEffectsConfigResponse = await window.desktopPet.updateWindowEffectsConfig(newConfig);
      
      if (response.success && response.config) {
        setConfig(response.config);
        console.log('[useWindowEffects] 配置更新成功:', response.config);
        return true;
      } else {
        handleError(response.error || '更新配置失败', '更新配置');
        return false;
      }
    } catch (error) {
      handleError((error as Error).message, '更新配置');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [checkAPIAvailability, clearError, handleError]);

  // 便捷方法：启用平滑效果
  const enableSmoothEffects = useCallback(async (): Promise<boolean> => {
    return updateConfig({ enabled: true });
  }, [updateConfig]);

  // 便捷方法：禁用平滑效果
  const disableSmoothEffects = useCallback(async (): Promise<boolean> => {
    return updateConfig({ enabled: false });
  }, [updateConfig]);

  // 便捷方法：设置动画持续时间
  const setAnimationDuration = useCallback(async (duration: number): Promise<boolean> => {
    if (duration < 100 || duration > 2000) {
      handleError('动画持续时间必须在100-2000毫秒之间', '设置动画持续时间');
      return false;
    }
    return updateConfig({ duration });
  }, [updateConfig, handleError]);

  // 便捷方法：设置缓动函数
  const setEasingFunction = useCallback(async (easing: SmoothTopMostConfig['easing']): Promise<boolean> => {
    return updateConfig({ easing });
  }, [updateConfig]);

  // 初始化
  useEffect(() => {
    if (!isInitializedRef.current) {
      isInitializedRef.current = true;
      refreshConfig();
    }
  }, [refreshConfig]);

  // 定期检查动画状态（仅在动画期间）
  useEffect(() => {
    if (isAnimating) {
      animationCheckIntervalRef.current = setInterval(() => {
        refreshAnimationStatus();
      }, 100); // 每100ms检查一次
    } else {
      if (animationCheckIntervalRef.current) {
        clearInterval(animationCheckIntervalRef.current);
        animationCheckIntervalRef.current = null;
      }
    }

    return () => {
      if (animationCheckIntervalRef.current) {
        clearInterval(animationCheckIntervalRef.current);
      }
    };
  }, [isAnimating, refreshAnimationStatus]);

  // 清理
  useEffect(() => {
    return () => {
      if (animationCheckIntervalRef.current) {
        clearInterval(animationCheckIntervalRef.current);
      }
    };
  }, []);

  return {
    // 状态
    config,
    isAnimating,
    isLoading,
    error,
    
    // 方法
    smoothBringToTop,
    cancelTopMost,
    updateConfig,
    refreshConfig,
    refreshAnimationStatus,
    
    // 便捷方法
    enableSmoothEffects,
    disableSmoothEffects,
    setAnimationDuration,
    setEasingFunction,
  };
}
