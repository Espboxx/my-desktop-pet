import { app, BrowserWindow, ipcMain, screen, globalShortcut, Tray, Menu } from 'electron'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let petWindow: BrowserWindow | null = null
let settingsWindow: BrowserWindow | null = null
let appTray: Tray | null = null
let quitting = false

// 宠物窗口尺寸常量
const DEFAULT_PET_HEIGHT = 400; // Increased default height for vertical layout
const EXPANDED_PET_HEIGHT = 500; // 展开后的高度（足够显示菜单）

// 获取图标路径
function getIconPath(): string {
  try {
    const iconPaths = [
      path.join(process.env.APP_ROOT!, 'public', 'electron-vite.svg'), // 优先使用SVG
      path.join(process.env.APP_ROOT!, 'public', 'electron-vite.animate.svg'),
      path.join(process.env.APP_ROOT!, 'public', 'pet-icon.png'),
      path.join(process.env.APP_ROOT!, 'public', 'pet-icon-backup.png')
    ];

    for (const iconPath of iconPaths) {
      if (fs.existsSync(iconPath)) {
        console.log('使用图标:', iconPath);
        return iconPath;
      }
    }

    throw new Error('未找到任何有效的图标文件');
  } catch (error) {
    console.error('图标加载失败:', error);
    // 返回空字符串而不是抛出错误，允许应用继续运行
    return '';
  }
}

// 创建宠物窗口
function createPetWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize // 获取屏幕工作区尺寸

  petWindow = new BrowserWindow({
    width: width,  // 设置为屏幕宽度
    height: height, // 设置为屏幕高度
    x: 0,         // 从屏幕左上角开始
    y: 0,         // 从屏幕左上角开始
    transparent: true, // 设置背景透明
    frame: false,
    resizable: false,
    skipTaskbar: true,
    alwaysOnTop: true, // 保持置顶
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      nodeIntegration: false,
      contextIsolation: true
    },
  })

  // 设置鼠标穿透，允许事件转发到下面的窗口
  petWindow.setIgnoreMouseEvents(true, { forward: true })
  
  // 禁止窗口右键菜单 (Temporarily disabled for debugging context menu issue)
  // petWindow.hookWindowMessage(0x0116, () => {
  //   petWindow?.setEnabled(false)
  //   petWindow?.setEnabled(true)
  //   return true
  // })

  if (VITE_DEV_SERVER_URL) {
    petWindow.loadURL(`${VITE_DEV_SERVER_URL}?window=pet`)
    petWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    petWindow.loadFile(path.join(RENDERER_DIST, 'index.html'), { 
      hash: 'pet' 
    })
  }
  
  petWindow.on('closed', () => {
    petWindow = null
  })

  // Remove the context-menu listener again
  // petWindow.webContents.on('context-menu', (event) => { ... })
}

