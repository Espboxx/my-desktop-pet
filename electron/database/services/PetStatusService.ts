import { databaseManager } from '../DatabaseManager';
import { DatabaseErrorHandler } from '../ErrorHandler';
import type { SavedPetData, PetPosition } from '../../../src/types/petTypes';

/**
 * 宠物状态数据库服务
 * 负责宠物状态的数据库操作
 */
export class PetStatusService {
  private errorHandler: DatabaseErrorHandler;

  constructor() {
    this.errorHandler = new DatabaseErrorHandler();
  }

  /**
   * 获取最新的宠物状态ID
   */
  private getLatestPetStatusId(): number | null {
    try {
      const db = databaseManager.getDatabase();
      const result = db.prepare('SELECT id FROM pet_status ORDER BY id DESC LIMIT 1').get();
      return result ? result.id : null;
    } catch (error) {
      this.errorHandler.handleError('获取最新宠物状态ID失败', error as Error);
      return null;
    }
  }

  /**
   * 通用的更新或插入方法
   */
  private upsertRecord(tableName: string, idField: string, data: Record<string, unknown>, whereCondition?: string): number {
    const db = databaseManager.getDatabase();

    const whereClause = whereCondition || `${idField} = ?`;
    const existingRecord = db.prepare(`SELECT ${idField} FROM ${tableName} WHERE ${whereClause} LIMIT 1`).get(
      whereCondition ? undefined : [data[idField]]
    );

    if (existingRecord) {
      // 更新现有记录
      const fields = Object.keys(data).filter(key => key !== idField);
      const setClause = fields.map(field => `${field} = ?`).join(', ');
      const values = fields.map(field => data[field]);

      if (whereCondition) {
        db.prepare(`UPDATE ${tableName} SET ${setClause} WHERE ${whereClause}`).run(values);
      } else {
        db.prepare(`UPDATE ${tableName} SET ${setClause} WHERE ${idField} = ?`).run([...values, data[idField]]);
      }

      return existingRecord[idField];
    } else {
      // 插入新记录
      const fields = Object.keys(data);
      const placeholders = fields.map(() => '?').join(', ');
      const values = fields.map(field => data[field]);

      const result = db.prepare(`INSERT INTO ${tableName} (${fields.join(', ')}) VALUES (${placeholders})`).run(values);
      return result.lastInsertRowid;
    }
  }

  /**
   * 批量删除并插入数据
   */
  private batchInsert(tableName: string, petStatusId: number, data: Record<string, unknown>[], fields: string[]): void {
    const db = databaseManager.getDatabase();

    // 删除现有数据
    db.prepare(`DELETE FROM ${tableName} WHERE pet_status_id = ?`).run([petStatusId]);

    // 批量插入新数据
    if (data.length > 0) {
      const placeholders = fields.map(() => '?').join(', ');
      const stmt = db.prepare(`INSERT INTO ${tableName} (${fields.join(', ')}) VALUES (${placeholders})`);

      db.transaction(() => {
        data.forEach(item => {
          const values = fields.map(field => item[field] as unknown);
          stmt.run(values);
        });
      })();
    }
  }

