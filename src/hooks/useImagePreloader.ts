import { useEffect, useCallback, useRef } from 'react';
import imageResourceManager from '../services/imageResourceManager';
import { PET_TYPES } from '../constants/petConstants';

/**
 * 图像预加载Hook - 用于性能优化
 */
export function useImagePreloader(currentPetTypeId: string) {
  const preloadedRef = useRef(new Set<string>());
  const isWarmingUpRef = useRef(false);

  // 预热缓存 - 应用启动时调用
  const warmupCache = useCallback(async () => {
    if (isWarmingUpRef.current) return;
    
    isWarmingUpRef.current = true;
    try {
      await imageResourceManager.warmupCache(PET_TYPES);
    } catch (error) {
      console.error('Failed to warm up image cache:', error);
    } finally {
      isWarmingUpRef.current = false;
    }
  }, []);

  // 智能预加载 - 当宠物类型改变时调用
  const smartPreload = useCallback(async (petTypeId: string) => {
    if (preloadedRef.current.has(petTypeId)) return;
    
    try {
      await imageResourceManager.smartPreload(petTypeId, PET_TYPES);
      preloadedRef.current.add(petTypeId);
    } catch (error) {
      console.error('Failed to smart preload images:', error);
    }
  }, []);

  // 预加载特定表情
  const preloadExpression = useCallback(async (petTypeId: string, expressionKey: string) => {
    const petType = PET_TYPES[petTypeId];
    if (!petType || petType.modelType !== 'image') return;

    const expression = petType.expressions[expressionKey];
    if (expression?.imageUrl) {
      try {
        await imageResourceManager.preloadImage(expression.imageUrl);
      } catch (error) {
        console.error('Failed to preload expression image:', error);
      }
    }
  }, []);

  // 获取缓存统计
  const getCacheStats = useCallback(() => {
    return imageResourceManager.getCacheStats();
  }, []);

  // 清理缓存
  const clearCache = useCallback(() => {
    imageResourceManager.clearCache();
    preloadedRef.current.clear();
  }, []);

  // 当前宠物类型改变时进行智能预加载
  useEffect(() => {
    if (currentPetTypeId) {
      smartPreload(currentPetTypeId);
    }
  }, [currentPetTypeId, smartPreload]);

  // 应用启动时预热缓存
  useEffect(() => {
    // 延迟预热，避免阻塞初始渲染
    const timer = setTimeout(() => {
      warmupCache();
    }, 1000);

    return () => clearTimeout(timer);
  }, [warmupCache]);

  return {
    warmupCache,
    smartPreload,
    preloadExpression,
    getCacheStats,
    clearCache
  };
}

/**
 * 图像性能监控Hook
 */
export function useImagePerformanceMonitor() {
  const performanceDataRef = useRef({
    loadTimes: [] as number[],
    errorCount: 0,
    totalRequests: 0
  });

  const recordLoadTime = useCallback((loadTime: number) => {
    const data = performanceDataRef.current;
    data.loadTimes.push(loadTime);
    data.totalRequests++;
    
    // 只保留最近100次的记录
    if (data.loadTimes.length > 100) {
      data.loadTimes.shift();
    }
  }, []);

  const recordError = useCallback(() => {
    performanceDataRef.current.errorCount++;
    performanceDataRef.current.totalRequests++;
  }, []);

  const getPerformanceStats = useCallback(() => {
    const data = performanceDataRef.current;
    const avgLoadTime = data.loadTimes.length > 0 
      ? data.loadTimes.reduce((sum, time) => sum + time, 0) / data.loadTimes.length 
      : 0;
    
    const errorRate = data.totalRequests > 0 
      ? (data.errorCount / data.totalRequests) * 100 
      : 0;

    return {
      averageLoadTime: Math.round(avgLoadTime),
      errorRate: Math.round(errorRate * 100) / 100,
      totalRequests: data.totalRequests,
      errorCount: data.errorCount,
      recentLoadTimes: [...data.loadTimes]
    };
  }, []);

  const resetStats = useCallback(() => {
    performanceDataRef.current = {
      loadTimes: [],
      errorCount: 0,
      totalRequests: 0
    };
  }, []);

  return {
    recordLoadTime,
    recordError,
    getPerformanceStats,
    resetStats
  };
}

/**
 * 自适应图像质量Hook
 */
export function useAdaptiveImageQuality() {
  const qualityRef = useRef<'high' | 'medium' | 'low'>('high');

  const adjustQuality = useCallback((performanceStats: any) => {
    const { averageLoadTime, errorRate } = performanceStats;
    
    // 根据性能指标调整图像质量
    if (averageLoadTime > 2000 || errorRate > 10) {
      qualityRef.current = 'low';
    } else if (averageLoadTime > 1000 || errorRate > 5) {
      qualityRef.current = 'medium';
    } else {
      qualityRef.current = 'high';
    }
  }, []);

  const getQualitySettings = useCallback(() => {
    const quality = qualityRef.current;
    
    switch (quality) {
      case 'low':
        return {
          maxSize: 32,
          compression: 0.7,
          format: 'jpeg'
        };
      case 'medium':
        return {
          maxSize: 48,
          compression: 0.8,
          format: 'webp'
        };
      case 'high':
      default:
        return {
          maxSize: 64,
          compression: 0.9,
          format: 'png'
        };
    }
  }, []);

  return {
    currentQuality: qualityRef.current,
    adjustQuality,
    getQualitySettings
  };
}
