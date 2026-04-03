import { ipcRenderer, contextBridge } from "electron";
import type { SavedPetData } from "../src/types/petTypes";
import type { PetSettings } from '../src/types/settings'
import type {
  DesktopPetAPI,
  WindowInfoAPI,
  IPCArgument,
  IPCEventListener,
  SmoothTopMostConfig,
  WindowPosition,
} from "../src/types/ipcTypes";

const desktopPetAPI: DesktopPetAPI = {
  // 基本 IPC 通信
  on: <T = IPCArgument>(channel: string, callback: IPCEventListener<T>) => {
    const subscription = (
      event: Electron.IpcRendererEvent,
      ...args: IPCArgument[]
    ) => {
      callback(event, ...(args as T[]));
    };
    ipcRenderer.on(channel, subscription);
    return () => ipcRenderer.removeListener(channel, subscription);
  },
  off: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  },
  send: (channel: string, ...args: IPCArgument[]) => {
    ipcRenderer.send(channel, ...args);
  },
  invoke: <T = unknown>(channel: string, ...args: IPCArgument[]) => {
    return ipcRenderer.invoke(channel, ...args) as Promise<T>;
  },

  // 桌面宠物专用 API
  getWindowPosition: async (): Promise<WindowPosition | undefined> => {
    const position = await ipcRenderer.invoke("get-window-position");
    if (!position) {
      return undefined;
    }

    if (Array.isArray(position) && position.length >= 2) {
      const [x, y] = position;
      return { x: Number(x), y: Number(y) };
    }

    return position as WindowPosition;
  },
  openSettings: () => {
    ipcRenderer.send("open-settings");
  },
  setAlwaysOnTop: (flag: boolean) => {
    ipcRenderer.send("set-always-on-top", flag);
  },
  getPetSettings: () => {
    return ipcRenderer.invoke("get-pet-settings");
  },
  savePetSettings: (settings: PetSettings) => {
    ipcRenderer.send("save-pet-settings", settings);
  },

  // 宠物状态 API
  getPetState: (): Promise<SavedPetData | null> => {
    return ipcRenderer.invoke("get-pet-state");
  },
  savePetState: (state: SavedPetData) => {
    ipcRenderer.send("save-pet-state", state);
  },
  adjustPetWindowSize: (expand: boolean) => {
    ipcRenderer.send("adjust-pet-window-size", expand);
  },
  exitApp: () => {
    ipcRenderer.send("exit-app");
  },
  setMousePassthrough: (enable: boolean) => {
    ipcRenderer.send("set-mouse-passthrough", enable);
  },
  showStatusDetails: () => {
    ipcRenderer.send("show-status-details");
  },
  showSkinSelector: () => {
    ipcRenderer.send("show-skin-selector");
  },
  showNameEditor: () => {
    ipcRenderer.send("show-name-editor");
  },
  takePetPhoto: () => {
    ipcRenderer.send("take-pet-photo");
  },

  // 丝滑置顶效果相关 API
  smoothBringToTop: () => {
    return ipcRenderer.invoke("smooth-bring-to-top");
  },
  cancelTopMost: () => {
    return ipcRenderer.invoke("cancel-top-most");
  },
  getWindowEffectsConfig: () => {
    return ipcRenderer.invoke("get-window-effects-config");
  },
  updateWindowEffectsConfig: (config: Partial<SmoothTopMostConfig>) => {
    return ipcRenderer.invoke("update-window-effects-config", config);
  },
  isWindowAnimating: () => {
    return ipcRenderer.invoke("is-window-animating");
  },
};

const windowInfoAPI: WindowInfoAPI = {
  getCurrentWindow: () => {
    const urlParams = new URLSearchParams(window.location.search);
    const hash = window.location.hash.substring(1);
    const value = urlParams.get("window") || hash || "pet";
    return value === "settings" ? "settings" : "pet";
  },
};

contextBridge.exposeInMainWorld("desktopPet", desktopPetAPI);
contextBridge.exposeInMainWorld("windowInfo", windowInfoAPI);
