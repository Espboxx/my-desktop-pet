/**
 * Electron环境下的用户激活辅助工具
 * 处理桌面应用特有的用户激活策略
 */

interface ElectronEnvironmentInfo {
  isElectron: boolean;
  electronVersion?: string;
  nodeVersion?: string;
  chromeVersion?: string;
  platform: string;
  isMainProcess: boolean;
  isRendererProcess: boolean;
}

interface ElectronUserActivationConfig {
  enableAutoActivation?: boolean; // 是否自动激活（桌面应用通常可以）
  enableVibrationInElectron?: boolean; // 是否在Electron中启用振动
  fallbackToWebAPI?: boolean; // 是否回退到Web API
  debugMode?: boolean;
}

class ElectronUserActivationHelper {
  private config: Required<ElectronUserActivationConfig>;
  private environmentInfo: ElectronEnvironmentInfo;

  constructor(config: ElectronUserActivationConfig = {}) {
    this.config = {
      enableAutoActivation: true,
      enableVibrationInElectron: false, // 桌面设备通常没有振动器
      fallbackToWebAPI: true,
      debugMode: false,
      ...config
    };

    this.environmentInfo = this.detectElectronEnvironment();

    if (this.config.debugMode) {
      console.log('[ElectronUserActivationHelper] 环境信息:', this.environmentInfo);
    }
  }

  /**
   * 检测Electron环境信息
   */
  private detectElectronEnvironment(): ElectronEnvironmentInfo {
    const isElectron = this.isElectronEnvironment();
    
    let electronVersion: string | undefined;
    let nodeVersion: string | undefined;
    let chromeVersion: string | undefined;
    let isMainProcess = false;
    let isRendererProcess = false;

    if (isElectron) {
      try {
        // 检测进程类型
        if (typeof window !== 'undefined' && window.process) {
          isRendererProcess = window.process.type === 'renderer';
          isMainProcess = window.process.type === 'browser';
        }

        // 获取版本信息
        if (typeof window !== 'undefined' && window.process && window.process.versions) {
          electronVersion = window.process.versions.electron;
          nodeVersion = window.process.versions.node;
          chromeVersion = window.process.versions.chrome;
        }
      } catch (error) {
        if (this.config.debugMode) {
          console.warn('[ElectronUserActivationHelper] 获取版本信息失败:', error);
        }
      }
    }

    return {
      isElectron,
      electronVersion,
      nodeVersion,
      chromeVersion,
      platform: typeof navigator !== 'undefined' ? navigator.platform : 'unknown',
      isMainProcess,
      isRendererProcess
    };
  }

  /**
   * 检测是否在Electron环境中
   */
  private isElectronEnvironment(): boolean {
    // 方法1: 检查window.process.type
    if (typeof window !== 'undefined' && 
        window.process && 
        window.process.type === 'renderer') {
      return true;
    }

    // 方法2: 检查预加载的API
    if (typeof window !== 'undefined' && 
        window.desktopPet) {
      return true;
    }

    // 方法3: 检查用户代理字符串
    if (typeof navigator !== 'undefined' && 
        navigator.userAgent.toLowerCase().includes('electron')) {
      return true;
    }

    // 方法4: 检查全局变量
    if (typeof global !== 'undefined' && 
        global.process && 
        global.process.versions && 
        global.process.versions.electron) {
      return true;
    }

    return false;
  }

  /**
   * 检查是否可以使用用户激活的API
   */
  public canUseUserActivatedAPIs(): boolean {
    if (!this.environmentInfo.isElectron) {
      // 非Electron环境，使用标准Web API检查
      return this.config.fallbackToWebAPI;
    }

    // Electron环境的特殊处理
    if (this.config.enableAutoActivation) {
      // 桌面应用通常可以自动激活
      return true;
    }

    // 如果不允许自动激活，检查是否有真实的用户交互
    return this.hasRealUserInteraction();
  }

  /**
   * 检查是否有真实的用户交互
   */
  private hasRealUserInteraction(): boolean {
    // 在Electron中，我们可以检查窗口焦点状态
    if (typeof document !== 'undefined') {
      return document.hasFocus();
    }
    return false;
  }

  /**
   * 检查是否支持振动API
   */
  public supportsVibration(): boolean {
    if (!this.environmentInfo.isElectron) {
      // 非Electron环境，检查标准API
      return 'vibrate' in navigator && typeof navigator.vibrate === 'function';
    }

    // Electron环境中，桌面设备通常不支持振动
    if (!this.config.enableVibrationInElectron) {
      return false;
    }

    // 如果配置允许，检查是否有振动API
    return 'vibrate' in navigator && typeof navigator.vibrate === 'function';
  }

  /**
   * 尝试触发振动（带Electron特殊处理）
   */
  public tryVibrate(pattern: number | number[]): boolean {
    if (!this.supportsVibration()) {
      if (this.config.debugMode) {
        console.log('[ElectronUserActivationHelper] 振动不支持或被禁用');
      }
      return false;
    }

    if (!this.canUseUserActivatedAPIs()) {
      if (this.config.debugMode) {
        console.log('[ElectronUserActivationHelper] 用户激活检查失败');
      }
      return false;
    }

    try {
      const result = navigator.vibrate(pattern);
      if (this.config.debugMode) {
        console.log('[ElectronUserActivationHelper] 振动执行结果:', result);
      }
      return result;
    } catch (error) {
      if (this.config.debugMode) {
        console.error('[ElectronUserActivationHelper] 振动执行失败:', error);
      }
      return false;
    }
  }

  /**
   * 获取环境信息
   */
  public getEnvironmentInfo(): ElectronEnvironmentInfo {
    return { ...this.environmentInfo };
  }

  /**
   * 获取推荐的用户激活策略
   */
  public getRecommendedActivationStrategy(): {
    requireUserInteraction: boolean;
    enableVibration: boolean;
    enableAutoActivation: boolean;
    reason: string;
  } {
    if (!this.environmentInfo.isElectron) {
      return {
        requireUserInteraction: true,
        enableVibration: true,
        enableAutoActivation: false,
        reason: '标准Web环境，需要遵循浏览器安全策略'
      };
    }

    // Electron桌面应用
    return {
      requireUserInteraction: false,
      enableVibration: false, // 桌面设备通常没有振动器
      enableAutoActivation: true,
      reason: 'Electron桌面应用，可以使用更宽松的策略'
    };
  }

  /**
   * 创建适合当前环境的用户激活配置
   */
  public createOptimalUserActivationConfig() {
    return {
      persistToStorage: true,
      debugMode: this.config.debugMode,
      sessionTimeout: this.environmentInfo.isElectron ? 
        7 * 24 * 60 * 60 * 1000 : // 桌面应用：7天
        24 * 60 * 60 * 1000,      // Web应用：1天
      storageKey: this.environmentInfo.isElectron ? 
        'desktop-pet-electron-user-activation' : 
        'desktop-pet-web-user-activation'
    };
  }
}

// 创建全局单例
let globalElectronHelper: ElectronUserActivationHelper | null = null;

/**
 * 获取Electron用户激活辅助工具实例
 */
export function getElectronUserActivationHelper(config?: ElectronUserActivationConfig): ElectronUserActivationHelper {
  if (!globalElectronHelper) {
    globalElectronHelper = new ElectronUserActivationHelper(config);
  }
  return globalElectronHelper;
}

/**
 * 重置全局实例（主要用于测试）
 */
export function resetElectronUserActivationHelper(): void {
  globalElectronHelper = null;
}

export { ElectronUserActivationHelper };
export type { ElectronEnvironmentInfo, ElectronUserActivationConfig };
