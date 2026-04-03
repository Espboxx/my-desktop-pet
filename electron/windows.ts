import { BrowserWindow, Menu, Tray, screen } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import type { AppState } from './appState'

interface WindowEnvironment {
  appRoot: string
  dirname: string
  rendererDist: string
  devServerUrl?: string
}

export async function createPetWindow(state: AppState, environment: WindowEnvironment) {
  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize

  state.petWindow = new BrowserWindow({
    width: screenWidth,
    height: screenHeight,
    x: 0,
    y: 0,
    transparent: true,
    frame: false,
    resizable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(environment.dirname, 'preload.mjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  if (environment.devServerUrl) {
    await state.petWindow.loadURL(`${environment.devServerUrl}?window=pet`)
    state.petWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    await state.petWindow.loadFile(path.join(environment.rendererDist, 'index.html'), {
      hash: 'pet',
    })
  }

  state.petWindow.on('closed', () => {
    state.petWindow = null
  })

  state.petWindow.webContents.once('did-finish-load', () => {
    if (state.petWindow) {
      console.log('[main.ts] 页面加载完成，设置初始鼠标穿透状态: false')
      state.petWindow.setIgnoreMouseEvents(false, { forward: true })
    }
  })

  return state.petWindow
}

export function createSettingsWindow(state: AppState, environment: WindowEnvironment) {
  if (state.settingsWindow) {
    state.settingsWindow.focus()
    return state.settingsWindow
  }

  state.settingsWindow = new BrowserWindow({
    width: 650,
    height: 500,
    minWidth: 500,
    minHeight: 400,
    frame: true,
    resizable: true,
    webPreferences: {
      preload: path.join(environment.dirname, 'preload.mjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  if (environment.devServerUrl) {
    void state.settingsWindow.loadURL(`${environment.devServerUrl}?window=settings`)
  } else {
    void state.settingsWindow.loadFile(path.join(environment.rendererDist, 'index.html'), {
      hash: 'settings',
    })
  }

  state.settingsWindow.on('closed', () => {
    state.settingsWindow = null
  })

  return state.settingsWindow
}

function getIconPath(appRoot: string): string {
  try {
    const iconPaths = [
      path.join(appRoot, 'public', 'pet-icon-backup.png'),
      path.join(appRoot, 'public', 'pet-icon.png'),
      path.join(appRoot, 'public', 'electron-vite.svg'),
      path.join(appRoot, 'public', 'electron-vite.animate.svg'),
    ]

    for (const iconPath of iconPaths) {
      if (fs.existsSync(iconPath)) {
        console.log('使用图标:', iconPath)
        return iconPath
      }
    }

    throw new Error('未找到任何有效的图标文件')
  } catch (error) {
    console.error('图标加载失败:', error)
    return ''
  }
}

interface CreateTrayOptions extends WindowEnvironment {
  createSettingsWindow: () => void
  ensurePetWindow: () => Promise<void>
  exitApp: () => void
}

export function createTray(state: AppState, options: CreateTrayOptions) {
  try {
    const iconPath = getIconPath(options.appRoot)
    console.log('使用托盘图标路径:', iconPath)

    if (state.appTray) {
      state.appTray.destroy()
    }

    let retryCount = 0
    const maxRetries = 3

    const createTrayWithRetry = () => {
      try {
        state.appTray = new Tray(iconPath || '')

        const contextMenu = Menu.buildFromTemplate([
          {
            label: '显示宠物',
            click: async () => {
              if (state.petWindow) {
                state.petWindow.show()
                return
              }

              await options.ensurePetWindow()
            },
          },
          { label: '设置', click: options.createSettingsWindow },
          { type: 'separator' },
          { label: '退出', click: options.exitApp },
        ])

        state.appTray.setToolTip('桌面宠物')
        state.appTray.setContextMenu(contextMenu)

        state.appTray.on('click', async () => {
          if (state.petWindow) {
            state.petWindow.show()
            return
          }

          await options.ensurePetWindow()
        })

        if (!iconPath) {
          console.warn('使用默认托盘图标')
        } else {
          console.log('托盘图标创建成功')
        }
      } catch (error) {
        if (retryCount < maxRetries) {
          retryCount += 1
          console.log(`创建托盘图标失败，正在重试 (${retryCount}/${maxRetries})`)
          setTimeout(createTrayWithRetry, 1000)
        } else {
          console.error('创建托盘图标最终失败:', error)
        }
      }
    }

    createTrayWithRetry()
  } catch (error) {
    console.error('获取图标路径失败:', error)
  }
}
