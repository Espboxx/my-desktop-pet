import { useEffect, useRef, useCallback } from 'react';

interface PerformanceMetrics {
  renderCount: number;
  lastRenderTime: number;
  averageRenderTime: number;
  maxRenderTime: number;
  memoryUsage?: number;
}

interface BrowserMemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

interface PerformanceWithMemory extends Performance {
  memory?: BrowserMemoryInfo;
}

/**
 * 性能监控hook
 * 监控组件渲染性能和内存使用
 */
export function usePerformanceMonitor(componentName: string, enabled: boolean = false) {
  const metricsRef = useRef<PerformanceMetrics>({
    renderCount: 0,
    lastRenderTime: 0,
    averageRenderTime: 0,
    maxRenderTime: 0
  });
  
  const renderStartTimeRef = useRef<number>(0);
  const renderTimesRef = useRef<number[]>([]);

  // 开始渲染计时
  const startRender = useCallback(() => {
    if (!enabled) return;
    renderStartTimeRef.current = performance.now();
  }, [enabled]);

  // 结束渲染计时
  const endRender = useCallback(() => {
    if (!enabled || renderStartTimeRef.current === 0) return;
    
    const renderTime = performance.now() - renderStartTimeRef.current;
    const metrics = metricsRef.current;
    
    metrics.renderCount++;
    metrics.lastRenderTime = renderTime;
    metrics.maxRenderTime = Math.max(metrics.maxRenderTime, renderTime);
    
    // 保持最近100次渲染的记录
    renderTimesRef.current.push(renderTime);
    if (renderTimesRef.current.length > 100) {
      renderTimesRef.current.shift();
    }
    
    // 计算平均渲染时间
    metrics.averageRenderTime = renderTimesRef.current.reduce((a, b) => a + b, 0) / renderTimesRef.current.length;
    
    // 获取内存使用情况（如果可用）
    if ('memory' in performance) {
      metrics.memoryUsage = (performance as PerformanceWithMemory).memory?.usedJSHeapSize;
    }
    
    renderStartTimeRef.current = 0;
  }, [enabled]);

  // 记录渲染开始
  startRender();

  // 记录渲染结束
  useEffect(() => {
    endRender();
  });

  // 获取性能指标
  const getMetrics = useCallback((): PerformanceMetrics => {
    return { ...metricsRef.current };
  }, []);

  // 重置指标
  const resetMetrics = useCallback(() => {
    metricsRef.current = {
      renderCount: 0,
      lastRenderTime: 0,
      averageRenderTime: 0,
      maxRenderTime: 0
    };
    renderTimesRef.current = [];
  }, []);

  // 记录性能警告 (优化警告频率)
  const logPerformanceWarnings = useCallback(() => {
    if (!enabled) return;

    const metrics = metricsRef.current;

    // 只在开发环境显示警告
    if (process.env.NODE_ENV !== 'development') return;

    if (metrics.lastRenderTime > 32) { // 提高阈值到30fps，减少警告
      console.warn(`${componentName}: Slow render detected (${metrics.lastRenderTime.toFixed(2)}ms)`);
    }

    if (metrics.averageRenderTime > 20) { // 提高阈值
      console.warn(`${componentName}: High average render time (${metrics.averageRenderTime.toFixed(2)}ms)`);
    }

    if (metrics.renderCount > 5000) { // 提高阈值，减少警告频率
      console.warn(`${componentName}: High render count (${metrics.renderCount})`);
    }
  }, [componentName, enabled]);

  // 定期检查性能 (减少检查频率)
  useEffect(() => {
    if (!enabled || process.env.NODE_ENV !== 'development') return;

    const interval = setInterval(() => {
      logPerformanceWarnings();
    }, 30000); // 每30秒检查一次，减少频率

    return () => clearInterval(interval);
  }, [logPerformanceWarnings, enabled]);

  return {
    getMetrics,
    resetMetrics,
    logPerformanceWarnings
  };
}

/**
 * 内存使用监控hook
 */
export function useMemoryMonitor(enabled: boolean = false) {
  const lastMemoryUsageRef = useRef<number>(0);

  const getMemoryUsage = useCallback(() => {
    if (!enabled || !('memory' in performance)) return null;
    
    const memory = (performance as PerformanceWithMemory).memory;
    if (!memory) return null;

    return {
      used: memory.usedJSHeapSize,
      total: memory.totalJSHeapSize,
      limit: memory.jsHeapSizeLimit
    };
  }, [enabled]);

  const checkMemoryLeak = useCallback(() => {
    if (!enabled) return false;
    
    const currentUsage = getMemoryUsage();
    if (!currentUsage) return false;
    
    const increase = currentUsage.used - lastMemoryUsageRef.current;
    lastMemoryUsageRef.current = currentUsage.used;
    
    // 如果内存使用增加超过10MB，可能存在内存泄漏
    if (increase > 10 * 1024 * 1024) {
      console.warn('Potential memory leak detected:', {
        increase: `${(increase / 1024 / 1024).toFixed(2)}MB`,
        current: `${(currentUsage.used / 1024 / 1024).toFixed(2)}MB`
      });
      return true;
    }
    
    return false;
  }, [enabled, getMemoryUsage]);

  useEffect(() => {
    if (!enabled) return;
    
    const interval = setInterval(() => {
      checkMemoryLeak();
    }, 30000); // 每30秒检查一次
    
    return () => clearInterval(interval);
  }, [checkMemoryLeak, enabled]);

  return {
    getMemoryUsage,
    checkMemoryLeak
  };
}
