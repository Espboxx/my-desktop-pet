// 窗口特效相关类型定义

// 置顶效果配置
export interface SmoothTopMostConfig {
  duration: number; // 动画持续时间（毫秒）
  steps: number; // 动画步数
  easing: 'linear' | 'easeInOut' | 'easeIn' | 'easeOut'; // 缓动函数
  enabled: boolean; // 是否启用效果
}

// API响应类型
export interface WindowEffectsResponse {
  success: boolean;
  error: string | null;
}

export interface WindowEffectsConfigResponse extends WindowEffectsResponse {
  config: SmoothTopMostConfig | null;
}

export interface WindowAnimationStatusResponse extends WindowEffectsResponse {
  isAnimating: boolean;
}

// 窗口特效API接口
export interface WindowEffectsAPI {
  smoothBringToTop(): Promise<WindowEffectsResponse>;
  cancelTopMost(): Promise<WindowEffectsResponse>;
  getWindowEffectsConfig(): Promise<WindowEffectsConfigResponse>;
  updateWindowEffectsConfig(config: Partial<SmoothTopMostConfig>): Promise<WindowEffectsConfigResponse>;
  isWindowAnimating(): Promise<WindowAnimationStatusResponse>;
}
