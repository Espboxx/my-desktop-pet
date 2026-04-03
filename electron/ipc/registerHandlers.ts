import { app, dialog, ipcMain } from 'electron'
import path from 'node:path'
import { promises as fsPromises } from 'node:fs'
import type { AppState } from '../appState'
import { DEFAULT_PET_HEIGHT, EXPANDED_PET_HEIGHT } from '../appState'
import { windowEffectsManager, type SmoothTopMostConfig } from '../windowEffects'
import { databaseManager } from '../database/DatabaseManager'
import { performanceMonitor } from '../database/PerformanceMonitor'
import { settingsService } from '../database/services/SettingsService'
import type { SavedPetData } from '../../src/types/petTypes'
import type { PetSettings } from '../../src/types/settings'

interface RegisterHandlersOptions {
  state: AppState
  ensureDatabaseInitialized: () => Promise<void>
  getPetState: () => Promise<SavedPetData | null>
  savePetState: (stateToSave: SavedPetData) => Promise<void>
  createSettingsWindow: () => void
  updateBehaviorBasedOnActivity: () => void
  exitApp: () => void
}

function mapStoredSettingsToRendererSettings(): PetSettings {
  const settings = settingsService.getSettings()
  const petType = typeof settings.pet_type === 'string' ? settings.pet_type : 'default'
  const activityLevel = settings.activity_level === 'calm' || settings.activity_level === 'playful'
    ? settings.activity_level
    : 'normal'
  const size = typeof settings.pet_size === 'number' ? settings.pet_size : 100
  const opacity = typeof settings.window_opacity === 'number' ? settings.window_opacity : 100

  return {
    petType,
    accessory: null,
    alwaysOnTop: settings.always_on_top !== false,
    soundEnabled: settings.sound_enabled !== false,
    activityLevel,
    autoHideFullscreen: settings.auto_hide_fullscreen !== false,
    launchOnStartup: settings.launch_on_startup !== false,
    size,
    opacity,
  }
}

function mapRendererSettingsToStoredSettings(settings: PetSettings) {
  return {
    pet_type: settings.petType,
    always_on_top: settings.alwaysOnTop,
    sound_enabled: settings.soundEnabled,
    activity_level: settings.activityLevel,
    auto_hide_fullscreen: settings.autoHideFullscreen,
    launch_on_startup: settings.launchOnStartup,
    pet_size: settings.size,
    window_opacity: settings.opacity,
  }
}

function broadcastSettings(state: AppState, settings: PetSettings) {
  state.petWindow?.webContents.send('settings-updated', settings)
  state.settingsWindow?.webContents.send('settings-updated', settings)
}

function registerStateAndSettingsHandlers({ state, ensureDatabaseInitialized, getPetState, savePetState, createSettingsWindow, updateBehaviorBasedOnActivity, exitApp }: RegisterHandlersOptions) {
  ipcMain.handle('get-window-position', () => state.petWindow?.getPosition())

  ipcMain.on('adjust-pet-window-size', (_, expand: boolean) => {
    if (!state.petWindow) {
      return
    }

    try {
      const currentBounds = state.petWindow.getBounds()
      const newHeight = expand ? EXPANDED_PET_HEIGHT : DEFAULT_PET_HEIGHT
      const newY = currentBounds.y + (currentBounds.height - newHeight)

      state.petWindow.setBounds({
        x: currentBounds.x,
        y: Math.round(newY),
        width: currentBounds.width,
        height: newHeight,
      })
    } catch (error) {
      console.error('调整窗口大小失败:', error)
    }
  })

  ipcMain.on('open-settings', createSettingsWindow)

  ipcMain.on('set-always-on-top', (_, flag: boolean) => {
    state.petWindow?.setAlwaysOnTop(flag)
  })

  ipcMain.handle('get-pet-settings', async () => {
    try {
      await ensureDatabaseInitialized()
      return mapStoredSettingsToRendererSettings()
    } catch (error) {
      console.error('获取宠物设置失败:', error)
      return mapStoredSettingsToRendererSettings()
    }
  })

  ipcMain.on('save-pet-settings', async (_, settings: PetSettings) => {
    try {
      await ensureDatabaseInitialized()
      settingsService.setSettings(mapRendererSettingsToStoredSettings(settings))
      const normalizedSettings = mapStoredSettingsToRendererSettings()

      state.petBehavior.activityLevel = normalizedSettings.activityLevel
      updateBehaviorBasedOnActivity()
      broadcastSettings(state, normalizedSettings)

      if (state.petWindow) {
        state.petWindow.setAlwaysOnTop(normalizedSettings.alwaysOnTop)
      }
    } catch (error) {
      console.error('保存宠物设置失败:', error)
    }
  })

  ipcMain.handle('get-pet-state', async () => getPetState())

  ipcMain.on('save-pet-state', async (_, stateToSave: SavedPetData | null) => {
    if (!stateToSave) {
      console.warn('收到空的 save-pet-state 请求，已忽略。')
      return
    }

    try {
      await savePetState(stateToSave)
    } catch (error) {
      console.error('保存宠物状态失败:', error)
    }
  })

  ipcMain.on('set-mouse-passthrough', (_, enable: boolean) => {
    if (state.petWindow) {
      console.log(`[main.ts] Setting mouse passthrough: ${enable}`)
      state.petWindow.setIgnoreMouseEvents(enable, { forward: true })
    }
  })

  ipcMain.on('exit-app', exitApp)
}

