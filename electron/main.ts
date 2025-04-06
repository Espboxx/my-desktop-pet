import { app, BrowserWindow, ipcMain, screen, globalShortcut, Tray, Menu, dialog } from 'electron'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'
import { promises as fsPromises } from 'node:fs'
import * as stream from 'stream';
import type { SavedPetData } from '../src/types/petTypes'; // Import the type

// 设置标准输出和标准错误的编码为 UTF-8
if (process.stdout instanceof stream.Writable) {
  process.stdout.setDefaultEncoding('utf-8');
}
if (process.stderr instanceof stream.Writable) {
  process.stderr.setDefaultEncoding('utf-8');
}


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
const DEFAULT_PET_WIDTH = 300; // Default width
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
async function createPetWindow() { // Make async
  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize // 获取屏幕工作区尺寸

  // Load saved state to get position
  const savedState = await loadSavedState();
  let initialX: number;
  let initialY: number;

  if (savedState?.position && typeof savedState.position.x === 'number' && typeof savedState.position.y === 'number') {
    // Use saved position, ensuring it's within screen bounds
    initialX = Math.max(0, Math.min(savedState.position.x, screenWidth - DEFAULT_PET_WIDTH));
    initialY = Math.max(0, Math.min(savedState.position.y, screenHeight - DEFAULT_PET_HEIGHT));
    console.log(`[main.ts] Loaded saved position: x=${initialX}, y=${initialY}`);
  } else {
    // Default position: bottom right corner
    initialX = screenWidth - DEFAULT_PET_WIDTH;
    initialY = screenHeight - DEFAULT_PET_HEIGHT;
    console.log(`[main.ts] No saved position found, using default: x=${initialX}, y=${initialY}`);
  }

  petWindow = new BrowserWindow({
    width: DEFAULT_PET_WIDTH,  // Use default width
    height: DEFAULT_PET_HEIGHT, // Use default height
    x: Math.round(initialX), // Use calculated X
    y: Math.round(initialY), // Use calculated Y
    transparent: true, // 启用透明背景
    frame: false,      // 移除窗口框架以实现完全透明效果
    resizable: true,   // 允许调整大小
    fullscreen: true,  // 程序初始化时全屏显示
    skipTaskbar: true, // 不再跳过任务栏
    // alwaysOnTop: true, // 不再保持置顶
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      nodeIntegration: false,
      contextIsolation: true
    },
  })



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
            click: async () => petWindow ? petWindow.show() : await createPetWindow() // Ensure createPetWindow is awaited if called
          },
          { label: '设置', click: createSettingsWindow },
          { type: 'separator' },
          { label: '退出', click: () => { quitting = true; app.quit() } }
        ])

        appTray.setToolTip('桌面宠物')
        appTray.setContextMenu(contextMenu)

        appTray.on('click', async () => petWindow ? petWindow.show() : await createPetWindow()) // Ensure createPetWindow is awaited if called

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

app.on('activate', async () => { // Make async
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (petWindow === null) {
    await createPetWindow() // Await the async function
  }
})

app.on('before-quit', () => {
  quitting = true
})

// 宠物行为配置 (保留，因为它似乎由设置管理)
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

// 移除主进程的 petState 变量
// let petState: PetState = { ... };

// 状态持久化
const STATE_FILE = path.join(app.getPath('userData'), 'pet-state.json');
const STATE_FILE_BAK = path.join(app.getPath('userData'), 'pet-state.json.bak');
const STATE_FILE_TMP = path.join(app.getPath('userData'), 'pet-state.json.tmp');

// 加载状态文件，优先加载主文件，失败则尝试备份文件
async function loadSavedState(): Promise<SavedPetData | null> { // Update return type
  try {
    const data = await fsPromises.readFile(STATE_FILE, 'utf-8');
    console.log('成功加载状态文件:', STATE_FILE);
    const parsedData = JSON.parse(data);
    // Basic validation to ensure it looks like SavedPetData
    if (parsedData && typeof parsedData === 'object' && parsedData.status && parsedData.petTypeId) {
        return parsedData as SavedPetData;
    } else {
        console.warn('解析的状态文件数据格式无效:', parsedData);
        return null;
    }
  } catch (err: any) {
    console.warn(`加载主状态文件失败 (${STATE_FILE}):`, err.message);
    // 尝试加载备份文件
    try {
      const bakData = await fsPromises.readFile(STATE_FILE_BAK, 'utf-8');
      console.log('成功加载备份状态文件:', STATE_FILE_BAK);
      // 将备份恢复为主文件
      await fsPromises.copyFile(STATE_FILE_BAK, STATE_FILE);
      console.log('已从备份恢复状态文件。');
      const parsedBakData = JSON.parse(bakData);
      // Basic validation
      if (parsedBakData && typeof parsedBakData === 'object' && parsedBakData.status && parsedBakData.petTypeId) {
          return parsedBakData as SavedPetData;
      } else {
          console.warn('解析的备份状态文件数据格式无效:', parsedBakData);
          return null;
      }
    } catch (bakErr: any) {
      console.warn(`加载备份状态文件失败 (${STATE_FILE_BAK}):`, bakErr.message);
      console.log('无法加载任何状态文件，将使用默认状态。');
      return null; // 表示加载失败，应使用默认值
    }
  }
}