  /**
   * 获取宠物状态
   */
  public getPetStatus(): SavedPetData | null {
    try {
      const db = databaseManager.getDatabase();

      // 获取最新的宠物状态
      const petStatus = db.prepare(`
        SELECT
          ps.*,
          pt.id as petTypeId
        FROM pet_status ps
        JOIN pet_types pt ON ps.pet_type_id = pt.id
        ORDER BY ps.id DESC
        LIMIT 1
      `).get();

      if (!petStatus) {
        return null;
      }

      // 获取位置信息
      const position = this.getLatestPetStatusId() ? db.prepare(`
        SELECT x, y, screen_width as screenWidth, screen_height as screenHeight
        FROM pet_position
        WHERE pet_status_id = ?
        ORDER BY id DESC
        LIMIT 1
      `).get([this.getLatestPetStatusId()]) : null;

      // 获取互动计数
      const interactionCounts = this.getLatestPetStatusId() ? db.prepare(`
        SELECT interaction_type, count
        FROM interaction_counts
        WHERE pet_status_id = ?
      `).all([this.getLatestPetStatusId()]).reduce((acc, row: any) => {
        acc[row.interaction_type] = row.count;
        return acc;
      }, {} as Record<string, number>) : {};

      // 获取成就
      const unlockedAchievements = this.getLatestPetStatusId() ? db.prepare(`
        SELECT achievement_id
        FROM user_achievements
        WHERE pet_status_id = ?
      `).all([this.getLatestPetStatusId()]).map((row: any) => row.achievement_id) : [];

      // 获取任务状态
      const userTasks = this.getLatestPetStatusId() ? db.prepare(`
        SELECT task_id, status, completed_at
        FROM user_tasks
        WHERE pet_status_id = ?
      `).all([this.getLatestPetStatusId()]) : [];

      const activeTasks = userTasks
        .filter((task: any) => task.status === 'active')
        .map((task: any) => task.task_id);

      const completedTasks = userTasks
        .filter((task: any) => task.status === 'completed')
        .map((task: any) => task.task_id);

      // 获取物品库存
      const inventory = this.getLatestPetStatusId() ? db.prepare(`
        SELECT item_id, quantity
        FROM inventory
        WHERE pet_status_id = ?
      `).all([this.getLatestPetStatusId()]).reduce((acc, row: any) => {
        acc[row.item_id] = row.quantity;
        return acc;
      }, {} as Record<string, number>) : {};

      // 获取解锁动画
      const unlockedIdleAnimations = this.getLatestPetStatusId() ? db.prepare(`
        SELECT animation_id
        FROM unlocked_animations
        WHERE pet_status_id = ?
      `).all([this.getLatestPetStatusId()]).map((row: any) => row.animation_id) : [];

      // 获取气泡状态
      const bubble = this.getLatestPetStatusId() ? db.prepare(`
        SELECT content_id as contentId, is_visible as isVisible, display_duration as displayDuration
        FROM pet_bubble
        WHERE pet_status_id = ?
        ORDER BY id DESC
        LIMIT 1
      `).get([this.getLatestPetStatusId()]) : null;

      // 构建返回数据
      const result: SavedPetData = {
        petTypeId: petStatus.petTypeId,
        status: {
          mood: petStatus.mood,
          cleanliness: petStatus.cleanliness,
          hunger: petStatus.hunger,
          energy: petStatus.energy,
          exp: petStatus.exp,
          level: petStatus.level,
          maxMood: petStatus.max_mood,
          maxCleanliness: petStatus.max_cleanliness,
          maxHunger: petStatus.max_hunger,
          maxEnergy: petStatus.max_energy,
          interactionCounts,
          unlockedAchievements,
          activeTasks,
          completedTasks,
          unlockedIdleAnimations,
          bubble: bubble || {
            contentId: null,
            isVisible: false,
            displayDuration: 5000
          },
          inventory
        },
        position: position
      };

      return result;

    } catch (error) {
      this.errorHandler.handleError('获取宠物状态失败', error as Error);
      return null;
    }
  }