function registerWindowEffectsHandlers(state: AppState) {
  ipcMain.handle('smooth-bring-to-top', async () => {
    if (!state.petWindow) {
      console.warn('[main.ts] 宠物窗口不存在，无法执行置顶')
      return { success: false, error: '窗口不存在' }
    }

    try {
      const success = await windowEffectsManager.smoothBringToTop(state.petWindow)
      console.log(`[main.ts] 丝滑置顶${success ? '成功' : '失败'}`)
      return { success, error: success ? null : '置顶失败' }
    } catch (error) {
      console.error('[main.ts] 丝滑置顶异常:', error)
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('cancel-top-most', () => {
    if (!state.petWindow) {
      console.warn('[main.ts] 宠物窗口不存在，无法取消置顶')
      return { success: false, error: '窗口不存在' }
    }

    try {
      const success = windowEffectsManager.cancelTopMost(state.petWindow)
      console.log(`[main.ts] 取消置顶${success ? '成功' : '失败'}`)
      return { success, error: success ? null : '取消置顶失败' }
    } catch (error) {
      console.error('[main.ts] 取消置顶异常:', error)
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('get-window-effects-config', () => {
    try {
      const config = windowEffectsManager.getConfig()
      return { success: true, config, error: null }
    } catch (error) {
      console.error('[main.ts] 获取窗口特效配置异常:', error)
      return { success: false, config: null, error: (error as Error).message }
    }
  })

  ipcMain.handle('update-window-effects-config', (_, newConfig: Partial<SmoothTopMostConfig>) => {
    try {
      windowEffectsManager.updateConfig(newConfig)
      const config = windowEffectsManager.getConfig()
      console.log('[main.ts] 窗口特效配置已更新:', config)
      return { success: true, config, error: null }
    } catch (error) {
      console.error('[main.ts] 更新窗口特效配置异常:', error)
      return { success: false, config: null, error: (error as Error).message }
    }
  })

  ipcMain.handle('is-window-animating', () => {
    if (!state.petWindow) {
      return { success: false, isAnimating: false, error: '窗口不存在' }
    }

    try {
      const isAnimating = windowEffectsManager.isAnimating(state.petWindow)
      return { success: true, isAnimating, error: null }
    } catch (error) {
      console.error('[main.ts] 检查窗口动画状态异常:', error)
      return { success: false, isAnimating: false, error: (error as Error).message }
    }
  })
}

function registerDiagnosticsHandlers() {
  ipcMain.handle('health-check', async () => {
    try {
      const healthResult = await performanceMonitor.performHealthCheck()
      return { success: true, data: healthResult }
    } catch (error) {
      console.error('[main.ts] 健康检查失败:', error)
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('performance-stats', () => {
    try {
      const stats = performanceMonitor.getPerformanceStats()
      return { success: true, data: stats }
    } catch (error) {
      console.error('[main.ts] 获取性能统计失败:', error)
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('cache-stats', () => {
    try {
      const stats = databaseManager.getCacheStats()
      return { success: true, data: stats }
    } catch (error) {
      console.error('[main.ts] 获取缓存统计失败:', error)
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('clear-cache', () => {
    try {
      databaseManager.clearCache()
      console.log('[main.ts] 查询缓存已清空')
      return { success: true }
    } catch (error) {
      console.error('[main.ts] 清空缓存失败:', error)
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('warm-up-cache', async () => {
    try {
      await databaseManager.warmUpCache()
      console.log('[main.ts] 查询缓存预热完成')
      return { success: true }
    } catch (error) {
      console.error('[main.ts] 预热缓存失败:', error)
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('get-indexes', () => {
    try {
      const indexes = databaseManager.getIndexes()
      return { success: true, data: indexes }
    } catch (error) {
      console.error('[main.ts] 获取索引信息失败:', error)
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('get-index-stats', () => {
    try {
      const stats = databaseManager.getIndexStats()
      return { success: true, data: stats }
    } catch (error) {
      console.error('[main.ts] 获取索引统计失败:', error)
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('get-index-usage-report', () => {
    try {
      const report = databaseManager.getIndexUsageReport()
      return { success: true, data: report }
    } catch (error) {
      console.error('[main.ts] 获取索引使用报告失败:', error)
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('create-index', (_, indexName: string, tableName: string, columns: string[], options?: { unique?: boolean; where?: string }) => {
    try {
      const result = databaseManager.createIndex(indexName, tableName, columns, options)
      console.log('[main.ts] 索引创建成功:', indexName)
      return { success: true, data: result }
    } catch (error) {
      console.error('[main.ts] 创建索引失败:', error)
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('drop-index', (_, indexName: string) => {
    try {
      const result = databaseManager.dropIndex(indexName)
      console.log('[main.ts] 索引删除成功:', indexName)
      return { success: true, data: result }
    } catch (error) {
      console.error('[main.ts] 删除索引失败:', error)
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('rebuild-index', (_, indexName?: string) => {
    try {
      const result = databaseManager.rebuildIndex(indexName)
      console.log('[main.ts] 索引重建成功:', indexName || '所有索引')
      return { success: true, data: result }
    } catch (error) {
      console.error('[main.ts] 重建索引失败:', error)
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('optimize-indexes', () => {
    try {
      databaseManager.optimizeIndexes()
      console.log('[main.ts] 索引优化完成')
      return { success: true }
    } catch (error) {
      console.error('[main.ts] 优化索引失败:', error)
      return { success: false, error: (error as Error).message }
    }
  })
}

function registerUtilityHandlers(state: AppState) {
  ipcMain.on('show-status-details', () => {
    console.log('显示宠物状态详情')
  })

  ipcMain.on('show-skin-selector', () => {
    console.log('显示皮肤选择器')
  })

  ipcMain.on('show-name-editor', () => {
    console.log('显示名称编辑器')
  })

  ipcMain.on('take-pet-photo', async () => {
    if (!state.petWindow) {
      return
    }

    try {
      const image = await state.petWindow.webContents.capturePage()
      const { filePath } = await dialog.showSaveDialog({
        title: '保存宠物照片',
        defaultPath: path.join(app.getPath('pictures'), `pet-photo-${Date.now()}.png`),
        filters: [{ name: 'Images', extensions: ['png'] }],
      })

      if (filePath) {
        await fsPromises.writeFile(filePath, image.toPNG())
        console.log('宠物照片已保存到:', filePath)
      }
    } catch (error) {
      console.error('拍照失败:', error)
    }
  })

  ipcMain.on('hide-pet-window', () => {
    state.petWindow?.hide()
  })
}

export function registerIpcHandlers(options: RegisterHandlersOptions) {
  registerStateAndSettingsHandlers(options)
  registerWindowEffectsHandlers(options.state)
  registerDiagnosticsHandlers()
  registerUtilityHandlers(options.state)
}
