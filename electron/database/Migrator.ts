import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import { databaseManager } from './DatabaseManager';
import { DatabaseErrorHandler } from './ErrorHandler';

/**
 * 数据迁移器
 * 负责从JSON配置文件迁移到SQLite数据库
 */
export class DataMigrator {
  private errorHandler: DatabaseErrorHandler;
  private migrationLog: MigrationLogEntry[] = [];

  constructor() {
    this.errorHandler = new DatabaseErrorHandler();
  }

  /**
   * 执行完整的数据迁移
   */
  public async migrate(): Promise<MigrationResult> {
    console.log('🔄 开始数据迁移...');

    const result: MigrationResult = {
      success: false,
      startTime: new Date(),
      endTime: null,
      summary: {
        totalFiles: 0,
        migratedFiles: 0,
        failedFiles: 0,
        totalRecords: 0,
        migratedRecords: 0,
        failedRecords: 0
      },
      errors: []
    };

    try {
      // 检查是否已经迁移过
      if (this.isAlreadyMigrated()) {
        console.log('✅ 数据已经迁移过，跳过迁移');
        result.success = true;
        result.endTime = new Date();
        return result;
      }

      // 1. 备份现有JSON文件
      await this.backupJsonFiles();

      // 2. 执行数据迁移
      const migrationResult = await this.performMigration();

      // 3. 验证迁移结果
      await this.validateMigration();

      // 4. 标记迁移完成
      this.markMigrationCompleted();

      result.success = true;
      result.summary = migrationResult.summary;
      result.endTime = new Date();

      console.log('✅ 数据迁移完成');
      this.logMigrationResult(result);

      return result;

    } catch (error) {
      result.success = false;
      result.endTime = new Date();
      result.errors.push({
        type: 'MIGRATION_FAILED',
        message: error instanceof Error ? error.message : String(error),
        timestamp: new Date()
      });

      this.errorHandler.handleError('数据迁移失败', error as Error);
      console.error('❌ 数据迁移失败:', error);

      return result;
    }
  }

  /**
   * 检查是否已经迁移过
   */
  private isAlreadyMigrated(): boolean {
    try {
      const db = databaseManager.getDatabase();
      const result = db.prepare(`
        SELECT COUNT(*) as count FROM app_settings
        WHERE key = 'migration_completed' AND value = 'true'
      `).get();

      return result.count > 0;
    } catch {
      return false;
    }
  }

  /**
   * 备份现有JSON文件
   */
  private async backupJsonFiles(): Promise<void> {
    console.log('📦 备份现有JSON文件...');

    const userDataPath = app.getPath('userData');
    const backupDir = path.join(userDataPath, 'backup', `json-backup-${Date.now()}`);

    // 创建备份目录
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // 需要备份的文件列表
    const filesToBackup = [
      'pet-state.json',
      'pet-state.json.bak',
      'pet-state.json.tmp'
    ];

    for (const filename of filesToBackup) {
      const sourcePath = path.join(userDataPath, filename);
      if (fs.existsSync(sourcePath)) {
        const backupPath = path.join(backupDir, filename);
        fs.copyFileSync(sourcePath, backupPath);
        console.log(`✅ 已备份: ${filename}`);
      }
    }

    console.log('📦 JSON文件备份完成');
  }

  /**
   * 执行实际的数据迁移
   */
  private async performMigration(): Promise<InternalMigrationResult> {
    console.log('🔄 执行数据迁移...');

    const result: InternalMigrationResult = {
      summary: {
        totalFiles: 0,
        migratedFiles: 0,
        failedFiles: 0,
        totalRecords: 0,
        migratedRecords: 0,
        failedRecords: 0
      },
      details: []
    };

    const userDataPath = app.getPath('userData');
    const jsonFilePath = path.join(userDataPath, 'pet-state.json');

    // 检查JSON文件是否存在
    if (!fs.existsSync(jsonFilePath)) {
      console.log('📄 JSON配置文件不存在，跳过迁移');
      return result;
    }

    result.summary.totalFiles = 1;

    try {
      // 读取JSON文件
      const jsonData = this.readJsonFile(jsonFilePath);

      if (!jsonData) {
        console.log('📄 JSON文件为空，跳过迁移');
        return result;
      }

      // 使用事务批量迁移所有数据
      const batchResult = await this.migrateBatchData(jsonData);
      result.details.push(batchResult);

      // 汇总结果
      result.summary.migratedFiles = 1;
      result.summary.migratedRecords = result.details.reduce((sum, detail) =>
        sum + (detail.migratedRecords || 0), 0);
      result.summary.failedRecords = result.details.reduce((sum, detail) =>
        sum + (detail.failedRecords || 0), 0);
      result.summary.totalRecords = result.summary.migratedRecords + result.summary.failedRecords;

      console.log('✅ 数据迁移执行完成');
      return result;

    } catch (error) {
      result.summary.failedFiles = 1;
      this.errorHandler.handleError('数据迁移执行失败', error as Error);
      throw error;
    }
  }

