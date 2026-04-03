import { databaseManager } from '../DatabaseManager';

type SettingValue = string | number | boolean | Record<string, unknown> | null;

interface SettingRow {
  key: string;
  value: string;
  type: string;
}

interface SingleSettingRow {
  value: string;
  type: string;
}

/**
 * 应用设置数据库服务
 * 负责应用设置的数据库操作
 */
export class SettingsService {
  /**
   * 获取应用设置
   */
  public getSettings(): Record<string, SettingValue> {
    try {
      const db = databaseManager.getDatabase();

      // 获取所有设置
      const settings = db.prepare<[], SettingRow>(`
        SELECT key, value, type
        FROM app_settings
        ORDER BY key
      `).all();

      // 转换为对象并解析类型
      const result: Record<string, SettingValue> = {};
      settings.forEach((setting) => {
        const { key, value, type } = setting;
        try {
          switch (type) {
            case 'number':
              result[key] = parseFloat(value);
              break;
            case 'boolean':
              result[key] = value === 'true';
              break;
            case 'object':
              result[key] = JSON.parse(value);
              break;
            default:
              result[key] = value;
          }
        } catch (error) {
          console.warn(`解析设置失败 ${key}:`, error);
          result[key] = value;
        }
      });

      return result;

    } catch (error) {
      console.error('获取应用设置失败:', error);
      return this.getDefaultSettings();
    }
  }

  /**
   * 获取单个设置项
   */
  public getSetting<T>(key: string, defaultValue?: T): T | undefined {
    try {
      const db = databaseManager.getDatabase();

      const setting = db.prepare<[string], SingleSettingRow>(`
        SELECT value, type
        FROM app_settings
        WHERE key = ?
      `).get(key);

      if (!setting) {
        return defaultValue;
      }

      const { value, type } = setting;

      switch (type) {
        case 'number':
          return parseFloat(value) as T;
        case 'boolean':
          return (value === 'true') as T;
        case 'object':
          return JSON.parse(value) as T;
        default:
          return value as T;
      }

    } catch (error) {
      console.error(`获取设置项失败 ${key}:`, error);
      return defaultValue;
    }
  }

  /**
   * 设置应用设置
   */
  public setSettings(settings: Record<string, SettingValue>): void {
    try {
      const db = databaseManager.getDatabase();

      // 使用事务批量更新设置
      db.transaction(() => {
        Object.entries(settings).forEach(([key, value]) => {
          const type = this.getValueType(value);
          const stringValue = this.valueToString(value, type);

          db.prepare(`
            INSERT OR REPLACE INTO app_settings (key, value, type)
            VALUES (?, ?, ?)
          `).run([key, stringValue, type]);
        });
      })();

    } catch (error) {
      console.error('设置应用设置失败:', error);
      throw error;
    }
  }

  /**
   * 设置单个设置项
   */
  public setSetting(key: string, value: SettingValue): void {
    try {
      const db = databaseManager.getDatabase();

      const type = this.getValueType(value);
      const stringValue = this.valueToString(value, type);

      db.prepare(`
        INSERT OR REPLACE INTO app_settings (key, value, type)
        VALUES (?, ?, ?)
      `).run([key, stringValue, type]);

    } catch (error) {
      console.error(`设置设置项失败 ${key}:`, error);
      throw error;
    }
  }

  /**
   * 删除设置项
   */
  public deleteSetting(key: string): void {
    try {
      const db = databaseManager.getDatabase();

      db.prepare('DELETE FROM app_settings WHERE key = ?').run([key]);

    } catch (error) {
      console.error(`删除设置项失败 ${key}:`, error);
    }
  }

  /**
   * 重置设置为默认值
   */
  public resetToDefaults(): void {
    try {
      const db = databaseManager.getDatabase();

      // 清空现有设置
      db.prepare('DELETE FROM app_settings').run();

      // 插入默认设置
      const defaultSettings = this.getDefaultSettings();
      this.setSettings(defaultSettings);

    } catch (error) {
      console.error('重置设置失败:', error);
    }
  }

  /**
   * 获取设置类型
   */
  private getValueType(value: SettingValue): string {
    if (typeof value === 'number') {
      return 'number';
    } else if (typeof value === 'boolean') {
      return 'boolean';
    } else if (typeof value === 'object' && value !== null) {
      return 'object';
    } else {
      return 'string';
    }
  }

  /**
   * 将值转换为字符串
   */
  private valueToString(value: SettingValue, type: string): string {
    switch (type) {
      case 'object':
        return JSON.stringify(value);
      default:
        return String(value);
    }
  }