  /**
   * 保存宠物状态
   */
  public savePetStatus(stateData: SavedPetData): void {
    try {
      const db = databaseManager.getDatabase();

      // 使用事务确保数据一致性
      db.transaction(() => {
        // 更新或插入宠物状态
        const petStatusData = {
          pet_type_id: stateData.petTypeId,
          mood: stateData.status.mood,
          cleanliness: stateData.status.cleanliness,
          hunger: stateData.status.hunger,
          energy: stateData.status.energy,
          exp: stateData.status.exp,
          level: stateData.status.level,
          max_mood: stateData.status.maxMood,
          max_cleanliness: stateData.status.maxCleanliness,
          max_hunger: stateData.status.maxHunger,
          max_energy: stateData.status.maxEnergy
        };

        const petStatusId = this.upsertRecord('pet_status', 'id', petStatusData, '1=1 ORDER BY id DESC LIMIT 1');

        // 更新位置信息
        if (stateData.position) {
          const positionData = {
            pet_status_id: petStatusId,
            x: stateData.position.x,
            y: stateData.position.y,
            screen_width: stateData.position.screenWidth || 1920,
            screen_height: stateData.position.screenHeight || 1080
          };
          this.upsertRecord('pet_position', 'id', positionData, `pet_status_id = ${petStatusId} ORDER BY id DESC LIMIT 1`);
        }

        // 批量更新互动计数
        const interactionData = Object.entries(stateData.status.interactionCounts)
          .filter(([_, count]) => count > 0)
          .map(([type, count]) => ({
            pet_status_id: petStatusId,
            interaction_type: type,
            count
          }));
        this.batchInsert('interaction_counts', petStatusId, interactionData, ['pet_status_id', 'interaction_type', 'count']);

        // 批量更新成就
        const achievementData = stateData.status.unlockedAchievements.map(achievementId => ({
          pet_status_id: petStatusId,
          achievement_id: achievementId
        }));
        this.batchInsert('user_achievements', petStatusId, achievementData, ['pet_status_id', 'achievement_id']);

        // 批量更新任务状态
        const taskData = [
          ...stateData.status.activeTasks.map(taskId => ({
            pet_status_id: petStatusId,
            task_id: taskId,
            status: 'active',
            completed_at: null
          })),
          ...stateData.status.completedTasks.map(taskId => ({
            pet_status_id: petStatusId,
            task_id: taskId,
            status: 'completed',
            completed_at: new Date().toISOString()
          }))
        ];
        this.batchInsert('user_tasks', petStatusId, taskData, ['pet_status_id', 'task_id', 'status', 'completed_at']);

        // 批量更新物品库存
        const inventoryData = Object.entries(stateData.status.inventory)
          .filter(([_, quantity]) => quantity > 0)
          .map(([itemId, quantity]) => ({
            pet_status_id: petStatusId,
            item_id: itemId,
            quantity
          }));
        this.batchInsert('inventory', petStatusId, inventoryData, ['pet_status_id', 'item_id', 'quantity']);

        // 批量更新解锁动画
        const animationData = stateData.status.unlockedIdleAnimations.map(animationId => ({
          pet_status_id: petStatusId,
          animation_id: animationId
        }));
        this.batchInsert('unlocked_animations', petStatusId, animationData, ['pet_status_id', 'animation_id']);

        // 更新气泡状态
        if (stateData.status.bubble) {
          const bubbleData = {
            pet_status_id: petStatusId,
            content_id: stateData.status.bubble.contentId,
            is_visible: stateData.status.bubble.isVisible,
            display_duration: stateData.status.bubble.displayDuration
          };
          this.upsertRecord('pet_bubble', 'id', bubbleData, `pet_status_id = ${petStatusId} ORDER BY id DESC LIMIT 1`);
        }
      })();

    } catch (error) {
      this.errorHandler.handleError('保存宠物状态失败', error as Error);
      throw error;
    }
  }

  /**
   * 更新宠物位置
   */
  public updatePetPosition(position: PetPosition): void {
    try {
      const petStatusId = this.getLatestPetStatusId();

      if (!petStatusId) {
        this.errorHandler.handleError('更新宠物位置失败', new Error('没有找到宠物状态'));
        return;
      }

      const positionData = {
        pet_status_id: petStatusId,
        x: position.x,
        y: position.y,
        screen_width: position.screenWidth || 1920,
        screen_height: position.screenHeight || 1080
      };

      this.upsertRecord('pet_position', 'id', positionData, `pet_status_id = ${petStatusId} ORDER BY id DESC LIMIT 1`);

    } catch (error) {
      this.errorHandler.handleError('更新宠物位置失败', error as Error);
    }
  }