  /**
   * 读取JSON文件
   */
  private readJsonFile(filePath: string): any {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      this.errorHandler.handleError(`读取JSON文件失败: ${filePath}`, error as Error);
      return null;
    }
  }

  /**
   * 迁移宠物状态
   */
  private async migratePetStatus(jsonData: any): Promise<MigrationDetail> {
    const detail: MigrationDetail = {
      type: 'pet_status',
      migratedRecords: 0,
      failedRecords: 0,
      errors: []
    };

    try {
      const db = databaseManager.getDatabase();

      // 插入宠物状态
      const result = db.prepare(`
        INSERT INTO pet_status (
          pet_type_id, mood, cleanliness, hunger, energy, exp, level,
          max_mood, max_cleanliness, max_hunger, max_energy
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run([
        jsonData.petTypeId || 'cat',
        jsonData.status?.mood || 50.0,
        jsonData.status?.cleanliness || 100.0,
        jsonData.status?.hunger || 100.0,
        jsonData.status?.energy || 100.0,
        jsonData.status?.exp || 0.0,
        jsonData.status?.level || 1,
        jsonData.status?.maxMood || 100.0,
        jsonData.status?.maxCleanliness || 100.0,
        jsonData.status?.maxHunger || 100.0,
        jsonData.status?.maxEnergy || 100.0
      ]);

      detail.migratedRecords = result.changes;
      console.log(`✅ 迁移宠物状态: ${detail.migratedRecords} 条记录`);

    } catch (error) {
      detail.failedRecords = 1;
      detail.errors.push(error instanceof Error ? error.message : String(error));
      this.errorHandler.handleError('迁移宠物状态失败', error as Error);
    }

    return detail;
  }

  /**
   * 迁移位置信息
   */
  private async migratePosition(jsonData: any): Promise<MigrationDetail> {
    const detail: MigrationDetail = {
      type: 'position',
      migratedRecords: 0,
      failedRecords: 0,
      errors: []
    };

    try {
      if (jsonData.position) {
        const db = databaseManager.getDatabase();

        // 获取最后插入的宠物状态ID
        const petStatus = db.prepare('SELECT id FROM pet_status ORDER BY id DESC LIMIT 1').get();

        if (petStatus) {
          const result = db.prepare(`
            INSERT INTO pet_position (
              pet_status_id, x, y, screen_width, screen_height
            ) VALUES (?, ?, ?, ?, ?)
          `).run([
            petStatus.id,
            jsonData.position.x || 0,
            jsonData.position.y || 0,
            jsonData.position.screenWidth || 1920,
            jsonData.position.screenHeight || 1080
          ]);

          detail.migratedRecords = result.changes;
          console.log(`✅ 迁移位置信息: ${detail.migratedRecords} 条记录`);
        }
      }

    } catch (error) {
      detail.failedRecords = 1;
      detail.errors.push(error instanceof Error ? error.message : String(error));
      this.errorHandler.handleError('迁移位置信息失败', error as Error);
    }

    return detail;
  }

  /**
   * 迁移互动计数
   */
  private async migrateInteractionCounts(jsonData: any): Promise<MigrationDetail> {
    const detail: MigrationDetail = {
      type: 'interaction_counts',
      migratedRecords: 0,
      failedRecords: 0,
      errors: []
    };

    try {
      const db = databaseManager.getDatabase();
      const petStatus = db.prepare('SELECT id FROM pet_status ORDER BY id DESC LIMIT 1').get();

      if (petStatus && jsonData.status?.interactionCounts) {
        const interactionCounts = jsonData.status.interactionCounts;
        const records = Object.entries(interactionCounts).map(([type, count]) => [
          petStatus.id, type, count as number
        ]);

        if (records.length > 0) {
          const result = db.prepare(`
            INSERT INTO interaction_counts (pet_status_id, interaction_type, count)
            VALUES (?, ?, ?)
          `).run(records[0]); // 先插入一条

          detail.migratedRecords = result.changes;
          console.log(`✅ 迁移互动计数: ${detail.migratedRecords} 条记录`);
        }
      }

    } catch (error) {
      detail.failedRecords = 1;
      detail.errors.push(error instanceof Error ? error.message : String(error));
      this.errorHandler.handleError('迁移互动计数失败', error as Error);
    }

    return detail;
  }

  /**
   * 迁移成就
   */
  private async migrateAchievements(jsonData: any): Promise<MigrationDetail> {
    const detail: MigrationDetail = {
      type: 'achievements',
      migratedRecords: 0,
      failedRecords: 0,
      errors: []
    };

    try {
      const db = databaseManager.getDatabase();
      const petStatus = db.prepare('SELECT id FROM pet_status ORDER BY id DESC LIMIT 1').get();

      if (petStatus && jsonData.status?.unlockedAchievements) {
        const achievements = jsonData.status.unlockedAchievements as string[];

        for (const achievementId of achievements) {
          try {
            db.prepare(`
              INSERT INTO user_achievements (pet_status_id, achievement_id)
              VALUES (?, ?)
            `).run([petStatus.id, achievementId]);

            detail.migratedRecords++;
          } catch (error) {
            detail.failedRecords++;
            detail.errors.push(`成就 ${achievementId}: ${error instanceof Error ? error.message : String(error)}`);
          }
        }

        console.log(`✅ 迁移成就: ${detail.migratedRecords} 条记录`);
      }

    } catch (error) {
      detail.failedRecords = 1;
      detail.errors.push(error instanceof Error ? error.message : String(error));
      this.errorHandler.handleError('迁移成就失败', error as Error);
    }

    return detail;
  }

  /**
   * 迁移任务
   */
  private async migrateTasks(jsonData: any): Promise<MigrationDetail> {
    const detail: MigrationDetail = {
      type: 'tasks',
      migratedRecords: 0,
      failedRecords: 0,
      errors: []
    };

    try {
      const db = databaseManager.getDatabase();
      const petStatus = db.prepare('SELECT id FROM pet_status ORDER BY id DESC LIMIT 1').get();

      if (petStatus && jsonData.status) {
        const { activeTasks = [], completedTasks = [] } = jsonData.status;

        // 迁移进行中的任务
        for (const taskId of activeTasks) {
          try {
            db.prepare(`
              INSERT INTO user_tasks (pet_status_id, task_id, status)
              VALUES (?, ?, 'active')
            `).run([petStatus.id, taskId]);

            detail.migratedRecords++;
          } catch (error) {
            detail.failedRecords++;
            detail.errors.push(`任务 ${taskId}: ${error instanceof Error ? error.message : String(error)}`);
          }
        }

        // 迁移已完成的任务
        for (const taskId of completedTasks) {
          try {
            db.prepare(`
              INSERT INTO user_tasks (pet_status_id, task_id, status, completed_at)
              VALUES (?, ?, 'completed', ?)
            `).run([petStatus.id, taskId, new Date().toISOString()]);

            detail.migratedRecords++;
          } catch (error) {
            detail.failedRecords++;
            detail.errors.push(`任务 ${taskId}: ${error instanceof Error ? error.message : String(error)}`);
          }
        }

        console.log(`✅ 迁移任务: ${detail.migratedRecords} 条记录`);
      }

    } catch (error) {
      detail.failedRecords = 1;
      detail.errors.push(error instanceof Error ? error.message : String(error));
      this.errorHandler.handleError('迁移任务失败', error as Error);
    }

    return detail;
  }

  /**
   * 迁移物品
   */
  private async migrateInventory(jsonData: any): Promise<MigrationDetail> {
    const detail: MigrationDetail = {
      type: 'inventory',
      migratedRecords: 0,
      failedRecords: 0,
      errors: []
    };

    try {
      const db = databaseManager.getDatabase();
      const petStatus = db.prepare('SELECT id FROM pet_status ORDER BY id DESC LIMIT 1').get();

      if (petStatus && jsonData.status?.inventory) {
        const inventory = jsonData.status.inventory;

        for (const [itemId, quantity] of Object.entries(inventory)) {
          try {
            db.prepare(`
              INSERT INTO inventory (pet_status_id, item_id, quantity)
              VALUES (?, ?, ?)
            `).run([petStatus.id, itemId, quantity as number]);

            detail.migratedRecords++;
          } catch (error) {
            detail.failedRecords++;
            detail.errors.push(`物品 ${itemId}: ${error instanceof Error ? error.message : String(error)}`);
          }
        }

        console.log(`✅ 迁移物品: ${detail.migratedRecords} 条记录`);
      }

    } catch (error) {
      detail.failedRecords = 1;
      detail.errors.push(error instanceof Error ? error.message : String(error));
      this.errorHandler.handleError('迁移物品失败', error as Error);
    }

    return detail;
  }

  /**
   * 迁移动画
   */
  private async migrateAnimations(jsonData: any): Promise<MigrationDetail> {
    const detail: MigrationDetail = {
      type: 'animations',
      migratedRecords: 0,
      failedRecords: 0,
      errors: []
    };

    try {
      const db = databaseManager.getDatabase();
      const petStatus = db.prepare('SELECT id FROM pet_status ORDER BY id DESC LIMIT 1').get();

      if (petStatus && jsonData.status?.unlockedIdleAnimations) {
        const animations = jsonData.status.unlockedIdleAnimations as string[];

        for (const animationId of animations) {
          try {
            db.prepare(`
              INSERT INTO unlocked_animations (pet_status_id, animation_id)
              VALUES (?, ?)
            `).run([petStatus.id, animationId]);

            detail.migratedRecords++;
          } catch (error) {
            detail.failedRecords++;
            detail.errors.push(`动画 ${animationId}: ${error instanceof Error ? error.message : String(error)}`);
          }
        }

        console.log(`✅ 迁移动画: ${detail.migratedRecords} 条记录`);
      }

    } catch (error) {
      detail.failedRecords = 1;
      detail.errors.push(error instanceof Error ? error.message : String(error));
      this.errorHandler.handleError('迁移动画失败', error as Error);
    }

    return detail;
  }

  /**
   * 批量迁移数据（事务优化）
   */
  private async migrateBatchData(jsonData: any): Promise<MigrationDetail> {
    const detail: MigrationDetail = {
      type: 'batch_migration',
      migratedRecords: 0,
      failedRecords: 0,
      errors: []
    };

    try {
      const db = databaseManager.getDatabase();

      // 获取宠物状态ID
      const petStatus = db.prepare('SELECT id FROM pet_status ORDER BY id DESC LIMIT 1').get();
      if (!petStatus) {
        detail.errors.push('未找到宠物状态记录');
        return detail;
      }

      const petStatusId = petStatus.id;

      // 使用事务批量操作
      db.transaction(() => {
        // 批量迁移互动计数
        if (jsonData.status?.interactionCounts) {
          const interactionData = Object.entries(jsonData.status.interactionCounts)
            .filter(([, count]) => count > 0)
            .map(([type, count]) => [petStatusId, type, count]);

          if (interactionData.length > 0) {
            const insertInteraction = db.prepare(`
              INSERT INTO interaction_counts (pet_status_id, interaction_type, count)
              VALUES (?, ?, ?)
            `);
            interactionData.forEach(data => {
              try {
                insertInteraction.run(data);
                detail.migratedRecords++;
              } catch (error) {
                detail.failedRecords++;
                detail.errors.push(`互动计数迁移失败: ${error}`);
              }
            });
          }
        }

        // 批量迁移成就
        if (jsonData.status?.unlockedAchievements) {
          const achievementData = jsonData.status.unlockedAchievements
            .map((achievementId: string) => [petStatusId, achievementId]);

          if (achievementData.length > 0) {
            const insertAchievement = db.prepare(`
              INSERT INTO user_achievements (pet_status_id, achievement_id)
              VALUES (?, ?)
            `);
            achievementData.forEach(data => {
              try {
                insertAchievement.run(data);
                detail.migratedRecords++;
              } catch (error) {
                detail.failedRecords++;
                detail.errors.push(`成就迁移失败: ${error}`);
              }
            });
          }
        }

        // 批量迁移任务
        if (jsonData.status) {
          const { activeTasks = [], completedTasks = [] } = jsonData.status;

          // 进行中的任务
          if (activeTasks.length > 0) {
            const activeTaskData = activeTasks.map((taskId: string) => [
              petStatusId, taskId, 'active'
            ]);
            const insertTask = db.prepare(`
              INSERT INTO user_tasks (pet_status_id, task_id, status)
              VALUES (?, ?, ?)
            `);
            activeTaskData.forEach(data => {
              try {
                insertTask.run(data);
                detail.migratedRecords++;
              } catch (error) {
                detail.failedRecords++;
                detail.errors.push(`任务迁移失败: ${error}`);
              }
            });
          }

          // 已完成的任务
          if (completedTasks.length > 0) {
            const completedTaskData = completedTasks.map((taskId: string) => [
              petStatusId, taskId, 'completed', new Date().toISOString()
            ]);
            const insertCompletedTask = db.prepare(`
              INSERT INTO user_tasks (pet_status_id, task_id, status, completed_at)
              VALUES (?, ?, ?, ?)
            `);
            completedTaskData.forEach(data => {
              try {
                insertCompletedTask.run(data);
                detail.migratedRecords++;
              } catch (error) {
                detail.failedRecords++;
                detail.errors.push(`已完成任务迁移失败: ${error}`);
              }
            });
          }
        }

        // 批量迁移物品
        if (jsonData.status?.inventory) {
          const inventoryData = Object.entries(jsonData.status.inventory)
            .filter(([, quantity]) => quantity > 0)
            .map(([itemId, quantity]) => [petStatusId, itemId, quantity]);

          if (inventoryData.length > 0) {
            const insertInventory = db.prepare(`
              INSERT INTO inventory (pet_status_id, item_id, quantity)
              VALUES (?, ?, ?)
            `);
            inventoryData.forEach(data => {
              try {
                insertInventory.run(data);
                detail.migratedRecords++;
              } catch (error) {
                detail.failedRecords++;
                detail.errors.push(`物品迁移失败: ${error}`);
              }
            });
          }
        }

        // 批量迁移动画
        if (jsonData.status?.unlockedIdleAnimations) {
          const animationData = jsonData.status.unlockedIdleAnimations
            .map((animationId: string) => [petStatusId, animationId]);

          if (animationData.length > 0) {
            const insertAnimation = db.prepare(`
              INSERT INTO unlocked_animations (pet_status_id, animation_id)
              VALUES (?, ?)
            `);
            animationData.forEach(data => {
              try {
                insertAnimation.run(data);
                detail.migratedRecords++;
              } catch (error) {
                detail.failedRecords++;
                detail.errors.push(`动画迁移失败: ${error}`);
              }
            });
          }
        }

        // 迁移气泡状态
        if (jsonData.status?.bubble) {
          const bubble = jsonData.status.bubble;
          try {
            db.prepare(`
              INSERT INTO pet_bubble (
                pet_status_id, content_id, is_visible, display_duration
              ) VALUES (?, ?, ?, ?)
            `).run([
              petStatusId,
              bubble.contentId || null,
              bubble.isVisible || false,
              bubble.displayDuration || 5000
            ]);
            detail.migratedRecords++;
          } catch (error) {
            detail.failedRecords++;
            detail.errors.push(`气泡状态迁移失败: ${error}`);
          }
        }
      })();

      console.log(`✅ 批量迁移完成: ${detail.migratedRecords} 条记录`);
      return detail;

    } catch (error) {
      detail.failedRecords = detail.migratedRecords + detail.failedRecords;
      detail.errors.push(`批量迁移失败: ${error}`);
      this.errorHandler.handleError('批量迁移失败', error as Error);
      return detail;
    }
  }

  /**
   * 迁移气泡状态
   */
  private async migrateBubble(jsonData: any): Promise<MigrationDetail> {
    const detail: MigrationDetail = {
      type: 'bubble',
      migratedRecords: 0,
      failedRecords: 0,
      errors: []
    };

    try {
      const db = databaseManager.getDatabase();
      const petStatus = db.prepare('SELECT id FROM pet_status ORDER BY id DESC LIMIT 1').get();

      if (petStatus && jsonData.status?.bubble) {
        const bubble = jsonData.status.bubble;

        try {
          db.prepare(`
            INSERT INTO pet_bubble (pet_status_id, content_id, is_visible, display_duration)
            VALUES (?, ?, ?, ?)
          `).run([
            petStatus.id,
            bubble.contentId || null,
            bubble.isVisible || false,
            bubble.displayDuration || 5000
          ]);

          detail.migratedRecords++;
          console.log(`✅ 迁移气泡状态: ${detail.migratedRecords} 条记录`);
        } catch (error) {
          detail.failedRecords = 1;
          detail.errors.push(error instanceof Error ? error.message : String(error));
        }
      }

    } catch (error) {
      detail.failedRecords = 1;
      detail.errors.push(error instanceof Error ? error.message : String(error));
      this.errorHandler.handleError('迁移气泡状态失败', error as Error);
    }

    return detail;
  }

  /**
   * 验证迁移结果
   */
  private async validateMigration(): Promise<void> {
    console.log('🔍 验证迁移结果...');

    const db = databaseManager.getDatabase();

    // 检查宠物状态记录
    const petStatusCount = db.prepare('SELECT COUNT(*) as count FROM pet_status').get();
    console.log(`📊 宠物状态记录: ${petStatusCount.count}`);

    // 检查位置记录
    const positionCount = db.prepare('SELECT COUNT(*) as count FROM pet_position').get();
    console.log(`📊 位置记录: ${positionCount.count}`);

    // 检查互动记录
    const interactionCount = db.prepare('SELECT COUNT(*) as count FROM interaction_counts').get();
    console.log(`📊 互动记录: ${interactionCount.count}`);

    // 检查成就记录
    const achievementCount = db.prepare('SELECT COUNT(*) as count FROM user_achievements').get();
    console.log(`📊 成就记录: ${achievementCount.count}`);

    // 检查任务记录
    const taskCount = db.prepare('SELECT COUNT(*) as count FROM user_tasks').get();
    console.log(`📊 任务记录: ${taskCount.count}`);

    console.log('✅ 迁移结果验证完成');
  }

  /**
   * 标记迁移完成
   */
  private markMigrationCompleted(): void {
    try {
      const db = databaseManager.getDatabase();
      db.prepare(`
        INSERT OR REPLACE INTO app_settings (key, value, type)
        VALUES ('migration_completed', 'true', 'boolean')
      `).run();

      // 记录迁移时间
      db.prepare(`
        INSERT OR REPLACE INTO app_settings (key, value, type)
        VALUES ('migration_time', ?, 'string')
      `).run([new Date().toISOString()]);

      console.log('✅ 迁移标记已完成');
    } catch (error) {
      this.errorHandler.handleError('标记迁移完成失败', error as Error);
    }
  }

  /**
   * 记录迁移结果
   */
  private logMigrationResult(result: MigrationResult): void {
    this.migrationLog.push({
      timestamp: new Date().toISOString(),
      success: result.success,
      summary: result.summary,
      errors: result.errors
    });

    // 这里可以写入到日志文件或数据库
    console.log('📝 迁移结果已记录');
  }

  /**
   * 获取迁移日志
   */
  public getMigrationLog(): MigrationLogEntry[] {
    return [...this.migrationLog];
  }

  /**
   * 清理迁移日志
   */
  public clearMigrationLog(): void {
    this.migrationLog = [];
  }
}

/**
 * 迁移结果接口
 */
export interface MigrationResult {
  success: boolean;
  startTime: Date;
  endTime: Date | null;
  summary: MigrationSummary;
  errors: MigrationError[];
}

/**
 * 内部迁移结果接口
 */
interface InternalMigrationResult {
  summary: MigrationSummary;
  details: MigrationDetail[];
}

/**
 * 迁移摘要接口
 */
export interface MigrationSummary {
  totalFiles: number;
  migratedFiles: number;
  failedFiles: number;
  totalRecords: number;
  migratedRecords: number;
  failedRecords: number;
}

/**
 * 迁移详情接口
 */
export interface MigrationDetail {
  type: string;
  migratedRecords: number;
  failedRecords: number;
  errors: string[];
}

/**
 * 迁移错误接口
 */
export interface MigrationError {
  type: string;
  message: string;
  timestamp: Date;
}

/**
 * 迁移日志条目接口
 */
export interface MigrationLogEntry {
  timestamp: string;
  success: boolean;
  summary: MigrationSummary;
  errors: MigrationError[];
}

/**
 * 导出迁移器实例
 */
export const dataMigrator = new DataMigrator();