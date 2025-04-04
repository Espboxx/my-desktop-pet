import { ipcRenderer, contextBridge } from 'electron'

// 暴露给渲染进程的API
contextBridge.exposeInMainWorld('desktopPet', {
  // 基本 IPC 通信
  on: (channel: string, callback: (...args: any[]) => void) => {
    const subscription = (_event: Electron.IpcRendererEvent, ...args: any[]) => callback(...args);
    ipcRenderer.on(channel, subscription);
    return () => ipcRenderer.removeListener(channel, subscription);
  },
  off: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  },
  send: (channel: string, ...args: any[]) => {
    ipcRenderer.send(channel, ...args);
  },
  invoke: (channel: string, ...args: any[]) => {
    return ipcRenderer.invoke(channel, ...args);
  },
  
  // 桌面宠物专用 API
  // dragPet: (mouseX: number, mouseY: number) => { // 旧的拖动API，已移除
  //   ipcRenderer.send('pet-drag', { mouseX, mouseY });
  // },
  getWindowPosition: (): Promise<number[] | undefined> => { // 新增：获取窗口位置
    return ipcRenderer.invoke('get-window-position');
  },
  setPetPosition: (x: number, y: number) => { // 新增：设置窗口位置
    ipcRenderer.send('set-pet-position', { x, y });
  },
  openSettings: () => {
    ipcRenderer.send('open-settings');
  },
  setAlwaysOnTop: (flag: boolean) => {
    ipcRenderer.send('set-always-on-top', flag);
  },
  getPetSettings: () => {
    return ipcRenderer.invoke('get-pet-settings');
  },
  savePetSettings: (settings: any) => {
    ipcRenderer.send('save-pet-settings', settings);
  },
  
  // 宠物状态和互动 API
  getPetState: () => {
    return ipcRenderer.invoke('get-pet-state');
  },
  interactWithPet: (action: 'feed' | 'pet' | 'clean') => {
    ipcRenderer.send('interact-with-pet', action);
  },
  updatePetBehavior: (behavior: {
    activityLevel: 'calm' | 'normal' | 'playful';
    moveInterval: number;
    expressionChangeInterval: number;
  }) => {
    ipcRenderer.send('update-pet-behavior', behavior);
  },
  adjustPetWindowSize: (expand: boolean) => { // 新增：调整宠物窗口大小
    ipcRenderer.send('adjust-pet-window-size', expand);
  },
  // Remove onShowContextMenu again
  // onShowContextMenu: (callback: () => void) => { ... },
  exitApp: () => { // 新增：退出应用程序
    ipcRenderer.send('exit-app');
  },
  setMousePassthrough: (enable: boolean) => { // 新增：设置鼠标穿透
    ipcRenderer.send('set-mouse-passthrough', enable);
  },
})

// 提供窗口信息
contextBridge.exposeInMainWorld('windowInfo', {
  // 从URL参数判断当前是哪个窗口
  getCurrentWindow: () => {
    const urlParams = new URLSearchParams(window.location.search);
    const hash = window.location.hash.substring(1);
    return urlParams.get('window') || hash || 'pet';
  }
})
