import { app, dialog, globalShortcut } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import * as stream from 'stream'
import type { SavedPetData } from '../src/types/petTypes'
import { windowEffectsManager } from './windowEffects'
import { databaseManager } from './database/DatabaseManager'
import { dataMigrator } from './database/Migrator'
import { petStatusService } from './database/services/PetStatusService'
import { registerIpcHandlers } from './ipc/registerHandlers'
import { AppState, DEFAULT_PET_BEHAVIOR } from './appState'
import { createPetWindow, createSettingsWindow, createTray } from './windows'

if (process.stdout instanceof stream.Writable) {
  process.stdout.setDefaultEncoding('utf-8')
}

if (process.stderr instanceof stream.Writable) {
  process.stderr.setDefaultEncoding('utf-8')
}

const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, '..')

export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

const state: AppState = {
  petWindow: null,
  settingsWindow: null,
  appTray: null,
  quitting: false,
  petBehavior: { ...DEFAULT_PET_BEHAVIOR },
  isDatabaseInitialized: false,
}

const windowEnvironment = {
  appRoot: process.env.APP_ROOT,
  dirname: __dirname,
  rendererDist: RENDERER_DIST,
  devServerUrl: VITE_DEV_SERVER_URL,
}

async function ensureDatabaseInitialized(): Promise<void> {
  if (state.isDatabaseInitialized) {
    return
  }

  try {
    console.log('🔄 初始化数据库...')
    databaseManager.connect()

    const migrationResult = await dataMigrator.migrate()
    if (!migrationResult.success) {
      console.error('❌ 数据库迁移失败:', migrationResult.errors)
      throw new Error('数据库迁移失败')
    }

    console.log('✅ 数据库初始化完成')
    state.isDatabaseInitialized = true
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error)
    throw error
  }
}

async function getPetState(): Promise<SavedPetData | null> {
  try {
    await ensureDatabaseInitialized()
    return petStatusService.getPetStatus()
  } catch (error) {
    console.error('获取宠物状态失败:', error)
    return null
  }
}

async function savePetState(stateToSave: SavedPetData): Promise<void> {
  try {
    await ensureDatabaseInitialized()
    petStatusService.savePetStatus(stateToSave)
  } catch (error) {
    console.error('保存宠物状态失败:', error)
    throw error
  }
}

function updateBehaviorBasedOnActivity() {
  switch (state.petBehavior.activityLevel) {
    case 'calm':
      state.petBehavior.moveInterval = 15000
      state.petBehavior.expressionChangeInterval = 20000
      break
    case 'normal':
      state.petBehavior.moveInterval = 10000
      state.petBehavior.expressionChangeInterval = 15000
      break
    case 'playful':
      state.petBehavior.moveInterval = 5000
      state.petBehavior.expressionChangeInterval = 8000
      break
  }
}

function openSettingsWindow() {
  createSettingsWindow(state, windowEnvironment)
}

async function ensurePetWindow() {
  if (state.petWindow) {
    return
  }

  await createPetWindow(state, windowEnvironment)
}

function exitApp() {
  state.quitting = true
  app.quit()
}

registerIpcHandlers({
  state,
  ensureDatabaseInitialized,
  getPetState,
  savePetState,
  createSettingsWindow: openSettingsWindow,
  updateBehaviorBasedOnActivity,
  exitApp,
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin' || state.quitting) {
    app.quit()
  }
})

app.on('activate', async () => {
  if (state.petWindow === null) {
    await ensurePetWindow()
  }
})

app.on('before-quit', () => {
  state.quitting = true
})

app.whenReady().then(async () => {
  try {
    await ensureDatabaseInitialized()
    console.log('✅ 应用启动完成，数据库已初始化')

    await ensurePetWindow()
    createTray(state, {
      ...windowEnvironment,
      createSettingsWindow: openSettingsWindow,
      ensurePetWindow,
      exitApp,
    })

    globalShortcut.register('Alt+P', () => {
      if (!state.petWindow) {
        return
      }

      if (state.petWindow.isVisible()) {
        state.petWindow.hide()
      } else {
        state.petWindow.show()
      }
    })
  } catch (error) {
    console.error('❌ 应用启动失败:', error)
    dialog.showErrorBox('启动失败', '应用启动失败，请检查错误日志并重试。')
    app.quit()
  }
})

app.on('will-quit', () => {
  try {
    windowEffectsManager.cleanup()
    console.log('[main.ts] 窗口特效管理器资源已清理')

    if (state.isDatabaseInitialized) {
      databaseManager.close()
      console.log('[main.ts] 数据库连接已关闭')
    }

    globalShortcut.unregisterAll()
  } catch (error) {
    console.error('[main.ts] 应用退出时发生错误:', error)
  }
})
