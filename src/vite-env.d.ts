/// <reference types="vite/client" />

// 扩展 Window 接口以包含 Electron preload 暴露的 API
// Define the interface for the exposed API
export interface DesktopPetAPI {
  on: (channel: string, callback: (...args: any[]) => void) => () => void;
  off: (channel: string) => void;
  send: (channel: string, ...args: any[]) => void;
  invoke: (channel: string, ...args: any[]) => Promise<any>;
  getWindowPosition: () => Promise<number[] | undefined>;
  setPetPosition: (x: number, y: number) => void;
  openSettings: () => void;
  setAlwaysOnTop: (flag: boolean) => void;
  getPetSettings: () => Promise<any>; // Consider defining a more specific settings type
  savePetSettings: (settings: any) => void; // Consider defining a more specific settings type
  getPetState: () => Promise<import('../src/types/petTypes').SavedPetData | null>; // Use SavedPetData
  savePetState: (data: import('../src/types/petTypes').SavedPetData) => void; // Use SavedPetData
  interactWithPet: (action: string) => void; // Updated action type
  updatePetBehavior: (behavior: any) => void; // Consider defining a more specific behavior type
  adjustPetWindowSize: (expand: boolean) => void; // 新增：调整窗口大小的类型定义
  // onShowContextMenu: (callback: () => void) => () => void; // Remove type again
  exitApp: () => void; // 新增：退出应用程序的类型定义
  setMousePassthrough: (enable: boolean) => void; // 新增：设置鼠标穿透的类型定义
  showStatusDetails: () => void; // 显示状态详情
  showSkinSelector: () => void; // 显示皮肤选择器
  showNameEditor: () => void; // 显示名称编辑器
  takePetPhoto: () => void; // 拍摄宠物照片
}

export interface WindowInfoAPI {
  getCurrentWindow: () => string;
}

// Extend the Window interface using declaration merging
declare global {
  interface Window {
    desktopPet: DesktopPetAPI;
    windowInfo: WindowInfoAPI;
  }
}

// 为了确保 TypeScript 将此文件视为模块，添加一个空的 export 语句
export {};
