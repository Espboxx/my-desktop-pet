// IPC 通信类型定义
import type { SavedPetData } from "./petTypes";
import type { PetSettings } from './settings'
import type { SmoothTopMostConfig } from "./windowEffects";

// IPC 通道名称
export type IPCChannel =
  | "get-pet-state"
  | "save-pet-state"
  | "get-pet-settings"
  | "save-pet-settings"
  | 'settings-updated'
  | "get-window-position"
  | "open-settings"
  | "set-always-on-top"
  | "adjust-pet-window-size"
  | "exit-app"
  | "set-mouse-passthrough"
  | "show-status-details"
  | "show-skin-selector"
  | "show-name-editor"
  | "take-pet-photo"
  | "smooth-bring-to-top"
  | "cancel-top-most"
  | "get-window-effects-config"
  | "update-window-effects-config"
  | "is-window-animating";

// IPC 参数类型
export type IPCArgument =
  | Record<string, unknown>
  | unknown[]
  | string
  | number
  | boolean
  | null
  | undefined;

// IPC 事件监听器回调类型
export type IPCEventListener<T = IPCArgument> = (
  event: Electron.IpcRendererEvent,
  ...args: T[]
) => void;

// IPC 通用参数数组类型
export type IPCArguments = IPCArgument[];

// 窗口位置信息
export interface WindowPosition {
  x: number;
  y: number;
}

// 宠物行为配置
export interface PetBehaviorConfig {
  activityLevel: "calm" | "normal" | "playful";
  moveInterval: number;
  expressionChangeInterval: number;
}

// 窗口特效配置响应
export interface WindowEffectsConfigResponse {
  success: boolean;
  config: SmoothTopMostConfig | null;
  error: string | null;
}

// 窗口动画状态响应
export interface WindowAnimationResponse {
  success: boolean;
  isAnimating: boolean;
  error: string | null;
}

// 通用响应类型
export interface IPCResponse<T = unknown> {
  success: boolean;
  data?: T;
  error: string | null;
}

// API 函数类型定义
export interface DesktopPetAPI {
  // 事件监听
  on: <T = IPCArgument>(
    channel: string,
    callback: IPCEventListener<T>,
  ) => () => void;
  off: (channel: string) => void;

  // 消息发送
  send: (channel: string, ...args: IPCArgument[]) => void;
  invoke: <T = unknown>(channel: string, ...args: IPCArgument[]) => Promise<T>;

  // 窗口管理
  getWindowPosition: () => Promise<WindowPosition | undefined>;

  // 设置管理
  openSettings: () => void;
  setAlwaysOnTop: (flag: boolean) => void;
  getPetSettings: () => Promise<PetSettings>;
  savePetSettings: (settings: PetSettings) => void;

  // 宠物状态管理
  getPetState: () => Promise<SavedPetData | null>;
  savePetState: (state: SavedPetData) => void;

  // 窗口调整
  adjustPetWindowSize: (expand: boolean) => void;

  // 应用控制
  exitApp: () => void;
  setMousePassthrough: (enable: boolean) => void;

  // UI 功能
  showStatusDetails: () => void;
  showSkinSelector: () => void;
  showNameEditor: () => void;
  takePetPhoto: () => void;

  // 窗口特效
  smoothBringToTop: () => Promise<{ success: boolean; error: string | null }>;
  cancelTopMost: () => Promise<{ success: boolean; error: string | null }>;
  getWindowEffectsConfig: () => Promise<WindowEffectsConfigResponse>;
  updateWindowEffectsConfig: (
    config: Partial<SmoothTopMostConfig>,
  ) => Promise<WindowEffectsConfigResponse>;
  isWindowAnimating: () => Promise<WindowAnimationResponse>;
}

// 窗口信息 API
export interface WindowInfoAPI {
  getCurrentWindow: () => "pet" | "settings";
}

export type { SmoothTopMostConfig }