  /**
   * 获取默认设置
   */
  private getDefaultSettings(): Record<string, SettingValue> {
    return {
      // 窗口设置
      window_opacity: 0.8,
      window_size: 1.0,
      always_on_top: true,
      auto_hide_fullscreen: true,

      // 宠物设置
      pet_type: 'cat',
      pet_speed: 1.0,
      pet_size: 1.0,

      // 音效设置
      sound_enabled: true,
      sound_volume: 0.7,

      // 交互设置
      mouse_passthrough: true,
      haptic_feedback: true,

      // 行为设置
      activity_level: 'normal',
      move_interval: 10000,
      expression_change_interval: 15000,

      // 自动保存设置
      auto_save_interval: 30000,
      backup_enabled: true,
      backup_interval: 3600000, // 1小时

      // 启动设置
      launch_on_startup: true,
      minimize_to_tray: true,

      // 主题设置
      theme: 'light',
      accent_color: '#007bff',

      // 性能设置
      enable_animations: true,
      enable_particles: true,
      max_fps: 60,

      // 开发者设置
      dev_mode: false,
      show_debug_info: false,
      log_level: 'info'
    };
  }

  /**
   * 验证设置值
   */
  public validateSettings(settings: Record<string, SettingValue>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 验证窗口设置
    if (settings.window_opacity !== undefined) {
      const opacity = parseFloat(String(settings.window_opacity));
      if (isNaN(opacity) || opacity < 0.1 || opacity > 1.0) {
        errors.push('窗口透明度必须在 0.1 到 1.0 之间');
      }
    }

    if (settings.window_size !== undefined) {
      const size = parseFloat(String(settings.window_size));
      if (isNaN(size) || size < 0.5 || size > 2.0) {
        errors.push('窗口大小必须在 0.5 到 2.0 之间');
      }
    }

    // 验证音量设置
    if (settings.sound_volume !== undefined) {
      const volume = parseFloat(String(settings.sound_volume));
      if (isNaN(volume) || volume < 0 || volume > 1.0) {
        errors.push('音量必须在 0 到 1.0 之间');
      }
    }

    // 验证时间间隔
    if (settings.auto_save_interval !== undefined) {
      const interval = parseInt(String(settings.auto_save_interval), 10);
      if (isNaN(interval) || interval < 1000 || interval > 300000) {
        errors.push('自动保存间隔必须在 1000ms 到 300000ms 之间');
      }
    }

    // 验证FPS设置
    if (settings.max_fps !== undefined) {
      const fps = parseInt(String(settings.max_fps), 10);
      if (isNaN(fps) || fps < 30 || fps > 120) {
        errors.push('最大FPS必须在 30 到 120 之间');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 获取设置分类
   */
  public getSettingsByCategory(): Record<string, Record<string, SettingValue>> {
    const settings = this.getSettings();
    const categories: Record<string, Record<string, SettingValue>> = {
      window: {},
      pet: {},
      sound: {},
      interaction: {},
      behavior: {},
      auto_save: {},
      launch: {},
      theme: {},
      performance: {},
      developer: {}
    };

    // 窗口设置
    categories.window = {
      window_opacity: settings.window_opacity,
      window_size: settings.window_size,
      always_on_top: settings.always_on_top,
      auto_hide_fullscreen: settings.auto_hide_fullscreen
    };

    // 宠物设置
    categories.pet = {
      pet_type: settings.pet_type,
      pet_speed: settings.pet_speed,
      pet_size: settings.pet_size
    };

    // 音效设置
    categories.sound = {
      sound_enabled: settings.sound_enabled,
      sound_volume: settings.sound_volume
    };

    // 交互设置
    categories.interaction = {
      mouse_passthrough: settings.mouse_passthrough,
      haptic_feedback: settings.haptic_feedback
    };

    // 行为设置
    categories.behavior = {
      activity_level: settings.activity_level,
      move_interval: settings.move_interval,
      expression_change_interval: settings.expression_change_interval
    };

    // 自动保存设置
    categories.auto_save = {
      auto_save_interval: settings.auto_save_interval,
      backup_enabled: settings.backup_enabled,
      backup_interval: settings.backup_interval
    };

    // 启动设置
    categories.launch = {
      launch_on_startup: settings.launch_on_startup,
      minimize_to_tray: settings.minimize_to_tray
    };

    // 主题设置
    categories.theme = {
      theme: settings.theme,
      accent_color: settings.accent_color
    };

    // 性能设置
    categories.performance = {
      enable_animations: settings.enable_animations,
      enable_particles: settings.enable_particles,
      max_fps: settings.max_fps
    };

    // 开发者设置
    categories.developer = {
      dev_mode: settings.dev_mode,
      show_debug_info: settings.show_debug_info,
      log_level: settings.log_level
    };

    return categories;
  }
}

/**
 * 导出设置服务实例
 */
export const settingsService = new SettingsService();
