// Windows窗口特效管理器
// 实现丝滑置顶效果和其他窗口动画

import { BrowserWindow } from 'electron';

// 置顶效果配置
interface SmoothTopMostConfig {
  duration: number; // 动画持续时间（毫秒）
  steps: number; // 动画步数
  easing: 'linear' | 'easeInOut' | 'easeIn' | 'easeOut'; // 缓动函数
  enabled: boolean; // 是否启用效果
}

// 默认配置
const DEFAULT_CONFIG: SmoothTopMostConfig = {
  duration: 300,
  steps: 20,
  easing: 'easeInOut',
  enabled: true
};

// 缓动函数
const easingFunctions = {
  linear: (t: number) => t,
  easeInOut: (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  easeIn: (t: number) => t * t,
  easeOut: (t: number) => t * (2 - t)
};

// 窗口状态管理
interface WindowState {
  isAnimating: boolean;
  currentZIndex: number;
  targetZIndex: number;
  animationId: NodeJS.Timeout | null;
}

class WindowEffectsManager {
  private config: SmoothTopMostConfig;
  private windowStates = new Map<number, WindowState>();

  constructor(config: Partial<SmoothTopMostConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<SmoothTopMostConfig>) {
    this.config = { ...this.config, ...newConfig };
    console.log('[WindowEffects] 配置已更新:', this.config);
  }

  /**
   * 获取当前配置
   */
  getConfig(): SmoothTopMostConfig {
    return { ...this.config };
  }

  /**
   * 获取窗口状态
   */
  private getWindowState(windowId: number): WindowState {
    if (!this.windowStates.has(windowId)) {
      this.windowStates.set(windowId, {
        isAnimating: false,
        currentZIndex: 0,
        targetZIndex: 0,
        animationId: null
      });
    }
    return this.windowStates.get(windowId)!;
  }

  /**
   * 实现丝滑置顶效果
   */
  async smoothBringToTop(window: BrowserWindow): Promise<boolean> {
    if (!window || window.isDestroyed()) {
      console.warn('[WindowEffects] 窗口无效或已销毁');
      return false;
    }

    const windowId = window.id;
    const state = this.getWindowState(windowId);

    // 如果已经在动画中，取消之前的动画
    if (state.isAnimating && state.animationId) {
      clearTimeout(state.animationId);
      state.isAnimating = false;
    }

    // 如果效果被禁用，直接置顶
    if (!this.config.enabled) {
      return this.directBringToTop(window);
    }

    try {
      console.log('[WindowEffects] 开始丝滑置顶动画');
      state.isAnimating = true;

      // 实现平滑置顶动画
      await this.performSmoothAnimation(window, state);

      console.log('[WindowEffects] 丝滑置顶动画完成');
      return true;
    } catch (error) {
      console.error('[WindowEffects] 丝滑置顶失败:', error);
      // 降级到直接置顶
      return this.directBringToTop(window);
    } finally {
      state.isAnimating = false;
    }
  }

  /**
   * 执行平滑动画
   */
  private async performSmoothAnimation(window: BrowserWindow, state: WindowState): Promise<void> {
    return new Promise((resolve, reject) => {
      const { duration, steps, easing } = this.config;
      const stepDuration = duration / steps;
      let currentStep = 0;

      // 获取缓动函数
      const easingFunc = easingFunctions[easing];

      // 先设置窗口为可见和聚焦
      if (!window.isVisible()) {
        window.show();
      }

      const animateStep = () => {
        try {
          if (currentStep >= steps) {
            // 动画完成，最终置顶
            window.setAlwaysOnTop(true, 'screen-saver');
            window.focus();
            window.setAlwaysOnTop(true, 'floating'); // 确保置顶
            resolve();
            return;
          }

          // 计算动画进度
          const progress = currentStep / steps;
          const easedProgress = easingFunc(progress);

          // 应用动画效果
          this.applyAnimationStep(window, easedProgress);

          currentStep++;
          
          // 安排下一步动画
          state.animationId = setTimeout(animateStep, stepDuration);
        } catch (error) {
          reject(error);
        }
      };

      // 开始动画
      animateStep();
    });
  }

  /**
   * 应用动画步骤
   */
  private applyAnimationStep(window: BrowserWindow, progress: number) {
    try {
      // 渐进式置顶效果
      if (progress < 0.3) {
        // 第一阶段：显示窗口
        window.show();
        window.moveTop();
      } else if (progress < 0.6) {
        // 第二阶段：聚焦窗口
        window.focus();
        window.setAlwaysOnTop(false); // 先取消置顶
      } else if (progress < 0.9) {
        // 第三阶段：设置临时置顶
        window.setAlwaysOnTop(true, 'normal');
      } else {
        // 最终阶段：设置最高级别置顶
        window.setAlwaysOnTop(true, 'screen-saver');
        window.focus();
      }

      // 添加轻微的透明度变化效果（可选）
      const opacity = 0.95 + (progress * 0.05); // 从95%到100%
      window.setOpacity(Math.min(1.0, opacity));

    } catch (error) {
      console.warn('[WindowEffects] 动画步骤执行警告:', error);
    }
  }

  /**
   * 直接置顶（降级方案）
   */
  private directBringToTop(window: BrowserWindow): boolean {
    try {
      console.log('[WindowEffects] 执行直接置顶');
      
      if (!window.isVisible()) {
        window.show();
      }
      
      window.focus();
      window.setAlwaysOnTop(true, 'screen-saver');
      window.moveTop();
      
      return true;
    } catch (error) {
      console.error('[WindowEffects] 直接置顶失败:', error);
      return false;
    }
  }

  /**
   * 取消置顶
   */
  cancelTopMost(window: BrowserWindow): boolean {
    try {
      if (!window || window.isDestroyed()) {
        return false;
      }

      const windowId = window.id;
      const state = this.getWindowState(windowId);

      // 取消动画
      if (state.isAnimating && state.animationId) {
        clearTimeout(state.animationId);
        state.isAnimating = false;
      }

      // 取消置顶
      window.setAlwaysOnTop(false);
      console.log('[WindowEffects] 已取消置顶');
      
      return true;
    } catch (error) {
      console.error('[WindowEffects] 取消置顶失败:', error);
      return false;
    }
  }

  /**
   * 检查窗口是否正在动画中
   */
  isAnimating(window: BrowserWindow): boolean {
    if (!window || window.isDestroyed()) {
      return false;
    }
    
    const state = this.getWindowState(window.id);
    return state.isAnimating;
  }

  /**
   * 清理资源
   */
  cleanup() {
    // 清理所有动画
    for (const [, state] of this.windowStates) {
      if (state.animationId) {
        clearTimeout(state.animationId);
      }
    }
    this.windowStates.clear();
    console.log('[WindowEffects] 资源已清理');
  }
}

// 导出单例实例
export const windowEffectsManager = new WindowEffectsManager();

// 导出类型
export type { SmoothTopMostConfig };
