/**
 * 调试辅助工具
 * 用于检测和修复常见的React hooks问题
 */
import React from 'react';

/**
 * 检查useMemo依赖数组是否有效
 */
export function validateUseMemoDepArray(deps: readonly unknown[], hookName: string = 'useMemo'): boolean {
  if (!Array.isArray(deps)) {
    console.error(`${hookName}: 依赖数组不是数组类型:`, deps);
    return false;
  }

  for (let i = 0; i < deps.length; i++) {
    if (deps[i] === undefined) {
      console.error(`${hookName}: 依赖数组中第${i}个元素是undefined:`, deps);
      return false;
    }
  }

  return true;
}

/**
 * 安全的useMemo包装器
 */
export function safeUseMemo<T>(
  factory: () => T,
  deps: React.DependencyList | undefined,
  hookName: string = 'useMemo'
): T {
  // 在开发环境检查依赖数组
  if (process.env.NODE_ENV === 'development' && deps) {
    validateUseMemoDepArray(deps, hookName);
  }
  
  // 如果依赖数组无效，直接返回工厂函数结果
  if (!deps || !Array.isArray(deps)) {
    console.warn(`${hookName}: 使用无效依赖数组，直接执行工厂函数`);
    return factory();
  }
  
  void deps;
  return factory();
}

/**
 * 检查hook调用顺序
 */
export function checkHookCallOrder(hookName: string, componentName: string): void {
  if (process.env.NODE_ENV === 'development') {
    console.debug(`${componentName}: 调用 ${hookName}`);
  }
}

/**
 * 性能监控辅助函数
 */
export function measureHookPerformance<T>(
  hookName: string,
  hookFunction: () => T
): T {
  if (process.env.NODE_ENV !== 'development') {
    return hookFunction();
  }
  
  const startTime = performance.now();
  const result = hookFunction();
  const endTime = performance.now();
  
  const duration = endTime - startTime;
  if (duration > 5) { // 超过5ms警告
    console.warn(`${hookName}: 执行时间过长 (${duration.toFixed(2)}ms)`);
  }
  
  return result;
}

/**
 * 检查配置对象是否有效
 */
export function validateConfig(config: unknown, configName: string): boolean {
  if (!config) {
    console.error(`${configName}: 配置对象为空`);
    return false;
  }

  if (typeof config !== 'object') {
    console.error(`${configName}: 配置不是对象类型:`, typeof config);
    return false;
  }

  return true;
}

/**
 * React错误边界辅助函数
 */
export function logReactError(error: Error, errorInfo: React.ErrorInfo, componentName: string): void {
  console.group(`React Error in ${componentName}`);
  console.error('Error:', error);
  console.error('Error Info:', errorInfo);
  console.error('Stack:', error.stack);
  console.groupEnd();

  // 在开发环境中，可以发送错误到监控服务
  if (process.env.NODE_ENV === 'development') {
    // 这里可以集成错误监控服务
  }
}

/**
 * 检查组件重新渲染原因
 */
export function useWhyDidYouUpdate(name: string, props: Record<string, unknown>): void {
  const previousProps = React.useRef<Record<string, unknown>>();

  React.useEffect(() => {
    if (process.env.NODE_ENV !== 'development') {
      previousProps.current = props;
      return;
    }

    if (previousProps.current) {
      const allKeys = Object.keys({ ...previousProps.current, ...props });
      const changedProps: Record<string, { from: unknown; to: unknown }> = {};

      allKeys.forEach(key => {
        if (previousProps.current![key] !== props[key]) {
          changedProps[key] = {
            from: previousProps.current![key],
            to: props[key]
          };
        }
      });

      if (Object.keys(changedProps).length) {
        console.log(`[${name}] 重新渲染原因:`, changedProps);
      }
    }

    previousProps.current = props;
  });
}

/**
 * 内存泄漏检测辅助函数
 */
export function detectMemoryLeaks(componentName: string): () => void {
  if (process.env.NODE_ENV !== 'development') {
    return () => {};
  }

  const startMemory = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize || 0;
  const startTime = Date.now();

  return () => {
    const endMemory = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize || 0;
    const endTime = Date.now();
    const memoryDiff = endMemory - startMemory;
    const timeDiff = endTime - startTime;

    if (memoryDiff > 1024 * 1024) { // 超过1MB
      console.warn(
        `${componentName}: 可能的内存泄漏检测到`,
        `内存增长: ${(memoryDiff / 1024 / 1024).toFixed(2)}MB`,
        `时间: ${timeDiff}ms`
      );
    }
  };
}

/**
 * Hook依赖检查器
 */
export function useDependencyChecker(
  hookName: string,
  dependencies: unknown[],
  expectedLength?: number
): void {
  React.useEffect(() => {
    if (process.env.NODE_ENV !== 'development') {
      return;
    }

    // 检查依赖数组长度
    if (expectedLength !== undefined && dependencies.length !== expectedLength) {
      console.warn(
        `${hookName}: 依赖数组长度不匹配`,
        `期望: ${expectedLength}, 实际: ${dependencies.length}`
      );
    }

    // 检查undefined依赖
    dependencies.forEach((dep, index) => {
      if (dep === undefined) {
        console.error(`${hookName}: 依赖数组第${index}个元素是undefined`);
      }
    });

    // 检查函数依赖是否稳定
    dependencies.forEach((dep, index) => {
      if (typeof dep === 'function') {
        console.warn(
          `${hookName}: 依赖数组第${index}个元素是函数，可能导致无限重新渲染`
        );
      }
    });
  }, [dependencies, expectedLength, hookName]);
}
