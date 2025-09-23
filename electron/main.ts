import { app, BrowserWindow, ipcMain, screen, globalShortcut, Tray, Menu, dialog } from 'electron'
// import { createRequire } from 'node:module' // Unused
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'
import { promises as fsPromises } from 'node:fs'
import * as stream from 'stream';
import type { SavedPetData } from '../src/types/petTypes'; // Import the type
import { windowEffectsManager, type SmoothTopMostConfig } from './windowEffects'; // Import window effects
import { databaseManager } from './database/DatabaseManager';
import { dataMigrator } from './database/Migrator';
import { petStatusService } from './database/services/PetStatusService';
import { settingsService } from './database/services/SettingsService';
import { performanceMonitor } from './database/PerformanceMonitor';
import { queryCache } from './database/QueryCache';
import { indexManager } from './database/IndexManager';

// 设置标准输出和标准错误的编码为 UTF-8
if (process.stdout instanceof stream.Writable) {
  process.stdout.setDefaultEncoding('utf-8');
}
if (process.stderr instanceof stream.Writable) {
  process.stderr.setDefaultEncoding('utf-8');
}


// const require = createRequire(import.meta.url) // Unused
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
// const DEFAULT_PET_WIDTH = 300; // Default width - Unused
const DEFAULT_PET_HEIGHT = 400; // Increased default height for vertical layout
const EXPANDED_PET_HEIGHT = 500; // 展开后的高度（足够显示菜单）