// 保存状态到文件（原子写入 + 备份）
async function saveStateToFile(stateToSave: SavedPetData) { // Update parameter type
  try {
    // 1. 备份旧文件 (如果存在)
    try {
      await fsPromises.rename(STATE_FILE, STATE_FILE_BAK);
    } catch (renameErr: any) {
      if (renameErr.code !== 'ENOENT') { // ENOENT means the file didn't exist, which is fine
        console.warn('备份旧状态文件失败:', renameErr);
      }
    }

    // 2. 写入临时文件
    await fsPromises.writeFile(STATE_FILE_TMP, JSON.stringify(stateToSave, null, 2)); // 添加格式化以便阅读

    // 3. 重命名临时文件为主文件 (原子操作)
    await fsPromises.rename(STATE_FILE_TMP, STATE_FILE);
    // console.log('宠物状态已保存:', STATE_FILE); // 可以取消注释以进行调试

  } catch (err) {
    console.error('保存宠物状态到文件失败:', err);
    // 尝试恢复备份（如果存在）？或者只是记录错误
  }
}



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
// 处理获取状态请求，加载并返回状态
ipcMain.handle('get-pet-state', async () => {
  return await loadSavedState(); // 返回加载的状态或 null
});



// 新增：处理保存状态请求
ipcMain.on('save-pet-state', (event, stateToSave) => {
  if (stateToSave) {
    saveStateToFile(stateToSave);
  } else {
    console.warn('收到空的 save-pet-state 请求，已忽略。');
  }
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

// 处理渲染进程请求切换鼠标穿透状态
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

// 新增：显示状态详情
ipcMain.on('show-status-details', () => {
  console.log('显示宠物状态详情');
  // TODO: 实现状态详情窗口
});

// 新增：显示皮肤选择器
ipcMain.on('show-skin-selector', () => {
  console.log('显示皮肤选择器');
  // TODO: 实现皮肤选择器窗口
});

// 新增：显示名称编辑器
ipcMain.on('show-name-editor', () => {
  console.log('显示名称编辑器');
  // TODO: 实现名称编辑器窗口
});

// 新增：处理拍照请求
ipcMain.on('take-pet-photo', async () => {
  if (!petWindow) return;

  try {
    const image = await petWindow.webContents.capturePage();
    const { filePath } = await dialog.showSaveDialog({
      title: '保存宠物照片',
      defaultPath: path.join(app.getPath('pictures'), `pet-photo-${Date.now()}.png`),
      filters: [{ name: 'Images', extensions: ['png'] }]
    });

    if (filePath) {
      await fsPromises.writeFile(filePath, image.toPNG());
      console.log('宠物照片已保存到:', filePath);
      // 可以选择性地显示一个通知
      // new Notification({ title: '拍照成功', body: `照片已保存到 ${filePath}` }).show();
    }
  } catch (error) {
    console.error('拍照失败:', error);
    // 可以选择性地显示一个错误通知
    // new Notification({ title: '拍照失败', body: '无法保存照片。' }).show();
  }
});

// 新增：处理隐藏窗口请求
ipcMain.on('hide-pet-window', () => {
  if (petWindow) {
    petWindow.hide();
  }
});

// App Ready
app.whenReady().then(async () => { // Make async
  // Load state before creating window
  // const initialState = await loadSavedState(); // Already loaded within createPetWindow

  // 移除状态衰减定时器调用
  // startStateDecayTimer();

  await createPetWindow() // Await the async function
  createTray()

  // 注册全局快捷键 (示例)
  globalShortcut.register('Alt+P', () => {
    if (petWindow) {
      if (petWindow.isVisible()) {
        petWindow.hide()
      } else {
        petWindow.show()
      }
    }
  })
});

// App Will Quit
app.on('will-quit', async () => { // Make async
  // Save current window position before quitting
  if (petWindow) {
    try {
      const currentPosition = petWindow.getPosition();
      const [x, y] = currentPosition;
      console.log(`[main.ts] Saving position on quit: x=${x}, y=${y}`);

      // Load the last known state
      const currentState = await loadSavedState();

      if (currentState) {
        // Update the position in the state
        currentState.position = { x, y };
        // Save the updated state
        await saveStateToFile(currentState);
        console.log('[main.ts] Position saved successfully.');
      } else {
        // If no state file exists, maybe create one just with position?
        // Or simply log that we couldn't save position because state was missing.
        console.warn('[main.ts] Could not save position: pet-state.json not found or invalid.');
        // Optionally, create a minimal state file:
        // await saveStateToFile({ position: { x, y }, status: /* default status? */, petTypeId: /* default type? */ });
      }
    } catch (error) {
      console.error('[main.ts] Error saving pet position:', error);
    }
  }

  // Unregister all shortcuts.
  globalShortcut.unregisterAll()
});
