import { app, ipcMain, globalShortcut, screen, BrowserWindow } from "electron";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";
createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = path.join(__dirname, "..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
let petWindow = null;
let settingsWindow = null;
let quitting = false;
const DEFAULT_PET_HEIGHT = 400;
const EXPANDED_PET_HEIGHT = 500;
function createPetWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  petWindow = new BrowserWindow({
    width,
    // 设置为屏幕宽度
    height,
    // 设置为屏幕高度
    x: 0,
    // 从屏幕左上角开始
    y: 0,
    // 从屏幕左上角开始
    transparent: true,
    // 设置背景透明
    frame: false,
    resizable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    // 保持置顶
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
      nodeIntegration: false,
      contextIsolation: true
    }
  });
  petWindow.setIgnoreMouseEvents(true, { forward: true });
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
app.on("window-all-closed", () => {
  if (process.platform !== "darwin" || quitting) {
    app.quit();
  }
});
app.on("activate", () => {
  if (petWindow === null) {
    createPetWindow();
  }
});
app.on("before-quit", () => {
  quitting = true;
});
let petState = {
  mood: 80,
  cleanliness: 90,
  hunger: 30,
  energy: 70,
  lastInteractionTime: Date.now()
};
let petBehavior = {
  activityLevel: "normal",
  moveInterval: 1e4,
  // 10秒
  expressionChangeInterval: 15e3
  // 15秒
};
const STATE_FILE = path.join(app.getPath("userData"), "pet-state.json");
async function savePetState() {
  try {
    await fs.promises.writeFile(STATE_FILE, JSON.stringify(petState));
  } catch (err) {
    console.error("保存宠物状态失败:", err);
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
  return petState;
});
ipcMain.on("interact-with-pet", (event, action) => {
  switch (action) {
    case "feed":
      petState.hunger = Math.max(0, petState.hunger - 30);
      petState.mood = Math.min(100, petState.mood + 10);
      break;
    case "pet":
      petState.mood = Math.min(100, petState.mood + 15);
      break;
    case "clean":
      petState.cleanliness = Math.min(100, petState.cleanliness + 40);
      break;
  }
  petState.lastInteractionTime = Date.now();
  savePetState();
  petWindow == null ? void 0 : petWindow.webContents.send("pet-state-update", petState);
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
app.whenReady().then(() => {
  createPetWindow();
  globalShortcut.register("Alt+P", () => {
    if (petWindow && petWindow.isVisible()) {
      petWindow.hide();
    } else if (petWindow) {
      petWindow.show();
    } else {
      createPetWindow();
    }
  });
});
app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});
export {
  MAIN_DIST,
  RENDERER_DIST,
  VITE_DEV_SERVER_URL
};
