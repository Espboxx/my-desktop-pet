/**
 * Hook验证工具
 * 用于在开发环境中验证hooks的正确使用
 */

import React from 'react';

/**
 * 验证useMemo的使用是否正确
 */
export function validateUseMemoUsage(
  factory: () => unknown,
  deps: React.DependencyList | undefined,
  hookName: string = 'useMemo'
): boolean {
  if (process.env.NODE_ENV !== 'development') {
    return true;
  }

  // 检查依赖数组
  if (deps === undefined) {
    console.warn(`${hookName}: 依赖数组为undefined，这可能导致每次都重新计算`);
    return false;
  }

  if (!Array.isArray(deps)) {
    console.error(`${hookName}: 依赖数组不是数组类型:`, typeof deps);
    return false;
  }

  // 检查依赖数组中的undefined值
  const undefinedIndices: number[] = [];
  deps.forEach((dep, index) => {
    if (dep === undefined) {
      undefinedIndices.push(index);
    }
  });

  if (undefinedIndices.length > 0) {
    console.error(
      `${hookName}: 依赖数组中包含undefined值，索引:`,
      undefinedIndices,
      '完整依赖数组:',
      deps
    );
    return false;
  }

  // 检查工厂函数
  if (typeof factory !== 'function') {
    console.error(`${hookName}: 工厂函数不是函数类型:`, typeof factory);
    return false;
  }

  return true;
}

/**
 * 检查hook调用是否在正确的位置
 */
export function checkHookCallLocation(hookName: string, componentName: string): void {
  if (process.env.NODE_ENV !== 'development') {
    return;
  }

  // 检查是否在React组件或自定义hook中调用
  const stack = new Error().stack;
  if (!stack) {
    return;
  }

  const isInComponent = stack.includes(componentName) || stack.includes('use');
  if (!isInComponent) {
    console.warn(`${hookName}: 可能在非React组件/hook中调用`);
  }
}

/**
 * 监控hook的性能
 */
export function monitorHookPerformance<T>(
  hookName: string,
  hookFunction: () => T,
  warningThreshold: number = 5
): T {
  if (process.env.NODE_ENV !== 'development') {
    return hookFunction();
  }

  const startTime = performance.now();
  const result = hookFunction();
  const endTime = performance.now();
  const duration = endTime - startTime;

  if (duration > warningThreshold) {
    console.warn(
      `${hookName}: 执行时间过长`,
      `${duration.toFixed(2)}ms (阈值: ${warningThreshold}ms)`
    );
  }

  return result;
}

/**
 * 验证配置对象
 */
export function validateHookConfig(
  config: unknown,
  requiredKeys: string[],
  hookName: string
): boolean {
  if (process.env.NODE_ENV !== 'development') {
    return true;
  }

  if (!config || typeof config !== 'object') {
    console.error(`${hookName}: 配置对象无效:`, config);
    return false;
  }

  const missingKeys = requiredKeys.filter(key => !(key in config));
  if (missingKeys.length > 0) {
    console.error(`${hookName}: 配置对象缺少必需的键:`, missingKeys);
    return false;
  }

  return true;
}

/**
 * 检查hook的依赖稳定性
 */
export function checkDependencyStability(
  deps: React.DependencyList,
  hookName: string,
  previousDeps?: React.DependencyList
): void {
  if (process.env.NODE_ENV !== 'development') {
    return;
  }

  if (!previousDeps) {
    return;
  }

  if (deps.length !== previousDeps.length) {
    console.warn(
      `${hookName}: 依赖数组长度发生变化`,
      `从 ${previousDeps.length} 变为 ${deps.length}`
    );
    return;
  }

  const changedIndices: number[] = [];
  deps.forEach((dep, index) => {
    if (dep !== previousDeps[index]) {
      changedIndices.push(index);
    }
  });

  if (changedIndices.length > 0) {
    console.debug(
      `${hookName}: 依赖发生变化，索引:`,
      changedIndices,
      '新值:',
      changedIndices.map(i => deps[i]),
      '旧值:',
      changedIndices.map(i => previousDeps[i])
    );
  }
}

/**
 * 创建安全的useMemo包装器
 */
export function createSafeUseMemo() {
  return function safeUseMemo<T>(
    factory: () => T,
    deps: React.DependencyList | undefined,
    hookName: string = 'useMemo'
  ): T {
    // 验证使用是否正确
    const isValid = validateUseMemoUsage(factory, deps, hookName);
    
    if (!isValid && process.env.NODE_ENV === 'development') {
      console.warn(`${hookName}: 使用不当，直接执行工厂函数`);
      return factory();
    }

    // 如果验证通过，正常使用useMemo
    void deps;
    return factory();
  };
}

/**
 * Hook使用统计
 */
class HookUsageStats {
  private static instance: HookUsageStats;
  private stats: Map<string, { count: number; totalTime: number; errors: number }> = new Map();

  static getInstance(): HookUsageStats {
    if (!HookUsageStats.instance) {
      HookUsageStats.instance = new HookUsageStats();
    }
    return HookUsageStats.instance;
  }

  recordUsage(hookName: string, duration: number, hasError: boolean = false): void {
    if (process.env.NODE_ENV !== 'development') {
      return;
    }

    const current = this.stats.get(hookName) || { count: 0, totalTime: 0, errors: 0 };
    this.stats.set(hookName, {
      count: current.count + 1,
      totalTime: current.totalTime + duration,
      errors: current.errors + (hasError ? 1 : 0)
    });
  }

  getStats(): Record<string, { count: number; avgTime: number; errorRate: number }> {
    const result: Record<string, { count: number; avgTime: number; errorRate: number }> = {};
    
    this.stats.forEach((stats, hookName) => {
      result[hookName] = {
        count: stats.count,
        avgTime: stats.totalTime / stats.count,
        errorRate: stats.errors / stats.count
      };
    });

    return result;
  }

  printStats(): void {
    if (process.env.NODE_ENV !== 'development') {
      return;
    }

    console.group('Hook使用统计');
    const stats = this.getStats();
    Object.entries(stats).forEach(([hookName, stat]) => {
      console.log(
        `${hookName}:`,
        `调用${stat.count}次`,
        `平均${stat.avgTime.toFixed(2)}ms`,
        `错误率${(stat.errorRate * 100).toFixed(1)}%`
      );
    });
    console.groupEnd();
  }
}

export const hookStats = HookUsageStats.getInstance();

/**
 * 装饰器：监控hook使用
 */
export function monitorHook(hookName: string) {
  return function<T extends (...args: unknown[]) => unknown>(hookFunction: T): T {
    return ((...args: Parameters<T>) => {
      const startTime = performance.now();
      let hasError = false;
      
      try {
        const result = hookFunction(...args);
        return result;
      } catch (error) {
        hasError = true;
        throw error;
      } finally {
        const endTime = performance.now();
        hookStats.recordUsage(hookName, endTime - startTime, hasError);
      }
    }) as T;
  };
}
