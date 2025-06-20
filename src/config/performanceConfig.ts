/**
 * 性能配置文件
 * 统一管理性能相关的配置参数
 */

export const PERFORMANCE_CONFIG = {
  // 渲染性能
  RENDER: {
    MAX_RENDER_TIME_WARNING: 32, // 30fps阈值
    MAX_AVERAGE_RENDER_TIME: 20,
    MAX_RENDER_COUNT_WARNING: 5000,
    PERFORMANCE_CHECK_INTERVAL: 30000, // 30秒检查一次
  },
  
  // 交互反馈
  INTERACTION: {
    HOVER_DELAY: 100, // 悬停延迟
    CLICK_FEEDBACK_DURATION: 120,
    HAPTIC_COOLDOWN: 100, // 触觉反馈冷却时间
    THROTTLE_DELAY: 16, // 60fps节流
  },
  
  // 动画性能
  ANIMATION: {
    FRICTION: 0.88,
    SPRING_STRENGTH: 0.12,
    MAX_SPEED: 600,
    BOUNCE_STRENGTH: 0.4,
  },
  
  // 内存管理
  MEMORY: {
    CHECK_INTERVAL: 30000, // 30秒检查一次
    WARNING_THRESHOLD: 100 * 1024 * 1024, // 100MB
    LEAK_THRESHOLD: 10 * 1024 * 1024, // 10MB增长
  },
  
  // 开发环境配置
  DEVELOPMENT: {
    ENABLE_PERFORMANCE_MONITORING: true,
    ENABLE_DEBUG_LOGGING: true,
    ENABLE_HAPTIC_FEEDBACK: true,
    SHOW_PERFORMANCE_WARNINGS: true,
  },
  
  // 生产环境配置
  PRODUCTION: {
    ENABLE_PERFORMANCE_MONITORING: false,
    ENABLE_DEBUG_LOGGING: false,
    ENABLE_HAPTIC_FEEDBACK: true,
    SHOW_PERFORMANCE_WARNINGS: false,
  }
} as const;

/**
 * 获取当前环境的配置
 */
export function getCurrentConfig() {
  const isDevelopment = process.env.NODE_ENV === 'development';
  return isDevelopment ? PERFORMANCE_CONFIG.DEVELOPMENT : PERFORMANCE_CONFIG.PRODUCTION;
}

/**
 * 检查是否启用性能监控
 */
export function isPerformanceMonitoringEnabled(): boolean {
  return getCurrentConfig().ENABLE_PERFORMANCE_MONITORING;
}

/**
 * 检查是否启用调试日志
 */
export function isDebugLoggingEnabled(): boolean {
  return getCurrentConfig().ENABLE_DEBUG_LOGGING;
}

/**
 * 检查是否启用触觉反馈
 */
export function isHapticFeedbackEnabled(): boolean {
  return getCurrentConfig().ENABLE_HAPTIC_FEEDBACK;
}

/**
 * 检查是否显示性能警告
 */
export function shouldShowPerformanceWarnings(): boolean {
  return getCurrentConfig().SHOW_PERFORMANCE_WARNINGS;
}
