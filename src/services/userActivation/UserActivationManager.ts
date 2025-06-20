/**
 * 用户激活管理器
 * 处理浏览器用户激活策略，确保触觉反馈等功能符合安全要求
 * 支持Electron桌面应用的特殊处理
 */

import { getElectronUserActivationHelper, ElectronUserActivationHelper } from './ElectronUserActivationHelper';

interface UserActivationState {
  hasInteracted: boolean;
  firstInteractionTime: number | null;
  lastInteractionTime: number | null;
  interactionCount: number;
  sessionId: string;
}

interface UserActivationOptions {
  persistToStorage?: boolean;
  storageKey?: string;
  sessionTimeout?: number; // 会话超时时间（毫秒）
  debugMode?: boolean;
}

type InteractionEventType = 'click' | 'touchstart' | 'keydown' | 'mousedown' | 'pointerdown';

class UserActivationManager {
  private state: UserActivationState;
  private options: Required<UserActivationOptions>;
  private listeners: Map<InteractionEventType, EventListener> = new Map();
  private callbacks: Set<() => void> = new Set();
  private isElectron: boolean;
  private electronHelper: ElectronUserActivationHelper;

  constructor(options: UserActivationOptions = {}) {
    // 初始化Electron辅助工具
    this.electronHelper = getElectronUserActivationHelper({
      debugMode: options.debugMode || false
    });

    // 获取推荐的配置
    const optimalConfig = this.electronHelper.createOptimalUserActivationConfig();

    this.options = {
      persistToStorage: true,
      storageKey: 'desktop-pet-user-activation',
      sessionTimeout: 24 * 60 * 60 * 1000, // 24小时
      debugMode: false,
      ...optimalConfig,
      ...options // 用户选项优先级最高
    };

    // 检测是否在Electron环境中
    this.isElectron = this.electronHelper.getEnvironmentInfo().isElectron;

    // 初始化状态
    this.state = this.loadState();

    // 设置事件监听器
    this.setupEventListeners();

    // 清理过期会话
    this.cleanupExpiredSession();

    if (this.options.debugMode) {
      console.log('[UserActivationManager] 初始化完成', {
        isElectron: this.isElectron,
        hasInteracted: this.state.hasInteracted,
        sessionId: this.state.sessionId,
        environmentInfo: this.electronHelper.getEnvironmentInfo(),
        strategy: this.electronHelper.getRecommendedActivationStrategy()
      });
    }
  }

  /**
   * 检测是否在Electron环境中
   */
  private detectElectronEnvironment(): boolean {
    return !!(
      typeof window !== 'undefined' &&
      window.process &&
      window.process.type === 'renderer'
    ) || !!(
      typeof window !== 'undefined' &&
      window.electronAPI
    ) || !!(
      typeof window !== 'undefined' &&
      window.desktopPet
    );
  }

  /**
   * 生成会话ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 从存储加载状态
   */
  private loadState(): UserActivationState {
    const defaultState: UserActivationState = {
      hasInteracted: false,
      firstInteractionTime: null,
      lastInteractionTime: null,
      interactionCount: 0,
      sessionId: this.generateSessionId()
    };

    if (!this.options.persistToStorage) {
      return defaultState;
    }

    try {
      const stored = localStorage.getItem(this.options.storageKey);
      if (stored) {
        const parsedState = JSON.parse(stored) as UserActivationState;
        
        // 验证会话是否过期
        if (parsedState.lastInteractionTime && 
            Date.now() - parsedState.lastInteractionTime > this.options.sessionTimeout) {
          if (this.options.debugMode) {
            console.log('[UserActivationManager] 会话已过期，重置状态');
          }
          return defaultState;
        }

        return {
          ...defaultState,
          ...parsedState,
          sessionId: parsedState.sessionId || this.generateSessionId()
        };
      }
    } catch (error) {
      if (this.options.debugMode) {
        console.warn('[UserActivationManager] 加载存储状态失败:', error);
      }
    }

    return defaultState;
  }

  /**
   * 保存状态到存储
   */
  private saveState(): void {
    if (!this.options.persistToStorage) {
      return;
    }

    try {
      localStorage.setItem(this.options.storageKey, JSON.stringify(this.state));
    } catch (error) {
      if (this.options.debugMode) {
        console.warn('[UserActivationManager] 保存状态失败:', error);
      }
    }
  }

  /**
   * 清理过期会话
   */
  private cleanupExpiredSession(): void {
    if (this.state.lastInteractionTime && 
        Date.now() - this.state.lastInteractionTime > this.options.sessionTimeout) {
      this.resetState();
    }
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    const eventTypes: InteractionEventType[] = ['click', 'touchstart', 'keydown', 'mousedown', 'pointerdown'];
    
    eventTypes.forEach(eventType => {
      const listener = this.handleUserInteraction.bind(this);
      this.listeners.set(eventType, listener);
      
      // 使用捕获阶段确保能够捕获到所有交互
      document.addEventListener(eventType, listener, { 
        capture: true, 
        passive: true,
        once: false
      });
    });
  }