// 创建设置窗口
function createSettingsWindow() {
  if (settingsWindow) {
    settingsWindow.focus()
    return
  }
  
  settingsWindow = new BrowserWindow({
    width: 650,
    height: 500,
    minWidth: 500,
    minHeight: 400,
    frame: true,
    resizable: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  if (VITE_DEV_SERVER_URL) {
    settingsWindow.loadURL(`${VITE_DEV_SERVER_URL}?window=settings`)
  } else {
    settingsWindow.loadFile(path.join(RENDERER_DIST, 'index.html'), {
      hash: 'settings'
    })
  }
  
  settingsWindow.on('closed', () => {
    settingsWindow = null
  })
}

// 创建托盘图标
function createTray() {
  try {
    const iconPath = getIconPath()
    console.log('使用托盘图标路径:', iconPath)
    
    // 如果已有托盘，先销毁它
    if (appTray !== null) {
      appTray.destroy()
    }

    // 添加重试逻辑
    let retryCount = 0
    const maxRetries = 3
    
    const createTrayWithRetry = () => {
      try {
        // 如果图标路径为空，使用空字符串创建默认图标
        const trayIconPath = iconPath || '';
        appTray = new Tray(trayIconPath)
        
        // 创建上下文菜单
        const contextMenu = Menu.buildFromTemplate([
          {
            label: '显示宠物',
            click: () => petWindow ? petWindow.show() : createPetWindow()
          },
          { label: '设置', click: createSettingsWindow },
          { type: 'separator' },
          { label: '退出', click: () => { quitting = true; app.quit() } }
        ])
        
        appTray.setToolTip('桌面宠物')
        appTray.setContextMenu(contextMenu)
        
        appTray.on('click', () => petWindow ? petWindow.show() : createPetWindow())
        
        if (!iconPath) {
          console.warn('使用默认托盘图标')
        } else {
          console.log('托盘图标创建成功')
        }
      } catch (error) {
        if (retryCount < maxRetries) {
          retryCount++
          console.log(`创建托盘图标失败，正在重试 (${retryCount}/${maxRetries})`)
          setTimeout(createTrayWithRetry, 1000)
        } else {
          console.error('创建托盘图标最终失败:', error)
          // 继续运行应用，只是没有托盘图标
        }
      }
    }
    
    createTrayWithRetry()
  } catch (error) {
    console.error('获取图标路径失败:', error)
    // 继续运行应用，只是没有托盘图标
  }
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin' || quitting) {
    app.quit()
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (petWindow === null) {
    createPetWindow()
  }
})

app.on('before-quit', () => {
  quitting = true
})

// 宠物状态
interface PetState {
  mood: number; // 0-100
  cleanliness: number; // 0-100
  hunger: number; // 0-100
  energy: number; // 0-100
  lastInteractionTime: number;
}

let petState: PetState = {
  mood: 80,
  cleanliness: 90,
  hunger: 30,
  energy: 70,
  lastInteractionTime: Date.now()
};

// 宠物行为配置
interface PetBehavior {
  activityLevel: 'calm' | 'normal' | 'playful';
  moveInterval: number;
  expressionChangeInterval: number;
}

let petBehavior: PetBehavior = {
  activityLevel: 'normal',
  moveInterval: 10000, // 10秒
  expressionChangeInterval: 15000 // 15秒
};

// 状态持久化
const STATE_FILE = path.join(app.getPath('userData'), 'pet-state.json');

async function loadPetState() {
  try {
    const data = await fs.promises.readFile(STATE_FILE, 'utf-8');
    petState = JSON.parse(data);
    petState.lastInteractionTime = Date.now(); // 重置最后互动时间
  } catch (err) {
    console.log('使用默认宠物状态');
  }
}

async function savePetState() {
  try {
    await fs.promises.writeFile(STATE_FILE, JSON.stringify(petState));
  } catch (err) {
    console.error('保存宠物状态失败:', err);
  }
}

// 状态衰减定时器
function startStateDecayTimer() {
  setInterval(() => {
    // 根据时间衰减状态
    const hoursSinceInteraction = (Date.now() - petState.lastInteractionTime) / (1000 * 60 * 60);
    
    petState.mood = Math.max(0, petState.mood - hoursSinceInteraction * 5);
    petState.cleanliness = Math.max(0, petState.cleanliness - hoursSinceInteraction * 3);
    petState.hunger = Math.min(100, petState.hunger + hoursSinceInteraction * 8);
    petState.energy = Math.max(0, petState.energy - hoursSinceInteraction * 4);
    
    // 保存状态并通知渲染进程
    savePetState();
    petWindow?.webContents.send('pet-state-update', petState);
    
  }, 30 * 60 * 1000); // 每30分钟检查一次
}

// IPC 事件处理

// // 旧的拖动逻辑 (基于增量) - 已被新的绝对定位逻辑取代
// ipcMain.on('pet-drag', (event, { mouseX, mouseY }) => {
//   const position = petWindow?.getPosition()
//   if (position && petWindow) {
//     const [x, y] = position
//     petWindow.setPosition(x + mouseX, y + mouseY)
//   }
// })

// 新的拖动逻辑 - 获取窗口当前位置
ipcMain.handle('get-window-position', () => {
  return petWindow?.getPosition();
});

// 新的拖动逻辑 - 设置窗口绝对位置
ipcMain.on('set-pet-position', (event, { x, y }: { x: number, y: number }) => {
  if (petWindow) {
    console.log(`[main.ts] Received set-pet-position: x=${x}, y=${y}`); // 添加日志：记录收到的坐标
    const roundedX = Math.round(x);
    const roundedY = Math.round(y);
    // 添加一些边界检查或限制（可选） - 简单的 NaN 检查
    if (isNaN(roundedX) || isNaN(roundedY)) {
      console.error(`[main.ts] Invalid coordinates received: x=${x}, y=${y}. Aborting setPosition.`);
      return;
    }
    petWindow.setPosition(roundedX, roundedY);
    // 添加日志：记录设置后的实际位置
    const currentPosition = petWindow.getPosition();
    console.log(`[main.ts] Window position set to: x=${currentPosition[0]}, y=${currentPosition[1]}`);
  }
});

// 监听渲染进程的窗口大小调整请求
ipcMain.on('adjust-pet-window-size', (event, expand: boolean) => {
  if (!petWindow) return;

  try {
    const currentBounds = petWindow.getBounds();
    const newHeight = expand ? EXPANDED_PET_HEIGHT : DEFAULT_PET_HEIGHT;

    console.log(`Adjusting window size. Expand: ${expand}. New height: ${newHeight}`);

    // 保持宽度和 X 坐标不变，只改变高度和 Y 坐标
    // Y 坐标需要调整以使窗口底部边缘保持在原位
    const newY = currentBounds.y + (currentBounds.height - newHeight);

    petWindow.setBounds({
      x: currentBounds.x,
      y: Math.round(newY), // 确保 Y 是整数
      width: currentBounds.width,
      height: newHeight
    });
  } catch (error) {
    console.error('调整窗口大小失败:', error);
  }
});

ipcMain.on('open-settings', () => {
  createSettingsWindow()
})

ipcMain.on('set-always-on-top', (event, flag) => {
  if (petWindow) {
    petWindow.setAlwaysOnTop(flag)
  }
})

ipcMain.handle('get-pet-settings', async () => {
  // 这里可以从配置文件或数据库读取宠物设置
  return {
    petType: 'default',
    alwaysOnTop: true,
    soundEnabled: true,
    activityLevel: petBehavior.activityLevel,
    autoHideFullscreen: true,
    launchOnStartup: true,
    size: 100,
    opacity: 100
  }
})

ipcMain.on('save-pet-settings', (event, settings) => {
  // 保存设置到配置文件或数据库
  console.log('保存设置:', settings)
  
  // 更新行为配置
  if (settings.activityLevel) {
    petBehavior.activityLevel = settings.activityLevel;
    updateBehaviorBasedOnActivity();
  }
  
  // 应用部分设置到宠物窗口
  if (petWindow) {
    petWindow.setAlwaysOnTop(settings.alwaysOnTop)
    
    // 设置大小和透明度
    petWindow.webContents.send('update-pet-appearance', {
      size: settings.size,
      opacity: settings.opacity
    })
  }
})

// 新API实现
ipcMain.handle('get-pet-state', async () => {
  return petState;
});

ipcMain.on('interact-with-pet', (event, action) => {
  switch (action) {
    case 'feed':
      petState.hunger = Math.max(0, petState.hunger - 30);
      petState.mood = Math.min(100, petState.mood + 10);
      break;
    case 'pet':
      petState.mood = Math.min(100, petState.mood + 15);
      break;
    case 'clean':
      petState.cleanliness = Math.min(100, petState.cleanliness + 40);
      break;
  }
  petState.lastInteractionTime = Date.now();
  savePetState();
  petWindow?.webContents.send('pet-state-update', petState);
});

ipcMain.on('update-pet-behavior', (event, behavior) => {
  petBehavior = { ...petBehavior, ...behavior };
  updateBehaviorBasedOnActivity();
});

function updateBehaviorBasedOnActivity() {
  switch (petBehavior.activityLevel) {
    case 'calm':
      petBehavior.moveInterval = 15000;
      petBehavior.expressionChangeInterval = 20000;
      break;
    case 'normal':
      petBehavior.moveInterval = 10000;
      petBehavior.expressionChangeInterval = 15000;
      break;
    case 'playful':
      petBehavior.moveInterval = 5000;
      petBehavior.expressionChangeInterval = 8000;
      break;
  }
  petWindow?.webContents.send('update-pet-behavior', petBehavior);
}

// 新增：处理渲染进程请求切换鼠标穿透状态
ipcMain.on('set-mouse-passthrough', (event, enable: boolean) => {
  if (petWindow) {
    console.log(`[main.ts] Setting mouse passthrough: ${enable}`);
    petWindow.setIgnoreMouseEvents(enable, { forward: true });
  }
});

// 新增：处理退出应用程序的请求
ipcMain.on('exit-app', () => {
  quitting = true; // 设置标志以允许退出
  app.quit();
});

// 应用启动初始化
app.whenReady().then(() => {
  // 暂时禁用托盘功能
  createPetWindow()
  
  // 全局快捷键
  globalShortcut.register('Alt+P', () => {
    if (petWindow && petWindow.isVisible()) {
      petWindow.hide()
    } else if (petWindow) {
      petWindow.show()
    } else {
      createPetWindow()
    }
  })
})

// 清理
app.on('will-quit', () => {
  globalShortcut.unregisterAll()
  // 暂时禁用托盘功能
})
