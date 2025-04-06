import { app, ipcMain, globalShortcut, screen, BrowserWindow, Tray, Menu, dialog } from "electron";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs, { promises } from "node:fs";
import * as stream from "stream";
if (process.stdout instanceof stream.Writable) {
  process.stdout.setDefaultEncoding("utf-8");
}
if (process.stderr instanceof stream.Writable) {
  process.stderr.setDefaultEncoding("utf-8");
}
createRequire(import.meta.url);
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
const DEFAULT_PET_WIDTH = 300;
const DEFAULT_PET_HEIGHT = 400;
const EXPANDED_PET_HEIGHT = 500;
function getIconPath() {
  try {
    const iconPaths = [
      path.join(process.env.APP_ROOT, "public", "electron-vite.svg"),
      // 优先使用SVG
      path.join(process.env.APP_ROOT, "public", "electron-vite.animate.svg"),
      path.join(process.env.APP_ROOT, "public", "pet-icon.png"),
      path.join(process.env.APP_ROOT, "public", "pet-icon-backup.png")
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
  const savedState = await loadSavedState();
  let initialX;
  let initialY;
  if ((savedState == null ? void 0 : savedState.position) && typeof savedState.position.x === "number" && typeof savedState.position.y === "number") {
    initialX = Math.max(0, Math.min(savedState.position.x, screenWidth - DEFAULT_PET_WIDTH));
    initialY = Math.max(0, Math.min(savedState.position.y, screenHeight - DEFAULT_PET_HEIGHT));
    console.log(`[main.ts] Loaded saved position: x=${initialX}, y=${initialY}`);
  } else {
    initialX = screenWidth - DEFAULT_PET_WIDTH;
    initialY = screenHeight - DEFAULT_PET_HEIGHT;
    console.log(`[main.ts] No saved position found, using default: x=${initialX}, y=${initialY}`);
  }
  petWindow = new BrowserWindow({
    width: DEFAULT_PET_WIDTH,
    // Use default width
    height: DEFAULT_PET_HEIGHT,
    // Use default height
    x: Math.round(initialX),
    // Use calculated X
    y: Math.round(initialY),
    // Use calculated Y
    transparent: true,
    // 启用透明背景
    frame: false,
    // 移除窗口框架以实现完全透明效果
    resizable: true,
    // 允许调整大小
    fullscreen: true,
    // 程序初始化时全屏显示
    skipTaskbar: true,
    // 不再跳过任务栏
    // alwaysOnTop: true, // 不再保持置顶
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
ipcMain.on("set-pet-position", (event, { x, y }) => {
  if (petWindow) {
    console.log(`[main.ts] Received set-pet-position: x=${x}, y=${y}`);
    const roundedX = Math.round(x);
    const roundedY = Math.round(y);
    if (isNaN(roundedX) || isNaN(roundedY)) {
      console.error(`[main.ts] Invalid coordinates received: x=${x}, y=${y}. Aborting setPosition.`);
      return;
    }
    petWindow.setPosition(roundedX, roundedY);
    const currentPosition = petWindow.getPosition();
    console.log(`[main.ts] Window position set to: x=${currentPosition[0]}, y=${currentPosition[1]}`);
  }
});
ipcMain.on("adjust-pet-window-size", (event, expand) => {
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
ipcMain.on("set-always-on-top", (event, flag) => {
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
ipcMain.on("save-pet-settings", (event, settings) => {
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
ipcMain.on("save-pet-state", (event, stateToSave) => {
  if (stateToSave) {
    saveStateToFile(stateToSave);
  } else {
    console.warn("收到空的 save-pet-state 请求，已忽略。");
  }
});
ipcMain.on("update-pet-behavior", (event, behavior) => {
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
ipcMain.on("set-mouse-passthrough", (event, enable) => {
  if (petWindow) {
    console.log(`[main.ts] Setting mouse passthrough: ${enable}`);
    petWindow.setIgnoreMouseEvents(enable, { forward: true });
  }
});
ipcMain.on("exit-app", () => {
  quitting = true;
  app.quit();
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
  if (petWindow) {
    try {
      const currentPosition = petWindow.getPosition();
      const [x, y] = currentPosition;
      console.log(`[main.ts] Saving position on quit: x=${x}, y=${y}`);
      const currentState = await loadSavedState();
      if (currentState) {
        currentState.position = { x, y };
        await saveStateToFile(currentState);
        console.log("[main.ts] Position saved successfully.");
      } else {
        console.warn("[main.ts] Could not save position: pet-state.json not found or invalid.");
      }
    } catch (error) {
      console.error("[main.ts] Error saving pet position:", error);
    }
  }
  globalShortcut.unregisterAll();
});
export {
  MAIN_DIST,
  RENDERER_DIST,
  VITE_DEV_SERVER_URL
};