  /**
   * 处理用户交互事件
   */
  private handleUserInteraction = (event: Event): void => {
    if (this.state.hasInteracted) {
      // 已经记录过交互，只更新最后交互时间
      this.state.lastInteractionTime = Date.now();
      this.state.interactionCount++;
      this.saveState();
      return;
    }

    // 首次交互
    const now = Date.now();
    this.state.hasInteracted = true;
    this.state.firstInteractionTime = now;
    this.state.lastInteractionTime = now;
    this.state.interactionCount = 1;

    if (this.options.debugMode) {
      console.log('[UserActivationManager] 首次用户交互检测到:', {
        eventType: event.type,
        timestamp: now,
        sessionId: this.state.sessionId
      });
    }

    // 保存状态
    this.saveState();

    // 通知所有回调
    this.callbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        if (this.options.debugMode) {
          console.error('[UserActivationManager] 回调执行失败:', error);
        }
      }
    });
  };

  /**
   * 检查用户是否已经交互
   */
  public hasUserInteracted(): boolean {
    return this.state.hasInteracted;
  }

  /**
   * 检查是否可以使用需要用户激活的API
   */
  public canUseUserActivatedAPIs(): boolean {
    // 使用Electron辅助工具进行更精确的检查
    if (this.isElectron) {
      return this.electronHelper.canUseUserActivatedAPIs();
    }

    return this.state.hasInteracted;
  }

  /**
   * 获取用户激活状态信息
   */
  public getActivationInfo() {
    const electronInfo = this.electronHelper.getEnvironmentInfo();
    const strategy = this.electronHelper.getRecommendedActivationStrategy();

    return {
      hasInteracted: this.state.hasInteracted,
      firstInteractionTime: this.state.firstInteractionTime,
      lastInteractionTime: this.state.lastInteractionTime,
      interactionCount: this.state.interactionCount,
      sessionId: this.state.sessionId,
      isElectron: this.isElectron,
      canUseAPIs: this.canUseUserActivatedAPIs(),
      electronInfo,
      recommendedStrategy: strategy,
      supportsVibration: this.electronHelper.supportsVibration()
    };
  }

  /**
   * 添加用户交互回调
   */
  public onUserInteraction(callback: () => void): () => void {
    this.callbacks.add(callback);
    
    // 如果用户已经交互过，立即调用回调
    if (this.state.hasInteracted) {
      try {
        callback();
      } catch (error) {
        if (this.options.debugMode) {
          console.error('[UserActivationManager] 立即回调执行失败:', error);
        }
      }
    }

    // 返回取消订阅函数
    return () => {
      this.callbacks.delete(callback);
    };
  }

  /**
   * 手动记录用户交互（用于特殊情况）
   */
  public recordInteraction(): void {
    this.handleUserInteraction(new Event('manual'));
  }

  /**
   * 尝试触发振动（使用Electron优化）
   */
  public tryVibrate(pattern: number | number[]): boolean {
    if (this.isElectron) {
      return this.electronHelper.tryVibrate(pattern);
    }

    // 非Electron环境，使用标准检查
    if (!this.canUseUserActivatedAPIs()) {
      if (this.options.debugMode) {
        console.log('[UserActivationManager] 振动被阻止：需要用户交互');
      }
      return false;
    }

    if (!('vibrate' in navigator)) {
      if (this.options.debugMode) {
        console.log('[UserActivationManager] 振动不支持：设备不支持振动API');
      }
      return false;
    }

    try {
      const result = navigator.vibrate(pattern);
      if (this.options.debugMode) {
        console.log('[UserActivationManager] 振动执行结果:', result);
      }
      return result;
    } catch (error) {
      if (this.options.debugMode) {
        console.error('[UserActivationManager] 振动执行失败:', error);
      }
      return false;
    }
  }

  /**
   * 重置用户激活状态
   */
  public resetState(): void {
    this.state = {
      hasInteracted: false,
      firstInteractionTime: null,
      lastInteractionTime: null,
      interactionCount: 0,
      sessionId: this.generateSessionId()
    };
    this.saveState();

    if (this.options.debugMode) {
      console.log('[UserActivationManager] 状态已重置');
    }
  }

  /**
   * 销毁管理器，清理事件监听器
   */
  public destroy(): void {
    this.listeners.forEach((listener, eventType) => {
      document.removeEventListener(eventType, listener, { capture: true });
    });
    this.listeners.clear();
    this.callbacks.clear();

    if (this.options.debugMode) {
      console.log('[UserActivationManager] 已销毁');
    }
  }
}

// 创建全局单例实例
let globalUserActivationManager: UserActivationManager | null = null;

/**
 * 获取全局用户激活管理器实例
 */
export function getUserActivationManager(options?: UserActivationOptions): UserActivationManager {
  if (!globalUserActivationManager) {
    globalUserActivationManager = new UserActivationManager(options);
  }
  return globalUserActivationManager;
}

/**
 * 重置全局用户激活管理器（主要用于测试）
 */
export function resetUserActivationManager(): void {
  if (globalUserActivationManager) {
    globalUserActivationManager.destroy();
    globalUserActivationManager = null;
  }
}

export { UserActivationManager };
export type { UserActivationState, UserActivationOptions, InteractionEventType };
