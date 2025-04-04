"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("desktopPet", {
  // 基本 IPC 通信
  on: (channel, callback) => {
    const subscription = (_event, ...args) => callback(...args);
    electron.ipcRenderer.on(channel, subscription);
    return () => electron.ipcRenderer.removeListener(channel, subscription);
  },
  off: (channel) => {
    electron.ipcRenderer.removeAllListeners(channel);
  },
  send: (channel, ...args) => {
    electron.ipcRenderer.send(channel, ...args);
  },
  invoke: (channel, ...args) => {
    return electron.ipcRenderer.invoke(channel, ...args);
  },
  // 桌面宠物专用 API
  // dragPet: (mouseX: number, mouseY: number) => { // 旧的拖动API，已移除
  //   ipcRenderer.send('pet-drag', { mouseX, mouseY });
  // },
  getWindowPosition: () => {
    return electron.ipcRenderer.invoke("get-window-position");
  },
  setPetPosition: (x, y) => {
    electron.ipcRenderer.send("set-pet-position", { x, y });
  },
  openSettings: () => {
    electron.ipcRenderer.send("open-settings");
  },
  setAlwaysOnTop: (flag) => {
    electron.ipcRenderer.send("set-always-on-top", flag);
  },
  getPetSettings: () => {
    return electron.ipcRenderer.invoke("get-pet-settings");
  },
  savePetSettings: (settings) => {
    electron.ipcRenderer.send("save-pet-settings", settings);
  },
  // 宠物状态和互动 API
  getPetState: () => {
    return electron.ipcRenderer.invoke("get-pet-state");
  },
  interactWithPet: (action) => {
    electron.ipcRenderer.send("interact-with-pet", action);
  },
  updatePetBehavior: (behavior) => {
    electron.ipcRenderer.send("update-pet-behavior", behavior);
  },
  adjustPetWindowSize: (expand) => {
    electron.ipcRenderer.send("adjust-pet-window-size", expand);
  },
  // Remove onShowContextMenu again
  // onShowContextMenu: (callback: () => void) => { ... },
  exitApp: () => {
    electron.ipcRenderer.send("exit-app");
  },
  setMousePassthrough: (enable) => {
    electron.ipcRenderer.send("set-mouse-passthrough", enable);
  }
});
electron.contextBridge.exposeInMainWorld("windowInfo", {
  // 从URL参数判断当前是哪个窗口
  getCurrentWindow: () => {
    const urlParams = new URLSearchParams(window.location.search);
    const hash = window.location.hash.substring(1);
    return urlParams.get("window") || hash || "pet";
  }
});
