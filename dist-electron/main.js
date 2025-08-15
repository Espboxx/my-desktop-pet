var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
import { app, ipcMain, globalShortcut, screen, BrowserWindow, Tray, Menu, dialog } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs, { promises } from "node:fs";
import * as stream from "stream";
const DEFAULT_CONFIG = {
  duration: 300,
  steps: 20,
  easing: "easeInOut",
  enabled: true
};
const easingFunctions = {
  linear: (t) => t,
  easeInOut: (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  easeIn: (t) => t * t,
  easeOut: (t) => t * (2 - t)
};
class WindowEffectsManager {
  constructor(config = {}) {
    __publicField(this, "config");
    __publicField(this, "windowStates", /* @__PURE__ */ new Map());
    this.config = { ...DEFAULT_CONFIG, ...config };
  }
  /**
   * 更新配置
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    console.log("[WindowEffects] 配置已更新:", this.config);
  }
  /**
   * 获取当前配置
   */
  getConfig() {
    return { ...this.config };
  }
  /**
   * 获取窗口状态
   */
  getWindowState(windowId) {
    if (!this.windowStates.has(windowId)) {
      this.windowStates.set(windowId, {
        isAnimating: false,
        currentZIndex: 0,
        targetZIndex: 0,
        animationId: null
      });
    }
    return this.windowStates.get(windowId);
  }
  /**
   * 实现丝滑置顶效果
   */
  async smoothBringToTop(window) {
    if (!window || window.isDestroyed()) {
      console.warn("[WindowEffects] 窗口无效或已销毁");
      return false;
    }
    const windowId = window.id;
    const state = this.getWindowState(windowId);
    if (state.isAnimating && state.animationId) {
      clearTimeout(state.animationId);
      state.isAnimating = false;
    }
    if (!this.config.enabled) {
      return this.directBringToTop(window);
    }
    try {
      console.log("[WindowEffects] 开始丝滑置顶动画");
      state.isAnimating = true;
      await this.performSmoothAnimation(window, state);
      console.log("[WindowEffects] 丝滑置顶动画完成");
      return true;
    } catch (error) {
      console.error("[WindowEffects] 丝滑置顶失败:", error);
      return this.directBringToTop(window);
    } finally {
      state.isAnimating = false;
    }
  }
  /**
   * 执行平滑动画
   */
  async performSmoothAnimation(window, state) {
    return new Promise((resolve, reject) => {
      const { duration, steps, easing } = this.config;
      const stepDuration = duration / steps;
      let currentStep = 0;
      const easingFunc = easingFunctions[easing];
      if (!window.isVisible()) {
        window.show();
      }
      const animateStep = () => {
        try {
          if (currentStep >= steps) {
            window.setAlwaysOnTop(true, "screen-saver");
            window.focus();
            window.setAlwaysOnTop(true, "floating");
            resolve();
            return;
          }
          const progress = currentStep / steps;
          const easedProgress = easingFunc(progress);
          this.applyAnimationStep(window, easedProgress);
          currentStep++;
          state.animationId = setTimeout(animateStep, stepDuration);
        } catch (error) {
          reject(error);
        }
      };
      animateStep();
    });
  }
  /**
   * 应用动画步骤
   */
  applyAnimationStep(window, progress) {
    try {
      if (progress < 0.3) {
        window.show();
        window.moveTop();
      } else if (progress < 0.6) {
        window.focus();
        window.setAlwaysOnTop(false);
      } else if (progress < 0.9) {
        window.setAlwaysOnTop(true, "normal");
      } else {
        window.setAlwaysOnTop(true, "screen-saver");
        window.focus();
      }
      const opacity = 0.95 + progress * 0.05;
      window.setOpacity(Math.min(1, opacity));
    } catch (error) {
      console.warn("[WindowEffects] 动画步骤执行警告:", error);
    }
  }
  /**
   * 直接置顶（降级方案）
   */
  directBringToTop(window) {
    try {
      console.log("[WindowEffects] 执行直接置顶");
      if (!window.isVisible()) {
        window.show();
      }
      window.focus();
      window.setAlwaysOnTop(true, "screen-saver");
      window.moveTop();
      return true;
    } catch (error) {
      console.error("[WindowEffects] 直接置顶失败:", error);
      return false;
    }
  }
  /**
   * 取消置顶
   */
  cancelTopMost(window) {
    try {
      if (!window || window.isDestroyed()) {
        return false;
      }
      const windowId = window.id;
      const state = this.getWindowState(windowId);
      if (state.isAnimating && state.animationId) {
        clearTimeout(state.animationId);
        state.isAnimating = false;
      }
      window.setAlwaysOnTop(false);
      console.log("[WindowEffects] 已取消置顶");
      return true;
    } catch (error) {
      console.error("[WindowEffects] 取消置顶失败:", error);
      return false;
    }
  }
  /**
   * 检查窗口是否正在动画中
   */
  isAnimating(window) {
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
    for (const [windowId, state] of this.windowStates) {
      if (state.animationId) {
        clearTimeout(state.animationId);
      }
    }
    this.windowStates.clear();
    console.log("[WindowEffects] 资源已清理");
  }
}
const windowEffectsManager = new WindowEffectsManager();
if (process.stdout instanceof stream.Writable) {
  process.stdout.setDefaultEncoding("utf-8");
}
if (process.stderr instanceof stream.Writable) {
  process.stderr.setDefaultEncoding("utf-8");
}
const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = path.join(__dirname, "..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
let petWindow = null;
let settingsWindow = null;
let appTray = null;
let quitting = false;
const DEFAULT_PET_HEIGHT = 400;
const EXPANDED_PET_HEIGHT = 500;
function getIconPath() {
  try {
    const iconPaths = [
      path.join(process.env.APP_ROOT, "public", "pet-icon-backup.png"),
      // 优先使用备份 PNG
      path.join(process.env.APP_ROOT, "public", "pet-icon.png"),
      path.join(process.env.APP_ROOT, "public", "electron-vite.svg"),
      path.join(process.env.APP_ROOT, "public", "electron-vite.animate.svg")
    ];
    for (const iconPath of iconPaths) {
      if (fs.existsSync(iconPath)) {
        console.log("使用图标:", iconPath);
        return iconPath;
      }
    }
    throw new Error("未找到任何有效的图标文件");
  } catch (error) {
    console.error("图标加载失败:", error);
    return "";
  }
}
async function createPetWindow() {
  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;
  petWindow = new BrowserWindow({
    width: screenWidth,
    height: screenHeight,
    x: 0,
    y: 0,
    transparent: true,
    frame: false,
    resizable: false,
    // Window is a canvas, should not be resizable
    // movable: false,   // Removing this. While we don't want the user to move it, setting it to false can interfere with mouse events. The pet's internal movement will handle positioning.
    // fullscreen: true, // This is the property that causes issues on macOS
    skipTaskbar: true,
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
      nodeIntegration: false,
      contextIsolation: true
    }
  });
  if (VITE_DEV_SERVER_URL) {
    petWindow.loadURL(`${VITE_DEV_SERVER_URL}?window=pet`);
    petWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    petWindow.loadFile(path.join(RENDERER_DIST, "index.html"), {
      hash: "pet"
    });
  }
  petWindow.on("closed", () => {
    petWindow = null;
  });
  petWindow.webContents.once("did-finish-load", () => {
    if (petWindow) {
      console.log("[main.ts] 页面加载完成，设置初始鼠标穿透状态: false");
      petWindow.setIgnoreMouseEvents(false, { forward: true });
    }
  });
}
function createSettingsWindow() {
  if (settingsWindow) {
    settingsWindow.focus();
    return;
  }
  settingsWindow = new BrowserWindow({
    width: 650,
    height: 500,
    minWidth: 500,
    minHeight: 400,
    frame: true,
    resizable: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
      nodeIntegration: false,
      contextIsolation: true
    }
  });
  if (VITE_DEV_SERVER_URL) {
    settingsWindow.loadURL(`${VITE_DEV_SERVER_URL}?window=settings`);
  } else {
    settingsWindow.loadFile(path.join(RENDERER_DIST, "index.html"), {
      hash: "settings"
    });
  }
  settingsWindow.on("closed", () => {
    settingsWindow = null;
  });
}
function createTray() {
  try {
    const iconPath = getIconPath();
    console.log("使用托盘图标路径:", iconPath);
    if (appTray !== null) {
      appTray.destroy();
    }
    let retryCount = 0;
    const maxRetries = 3;
    const createTrayWithRetry = () => {
      try {
        const trayIconPath = iconPath || "";
        appTray = new Tray(trayIconPath);
        const contextMenu = Menu.buildFromTemplate([
          {
            label: "显示宠物",
            click: async () => petWindow ? petWindow.show() : await createPetWindow()
            // Ensure createPetWindow is awaited if called
          },
          { label: "设置", click: createSettingsWindow },
          { type: "separator" },
          { label: "退出", click: () => {
            quitting = true;
            app.quit();
          } }
        ]);
        appTray.setToolTip("桌面宠物");
        appTray.setContextMenu(contextMenu);
        appTray.on("click", async () => petWindow ? petWindow.show() : await createPetWindow());
        if (!iconPath) {
          console.warn("使用默认托盘图标");
        } else {
          console.log("托盘图标创建成功");
        }
      } catch (error) {
        if (retryCount < maxRetries) {
          retryCount++;
          console.log(`创建托盘图标失败，正在重试 (${retryCount}/${maxRetries})`);
          setTimeout(createTrayWithRetry, 1e3);
        } else {
          console.error("创建托盘图标最终失败:", error);
        }
      }
    };
    createTrayWithRetry();
  } catch (error) {
    console.error("获取图标路径失败:", error);
  }
}
app.on("window-all-closed", () => {
  if (process.platform !== "darwin" || quitting) {
    app.quit();
  }
});
app.on("activate", async () => {
  if (petWindow === null) {
    await createPetWindow();
  }
});
app.on("before-quit", () => {
  quitting = true;
});
let petBehavior = {
  activityLevel: "normal",
  moveInterval: 1e4,
  // 10秒
  expressionChangeInterval: 15e3
  // 15秒
};
const STATE_FILE = path.join(app.getPath("userData"), "pet-state.json");
const STATE_FILE_BAK = path.join(app.getPath("userData"), "pet-state.json.bak");
const STATE_FILE_TMP = path.join(app.getPath("userData"), "pet-state.json.tmp");
async function loadSavedState() {
  try {
    const data = await promises.readFile(STATE_FILE, "utf-8");
    console.log("成功加载状态文件:", STATE_FILE);
    const parsedData = JSON.parse(data);
    if (parsedData && typeof parsedData === "object" && parsedData.status && parsedData.petTypeId) {
      return parsedData;
    } else {
      console.warn("解析的状态文件数据格式无效:", parsedData);
      return null;
    }
  } catch (err) {
    console.warn(`加载主状态文件失败 (${STATE_FILE}):`, err.message);
    try {
      const bakData = await promises.readFile(STATE_FILE_BAK, "utf-8");
      console.log("成功加载备份状态文件:", STATE_FILE_BAK);
      await promises.copyFile(STATE_FILE_BAK, STATE_FILE);
      console.log("已从备份恢复状态文件。");
      const parsedBakData = JSON.parse(bakData);
      if (parsedBakData && typeof parsedBakData === "object" && parsedBakData.status && parsedBakData.petTypeId) {
        return parsedBakData;
      } else {
        console.warn("解析的备份状态文件数据格式无效:", parsedBakData);
        return null;
      }
    } catch (bakErr) {
      console.warn(`加载备份状态文件失败 (${STATE_FILE_BAK}):`, bakErr.message);
      console.log("无法加载任何状态文件，将使用默认状态。");
      return null;
    }
  }
}
async function saveStateToFile(stateToSave) {
  try {
    try {
      await promises.rename(STATE_FILE, STATE_FILE_BAK);
    } catch (renameErr) {
      if (renameErr.code !== "ENOENT") {
        console.warn("备份旧状态文件失败:", renameErr);
      }
    }
    await promises.writeFile(STATE_FILE_TMP, JSON.stringify(stateToSave, null, 2));
    await promises.rename(STATE_FILE_TMP, STATE_FILE);
  } catch (err) {
    console.error("保存宠物状态到文件失败:", err);
  }
}
ipcMain.handle("get-window-position", () => {
  return petWindow == null ? void 0 : petWindow.getPosition();
});
ipcMain.on("adjust-pet-window-size", (_, expand) => {
  if (!petWindow) return;
  try {
    const currentBounds = petWindow.getBounds();
    const newHeight = expand ? EXPANDED_PET_HEIGHT : DEFAULT_PET_HEIGHT;
    console.log(`Adjusting window size. Expand: ${expand}. New height: ${newHeight}`);
    const newY = currentBounds.y + (currentBounds.height - newHeight);
    petWindow.setBounds({
      x: currentBounds.x,
      y: Math.round(newY),
      // 确保 Y 是整数
      width: currentBounds.width,
      height: newHeight
    });
  } catch (error) {
    console.error("调整窗口大小失败:", error);
  }
});
ipcMain.on("open-settings", () => {
  createSettingsWindow();
});
ipcMain.on("set-always-on-top", (_, flag) => {
  if (petWindow) {
    petWindow.setAlwaysOnTop(flag);
  }
});
ipcMain.handle("get-pet-settings", async () => {
  return {
    petType: "default",
    alwaysOnTop: true,
    soundEnabled: true,
    activityLevel: petBehavior.activityLevel,
    autoHideFullscreen: true,
    launchOnStartup: true,
    size: 100,
    opacity: 100
  };
});
ipcMain.on("save-pet-settings", (_, settings) => {
  console.log("保存设置:", settings);
  if (settings.activityLevel) {
    petBehavior.activityLevel = settings.activityLevel;
    updateBehaviorBasedOnActivity();
  }
  if (petWindow) {
    petWindow.setAlwaysOnTop(settings.alwaysOnTop);
    petWindow.webContents.send("update-pet-appearance", {
      size: settings.size,
      opacity: settings.opacity
    });
  }
});
ipcMain.handle("get-pet-state", async () => {
  return await loadSavedState();
});
ipcMain.on("save-pet-state", (_, stateToSave) => {
  if (stateToSave) {
    saveStateToFile(stateToSave);
  } else {
    console.warn("收到空的 save-pet-state 请求，已忽略。");
  }
});
ipcMain.on("update-pet-behavior", (_, behavior) => {
  petBehavior = { ...petBehavior, ...behavior };
  updateBehaviorBasedOnActivity();
});
function updateBehaviorBasedOnActivity() {
  switch (petBehavior.activityLevel) {
    case "calm":
      petBehavior.moveInterval = 15e3;
      petBehavior.expressionChangeInterval = 2e4;
      break;
    case "normal":
      petBehavior.moveInterval = 1e4;
      petBehavior.expressionChangeInterval = 15e3;
      break;
    case "playful":
      petBehavior.moveInterval = 5e3;
      petBehavior.expressionChangeInterval = 8e3;
      break;
  }
  petWindow == null ? void 0 : petWindow.webContents.send("update-pet-behavior", petBehavior);
}
ipcMain.on("set-mouse-passthrough", (_, enable) => {
  if (petWindow) {
    console.log(`[main.ts] Setting mouse passthrough: ${enable}`);
    petWindow.setIgnoreMouseEvents(enable, { forward: true });
  }
});
ipcMain.on("exit-app", () => {
  quitting = true;
  app.quit();
});
ipcMain.handle("smooth-bring-to-top", async () => {
  if (!petWindow) {
    console.warn("[main.ts] 宠物窗口不存在，无法执行置顶");
    return { success: false, error: "窗口不存在" };
  }
  try {
    const success = await windowEffectsManager.smoothBringToTop(petWindow);
    console.log(`[main.ts] 丝滑置顶${success ? "成功" : "失败"}`);
    return { success, error: success ? null : "置顶失败" };
  } catch (error) {
    console.error("[main.ts] 丝滑置顶异常:", error);
    return { success: false, error: error.message };
  }
});
ipcMain.handle("cancel-top-most", () => {
  if (!petWindow) {
    console.warn("[main.ts] 宠物窗口不存在，无法取消置顶");
    return { success: false, error: "窗口不存在" };
  }
  try {
    const success = windowEffectsManager.cancelTopMost(petWindow);
    console.log(`[main.ts] 取消置顶${success ? "成功" : "失败"}`);
    return { success, error: success ? null : "取消置顶失败" };
  } catch (error) {
    console.error("[main.ts] 取消置顶异常:", error);
    return { success: false, error: error.message };
  }
});
ipcMain.handle("get-window-effects-config", () => {
  try {
    const config = windowEffectsManager.getConfig();
    return { success: true, config, error: null };
  } catch (error) {
    console.error("[main.ts] 获取窗口特效配置异常:", error);
    return { success: false, config: null, error: error.message };
  }
});
ipcMain.handle("update-window-effects-config", (_, newConfig) => {
  try {
    windowEffectsManager.updateConfig(newConfig);
    const config = windowEffectsManager.getConfig();
    console.log("[main.ts] 窗口特效配置已更新:", config);
    return { success: true, config, error: null };
  } catch (error) {
    console.error("[main.ts] 更新窗口特效配置异常:", error);
    return { success: false, config: null, error: error.message };
  }
});
ipcMain.handle("is-window-animating", () => {
  if (!petWindow) {
    return { success: false, isAnimating: false, error: "窗口不存在" };
  }
  try {
    const isAnimating = windowEffectsManager.isAnimating(petWindow);
    return { success: true, isAnimating, error: null };
  } catch (error) {
    console.error("[main.ts] 检查窗口动画状态异常:", error);
    return { success: false, isAnimating: false, error: error.message };
  }
});
ipcMain.on("show-status-details", () => {
  console.log("显示宠物状态详情");
});
ipcMain.on("show-skin-selector", () => {
  console.log("显示皮肤选择器");
});
ipcMain.on("show-name-editor", () => {
  console.log("显示名称编辑器");
});
ipcMain.on("take-pet-photo", async () => {
  if (!petWindow) return;
  try {
    const image = await petWindow.webContents.capturePage();
    const { filePath } = await dialog.showSaveDialog({
      title: "保存宠物照片",
      defaultPath: path.join(app.getPath("pictures"), `pet-photo-${Date.now()}.png`),
      filters: [{ name: "Images", extensions: ["png"] }]
    });
    if (filePath) {
      await promises.writeFile(filePath, image.toPNG());
      console.log("宠物照片已保存到:", filePath);
    }
  } catch (error) {
    console.error("拍照失败:", error);
  }
});
ipcMain.on("hide-pet-window", () => {
  if (petWindow) {
    petWindow.hide();
  }
});
app.whenReady().then(async () => {
  await createPetWindow();
  createTray();
  globalShortcut.register("Alt+P", () => {
    if (petWindow) {
      if (petWindow.isVisible()) {
        petWindow.hide();
      } else {
        petWindow.show();
      }
    }
  });
});
app.on("will-quit", async () => {
  windowEffectsManager.cleanup();
  console.log("[main.ts] 窗口特效管理器资源已清理");
  globalShortcut.unregisterAll();
});
export {
  MAIN_DIST,
  RENDERER_DIST,
  VITE_DEV_SERVER_URL
};