// 获取图标路径
function getIconPath(): string {
  try {
    const iconPaths = [
      path.join(process.env.APP_ROOT!, 'public', 'pet-icon-backup.png'), // 优先使用备份 PNG
      path.join(process.env.APP_ROOT!, 'public', 'pet-icon.png'),
      path.join(process.env.APP_ROOT!, 'public', 'electron-vite.svg'),
      path.join(process.env.APP_ROOT!, 'public', 'electron-vite.animate.svg')
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
  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;

  petWindow = new BrowserWindow({
    width: screenWidth,
    height: screenHeight,
    x: 0,
    y: 0,
    transparent: true,
    frame: false,
    resizable: false, // Window is a canvas, should not be resizable
    // movable: false,   // Removing this. While we don't want the user to move it, setting it to false can interfere with mouse events. The pet's internal movement will handle positioning.
    // fullscreen: true, // This is the property that causes issues on macOS
    skipTaskbar: true,
    alwaysOnTop: true,
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

  // 确保窗口初始状态允许鼠标交互 - 修复首次点击隐藏问题
  petWindow.webContents.once('did-finish-load', () => {
    if (petWindow) {
      console.log('[main.ts] 页面加载完成，设置初始鼠标穿透状态: false');
      petWindow.setIgnoreMouseEvents(false, { forward: true });
    }
  });

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

// 数据库连接和初始化
let isDatabaseInitialized = false;

/**
 * 初始化数据库
 */
async function initializeDatabase(): Promise<void> {
  if (isDatabaseInitialized) {
    return;
  }

  try {
    console.log('🔄 初始化数据库...');

    // 连接数据库
    databaseManager.connect();

    // 执行数据迁移
    const migrationResult = await dataMigrator.migrate();

    if (migrationResult.success) {
      console.log('✅ 数据库初始化完成');
      isDatabaseInitialized = true;
    } else {
      console.error('❌ 数据库迁移失败:', migrationResult.errors);
      throw new Error('数据库迁移失败');
    }

  } catch (error) {
    console.error('❌ 数据库初始化失败:', error);
    throw error;
  }
}

/**
 * 获取宠物状态（从数据库）
 */
async function getPetState(): Promise<SavedPetData | null> {
  try {
    if (!isDatabaseInitialized) {
      await initializeDatabase();
    }

    return petStatusService.getPetStatus();
  } catch (error) {
    console.error('获取宠物状态失败:', error);
    return null;
  }
}

/**
 * 保存宠物状态（到数据库）
 */
async function savePetState(stateToSave: SavedPetData): Promise<void> {
  try {
    if (!isDatabaseInitialized) {
      await initializeDatabase();
    }

    petStatusService.savePetStatus(stateToSave);
  } catch (error) {
    console.error('保存宠物状态失败:', error);
    throw error;
  }
}



// 新的拖动逻辑 - 获取窗口当前位置
ipcMain.handle('get-window-position', () => {
  return petWindow?.getPosition();
});

// The 'set-pet-position' IPC call is now obsolete.
// The renderer process will handle the pet's position internally via CSS transforms.
// ipcMain.on('set-pet-position', ...);

// 监听渲染进程的窗口大小调整请求
ipcMain.on('adjust-pet-window-size', (_, expand: boolean) => {
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

ipcMain.on('set-always-on-top', (_, flag) => {
  if (petWindow) {
    petWindow.setAlwaysOnTop(flag)
  }
})

ipcMain.handle('get-pet-settings', async () => {
  try {
    if (!isDatabaseInitialized) {
      await initializeDatabase();
    }

    const settings = settingsService.getSettings();
    return {
      petType: settings.pet_type || 'cat',
      alwaysOnTop: settings.always_on_top !== false,
      soundEnabled: settings.sound_enabled !== false,
      activityLevel: settings.activity_level || 'normal',
      autoHideFullscreen: settings.auto_hide_fullscreen !== false,
      launchOnStartup: settings.launch_on_startup !== false,
      size: settings.pet_size || 100,
      opacity: settings.window_opacity || 0.8
    };
  } catch (error) {
    console.error('获取宠物设置失败:', error);
    // 返回默认设置
    return {
      petType: 'cat',
      alwaysOnTop: true,
      soundEnabled: true,
      activityLevel: 'normal',
      autoHideFullscreen: true,
      launchOnStartup: true,
      size: 100,
      opacity: 0.8
    };
  }
})

ipcMain.on('save-pet-settings', async (_, settings) => {
  try {
    if (!isDatabaseInitialized) {
      await initializeDatabase();
    }

    console.log('保存设置:', settings);

    // 转换设置格式并保存到数据库
    const dbSettings = {
      pet_type: settings.petType,
      always_on_top: settings.alwaysOnTop,
      sound_enabled: settings.soundEnabled,
      activity_level: settings.activityLevel,
      auto_hide_fullscreen: settings.autoHideFullscreen,
      launch_on_startup: settings.launchOnStartup,
      pet_size: settings.size,
      window_opacity: settings.opacity
    };

    settingsService.setSettings(dbSettings);

    // 更新行为配置
    if (settings.activityLevel) {
      petBehavior.activityLevel = settings.activityLevel;
      updateBehaviorBasedOnActivity();
    }

    // 应用部分设置到宠物窗口
    if (petWindow) {
      petWindow.setAlwaysOnTop(settings.alwaysOnTop);

      // 设置大小和透明度
      petWindow.webContents.send('update-pet-appearance', {
        size: settings.size,
        opacity: settings.opacity
      });
    }

  } catch (error) {
    console.error('保存宠物设置失败:', error);
  }
})

// 新API实现
// 处理获取状态请求，从数据库加载并返回状态
ipcMain.handle('get-pet-state', async () => {
  return await getPetState(); // 从数据库返回状态或 null
});

// 新增：处理保存状态请求，保存到数据库
ipcMain.on('save-pet-state', async (_, stateToSave) => {
  if (stateToSave) {
    try {
      await savePetState(stateToSave);
    } catch (error) {
      console.error('保存宠物状态失败:', error);
    }
  } else {
    console.warn('收到空的 save-pet-state 请求，已忽略。');
  }
});

ipcMain.on('update-pet-behavior', (_, behavior) => {
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
ipcMain.on('set-mouse-passthrough', (_, enable: boolean) => {
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

// 丝滑置顶效果相关IPC处理器
ipcMain.handle('smooth-bring-to-top', async () => {
  if (!petWindow) {
    console.warn('[main.ts] 宠物窗口不存在，无法执行置顶');
    return { success: false, error: '窗口不存在' };
  }

  try {
    const success = await windowEffectsManager.smoothBringToTop(petWindow);
    console.log(`[main.ts] 丝滑置顶${success ? '成功' : '失败'}`);
    return { success, error: success ? null : '置顶失败' };
  } catch (error) {
    console.error('[main.ts] 丝滑置顶异常:', error);
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('cancel-top-most', () => {
  if (!petWindow) {
    console.warn('[main.ts] 宠物窗口不存在，无法取消置顶');
    return { success: false, error: '窗口不存在' };
  }

  try {
    const success = windowEffectsManager.cancelTopMost(petWindow);
    console.log(`[main.ts] 取消置顶${success ? '成功' : '失败'}`);
    return { success, error: success ? null : '取消置顶失败' };
  } catch (error) {
    console.error('[main.ts] 取消置顶异常:', error);
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('get-window-effects-config', () => {
  try {
    const config = windowEffectsManager.getConfig();
    return { success: true, config, error: null };
  } catch (error) {
    console.error('[main.ts] 获取窗口特效配置异常:', error);
    return { success: false, config: null, error: (error as Error).message };
  }
});

ipcMain.handle('update-window-effects-config', (_, newConfig: Partial<SmoothTopMostConfig>) => {
  try {
    windowEffectsManager.updateConfig(newConfig);
    const config = windowEffectsManager.getConfig();
    console.log('[main.ts] 窗口特效配置已更新:', config);
    return { success: true, config, error: null };
  } catch (error) {
    console.error('[main.ts] 更新窗口特效配置异常:', error);
    return { success: false, config: null, error: (error as Error).message };
  }
});

ipcMain.handle('is-window-animating', () => {
  if (!petWindow) {
    return { success: false, isAnimating: false, error: '窗口不存在' };
  }

  try {
    const isAnimating = windowEffectsManager.isAnimating(petWindow);
    return { success: true, isAnimating, error: null };
  } catch (error) {
    console.error('[main.ts] 检查窗口动画状态异常:', error);
    return { success: false, isAnimating: false, error: (error as Error).message };
  }
});

// 健康检查接口
ipcMain.handle('health-check', async () => {
  try {
    const healthResult = await performanceMonitor.performHealthCheck();
    return { success: true, data: healthResult };
  } catch (error) {
    console.error('[main.ts] 健康检查失败:', error);
    return { success: false, error: (error as Error).message };
  }
});

// 性能统计接口
ipcMain.handle('performance-stats', () => {
  try {
    const stats = performanceMonitor.getPerformanceStats();
    return { success: true, data: stats };
  } catch (error) {
    console.error('[main.ts] 获取性能统计失败:', error);
    return { success: false, error: (error as Error).message };
  }
});

// 缓存统计接口
ipcMain.handle('cache-stats', () => {
  try {
    const stats = databaseManager.getCacheStats();
    return { success: true, data: stats };
  } catch (error) {
    console.error('[main.ts] 获取缓存统计失败:', error);
    return { success: false, error: (error as Error).message };
  }
});

// 清空缓存接口
ipcMain.handle('clear-cache', () => {
  try {
    databaseManager.clearCache();
    console.log('[main.ts] 查询缓存已清空');
    return { success: true };
  } catch (error) {
    console.error('[main.ts] 清空缓存失败:', error);
    return { success: false, error: (error as Error).message };
  }
});

// 预热缓存接口
ipcMain.handle('warm-up-cache', async () => {
  try {
    await databaseManager.warmUpCache();
    console.log('[main.ts] 查询缓存预热完成');
    return { success: true };
  } catch (error) {
    console.error('[main.ts] 预热缓存失败:', error);
    return { success: false, error: (error as Error).message };
  }
});

// 索引信息接口
ipcMain.handle('get-indexes', () => {
  try {
    const indexes = databaseManager.getIndexes();
    return { success: true, data: indexes };
  } catch (error) {
    console.error('[main.ts] 获取索引信息失败:', error);
    return { success: false, error: (error as Error).message };
  }
});

// 索引统计接口
ipcMain.handle('get-index-stats', () => {
  try {
    const stats = databaseManager.getIndexStats();
    return { success: true, data: stats };
  } catch (error) {
    console.error('[main.ts] 获取索引统计失败:', error);
    return { success: false, error: (error as Error).message };
  }
});

// 索引使用报告接口
ipcMain.handle('get-index-usage-report', () => {
  try {
    const report = databaseManager.getIndexUsageReport();
    return { success: true, data: report };
  } catch (error) {
    console.error('[main.ts] 获取索引使用报告失败:', error);
    return { success: false, error: (error as Error).message };
  }
});

// 创建索引接口
ipcMain.handle('create-index', (_, indexName: string, tableName: string, columns: string[], options?: { unique?: boolean; where?: string }) => {
  try {
    const result = databaseManager.createIndex(indexName, tableName, columns, options);
    console.log('[main.ts] 索引创建成功:', indexName);
    return { success: true, data: result };
  } catch (error) {
    console.error('[main.ts] 创建索引失败:', error);
    return { success: false, error: (error as Error).message };
  }
});

// 删除索引接口
ipcMain.handle('drop-index', (_, indexName: string) => {
  try {
    const result = databaseManager.dropIndex(indexName);
    console.log('[main.ts] 索引删除成功:', indexName);
    return { success: true, data: result };
  } catch (error) {
    console.error('[main.ts] 删除索引失败:', error);
    return { success: false, error: (error as Error).message };
  }
});

// 重建索引接口
ipcMain.handle('rebuild-index', (_, indexName?: string) => {
  try {
    const result = databaseManager.rebuildIndex(indexName);
    console.log('[main.ts] 索引重建成功:', indexName || '所有索引');
    return { success: true, data: result };
  } catch (error) {
    console.error('[main.ts] 重建索引失败:', error);
    return { success: false, error: (error as Error).message };
  }
});

// 优化索引接口
ipcMain.handle('optimize-indexes', () => {
  try {
    databaseManager.optimizeIndexes();
    console.log('[main.ts] 索引优化完成');
    return { success: true };
  } catch (error) {
    console.error('[main.ts] 优化索引失败:', error);
    return { success: false, error: (error as Error).message };
  }
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
  try {
    // 初始化数据库
    await initializeDatabase();
    console.log('✅ 应用启动完成，数据库已初始化');

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

  } catch (error) {
    console.error('❌ 应用启动失败:', error);
    // 显示错误对话框
    dialog.showErrorBox(
      '启动失败',
      '应用启动失败，请检查错误日志并重试。'
    );
    app.quit();
  }
});

// App Will Quit
app.on('will-quit', async () => { // Make async
  try {
    // 清理窗口特效管理器资源
    windowEffectsManager.cleanup();
    console.log('[main.ts] 窗口特效管理器资源已清理');

    // 关闭数据库连接
    if (isDatabaseInitialized) {
      databaseManager.close();
      console.log('[main.ts] 数据库连接已关闭');
    }

    // Unregister all shortcuts.
    globalShortcut.unregisterAll();

  } catch (error) {
    console.error('[main.ts] 应用退出时发生错误:', error);
  }
});