  /**
   * 更新宠物状态值
   */
  public updatePetStatusValues(updates: Partial<{
    mood: number;
    cleanliness: number;
    hunger: number;
    energy: number;
    exp: number;
    level: number;
  }>): void {
    try {
      const petStatusId = this.getLatestPetStatusId();

      if (!petStatusId) {
        this.errorHandler.handleError('更新宠物状态值失败', new Error('没有找到宠物状态'));
        return;
      }

      const fieldMap = {
        mood: 'mood',
        cleanliness: 'cleanliness',
        hunger: 'hunger',
        energy: 'energy',
        exp: 'exp',
        level: 'level'
      };

      const validUpdates = Object.entries(updates)
        .filter(([_, value]) => value !== undefined)
        .reduce((acc, [key, value]) => {
          const field = fieldMap[key as keyof typeof fieldMap];
          if (field) {
            acc[field] = value;
          }
          return acc;
        }, {} as Record<string, any>);

      if (Object.keys(validUpdates).length === 0) {
        return;
      }

      this.upsertRecord('pet_status', 'id', validUpdates, `id = ${petStatusId}`);

    } catch (error) {
      this.errorHandler.handleError('更新宠物状态值失败', error as Error);
    }
  }

  /**
   * 增加互动计数
   */
  public incrementInteractionCount(interactionType: string): void {
    try {
      const petStatusId = this.getLatestPetStatusId();

      if (!petStatusId) {
        return;
      }

      const db = databaseManager.getDatabase();
      db.prepare(`
        INSERT INTO interaction_counts (pet_status_id, interaction_type, count)
        VALUES (?, ?, 1)
        ON CONFLICT(pet_status_id, interaction_type)
        DO UPDATE SET count = count + 1
      `).run([petStatusId, interactionType]);

    } catch (error) {
      this.errorHandler.handleError('增加互动计数失败', error as Error);
    }
  }

  /**
   * 解锁成就
   */
  public unlockAchievement(achievementId: string): void {
    try {
      const petStatusId = this.getLatestPetStatusId();

      if (!petStatusId) {
        return;
      }

      const db = databaseManager.getDatabase();
      db.prepare(`
        INSERT OR IGNORE INTO user_achievements (pet_status_id, achievement_id)
        VALUES (?, ?)
      `).run([petStatusId, achievementId]);

    } catch (error) {
      this.errorHandler.handleError('解锁成就失败', error as Error);
    }
  }

  /**
   * 添加物品到库存
   */
  public addItemToInventory(itemId: string, quantity: number = 1): void {
    try {
      const petStatusId = this.getLatestPetStatusId();

      if (!petStatusId) {
        return;
      }

      const db = databaseManager.getDatabase();
      db.prepare(`
        INSERT INTO inventory (pet_status_id, item_id, quantity)
        VALUES (?, ?, ?)
        ON CONFLICT(pet_status_id, item_id)
        DO UPDATE SET quantity = quantity + ?
      `).run([petStatusId, itemId, quantity, quantity]);

    } catch (error) {
      this.errorHandler.handleError('添加物品到库存失败', error as Error);
    }
  }

  /**
   * 解锁动画
   */
  public unlockAnimation(animationId: string): void {
    try {
      const petStatusId = this.getLatestPetStatusId();

      if (!petStatusId) {
        return;
      }

      const db = databaseManager.getDatabase();
      db.prepare(`
        INSERT OR IGNORE INTO unlocked_animations (pet_status_id, animation_id)
        VALUES (?, ?)
      `).run([petStatusId, animationId]);

    } catch (error) {
      this.errorHandler.handleError('解锁动画失败', error as Error);
    }
  }

  /**
   * 重置宠物数据
   */
  public resetPetData(): void {
    try {
      const petStatusId = this.getLatestPetStatusId();

      if (!petStatusId) {
        return;
      }

      const db = databaseManager.getDatabase();

      // 重置宠物状态为默认值
      db.prepare(`
        UPDATE pet_status SET
          mood = 50.0,
          cleanliness = 100.0,
          hunger = 100.0,
          energy = 100.0,
          exp = 0.0,
          level = 1
        WHERE id = ?
      `).run([petStatusId]);

      // 清空相关数据
      const tablesToClear = [
        'interaction_counts',
        'user_achievements',
        'user_tasks',
        'inventory',
        'unlocked_animations',
        'pet_bubble'
      ];

      tablesToClear.forEach(table => {
        db.prepare(`DELETE FROM ${table} WHERE pet_status_id = ?`).run([petStatusId]);
      });

    } catch (error) {
      this.errorHandler.handleError('重置宠物数据失败', error as Error);
    }
  }
}

/**
 * 导出宠物状态服务实例
 */
export const petStatusService = new PetStatusService();