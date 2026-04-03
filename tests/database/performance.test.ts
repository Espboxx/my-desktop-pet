import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';

vi.mock('electron', () => ({
  app: {
    getPath: () => process.cwd(),
  },
}));

import { databaseManager } from '../../electron/database/DatabaseManager';
import { petStatusService } from '../../electron/database/services/PetStatusService';
import { settingsService } from '../../electron/database/services/SettingsService';
import type { SavedPetData } from '../../src/types/petTypes';

type TestSettingsMap = Record<string, string | number | boolean>;

describe('Database Performance Tests', () => {
  beforeAll(async () => {
    // 初始化测试数据库
    databaseManager.connect();
  });

  afterAll(() => {
    // 清理资源
    databaseManager.close();
  });

  beforeEach(() => {
    // 每个测试前清理数据
    const db = databaseManager.getDatabase();
    db.exec('DELETE FROM pet_status');
    db.exec('DELETE FROM interaction_counts');
    db.exec('DELETE FROM user_achievements');
    db.exec('DELETE FROM user_tasks');
    db.exec('DELETE FROM inventory');
    db.exec('DELETE FROM unlocked_animations');
    db.exec('DELETE FROM app_settings');
    db.exec('DELETE FROM pet_types');
    db.prepare(`
      INSERT INTO pet_types (id, name, category, is_active)
      VALUES ('cat', 'Cat', 'default', 1)
    `).run();
  });

  describe('Pet Status Operations', () => {
    it('should perform CRUD operations under 50ms', async () => {
      const testData: SavedPetData = {
        petTypeId: 'cat',
        status: {
          mood: 75.0,
          cleanliness: 85.0,
          hunger: 65.0,
          energy: 80.0,
          exp: 1000.0,
          level: 5,
          maxMood: 100.0,
          maxCleanliness: 100.0,
          maxHunger: 100.0,
          maxEnergy: 100.0,
          interactionCounts: {
            feed: 10,
            play: 15,
            clean: 5
          },
          unlockedAchievements: ['first-feed', 'first-play'],
          activeTasks: ['daily-feed', 'daily-play'],
          completedTasks: ['tutorial-complete'],
          unlockedIdleAnimations: ['sleeping', 'playing'],
          bubble: {
            active: true,
            text: 'hungry',
            type: 'thought',
            timeout: 5000
          },
          inventory: {
            food: 5,
            toy: 2,
            medicine: 1
          }
        },
        position: {
          x: 100,
          y: 200,
          screenWidth: 1920,
          screenHeight: 1080
        }
      };

      // 测试插入性能
      const insertStart = performance.now();
      petStatusService.savePetStatus(testData);
      const insertTime = performance.now() - insertStart;
      console.log(`Insert time: ${insertTime.toFixed(2)}ms`);
      expect(insertTime).toBeLessThan(50);

      // 测试查询性能
      const queryStart = performance.now();
      const result = petStatusService.getPetStatus();
      const queryTime = performance.now() - queryStart;
      console.log(`Query time: ${queryTime.toFixed(2)}ms`);
      expect(queryTime).toBeLessThan(10);
      expect(result).toBeTruthy();
      expect(result!.petTypeId).toBe('cat');

      // 测试更新性能
      const updatedData = { ...testData };
      updatedData.status.mood = 90.0;
      const updateStart = performance.now();
      petStatusService.savePetStatus(updatedData);
      const updateTime = performance.now() - updateStart;
      console.log(`Update time: ${updateTime.toFixed(2)}ms`);
      expect(updateTime).toBeLessThan(50);

      // 验证更新结果
      const updatedResult = petStatusService.getPetStatus();
      expect(updatedResult!.status.mood).toBe(90.0);
    });

    it('should handle concurrent access efficiently', async () => {
      const concurrentOperations = 100;
      const promises: Promise<void>[] = [];

      const start = performance.now();

      // 创建并发操作
      for (let i = 0; i < concurrentOperations; i++) {
        const testData: SavedPetData = {
          petTypeId: 'cat',
          status: {
            mood: 50.0 + i,
            cleanliness: 50.0 + i,
            hunger: 50.0 + i,
            energy: 50.0 + i,
            exp: i * 100.0,
            level: 1,
            maxMood: 100.0,
            maxCleanliness: 100.0,
            maxHunger: 100.0,
            maxEnergy: 100.0,
            interactionCounts: {
              feed: i,
              play: i,
              clean: i
            },
            unlockedAchievements: [],
            activeTasks: [],
            completedTasks: [],
            unlockedIdleAnimations: [],
            bubble: {
              active: true,
              text: 'test',
              type: 'thought',
              timeout: 5000
            },
            inventory: {
              food: i,
              toy: i,
              medicine: i
            }
          },
          position: {
            x: i,
            y: i,
            screenWidth: 1920,
            screenHeight: 1080
          }
        };

        promises.push(
          new Promise<void>((resolve) => {
            setTimeout(() => {
              petStatusService.savePetStatus(testData);
              resolve();
            }, Math.random() * 10); // 随机延迟模拟真实场景
          })
        );
      }

      // 等待所有操作完成
      await Promise.all(promises);
      const totalTime = performance.now() - start;

      console.log(`Concurrent operations time: ${totalTime.toFixed(2)}ms`);
      console.log(`Average per operation: ${(totalTime / concurrentOperations).toFixed(2)}ms`);

      // 验证数据完整性
      const finalResult = petStatusService.getPetStatus();
      expect(finalResult).toBeTruthy();
    });
  });

  describe('Settings Operations', () => {
    it('should perform settings operations efficiently', async () => {
      const testSettings = {
        window_opacity: 0.8,
        pet_type: 'cat',
        sound_enabled: true,
        activity_level: 'normal'
      };

      // 测试设置保存
      const saveStart = performance.now();
      settingsService.setSettings(testSettings);
      const saveTime = performance.now() - saveStart;
      console.log(`Settings save time: ${saveTime.toFixed(2)}ms`);
      expect(saveTime).toBeLessThan(20);

      // 测试设置读取
      const readStart = performance.now();
      const loadedSettings = settingsService.getSettings();
      const readTime = performance.now() - readStart;
      console.log(`Settings read time: ${readTime.toFixed(2)}ms`);
      expect(readTime).toBeLessThan(5);

      // 验证设置
      expect(loadedSettings.window_opacity).toBe(0.8);
      expect(loadedSettings.pet_type).toBe('cat');
      expect(loadedSettings.sound_enabled).toBe(true);
    });

    it('should handle large number of settings', async () => {
      const largeSettings: TestSettingsMap = {};

      // 生成大量设置项
      for (let i = 0; i < 1000; i++) {
        largeSettings[`setting_${i}`] = `value_${i}`;
      }

      const start = performance.now();
      settingsService.setSettings(largeSettings);
      const saveTime = performance.now() - start;
      console.log(`Large settings save time: ${saveTime.toFixed(2)}ms`);
      expect(saveTime).toBeLessThan(100);

      const readStart = performance.now();
      const loadedSettings = settingsService.getSettings();
      const readTime = performance.now() - readStart;
      console.log(`Large settings read time: ${readTime.toFixed(2)}ms`);
      expect(readTime).toBeLessThan(20);

      expect(Object.keys(loadedSettings).length).toBeGreaterThan(1000);
    });
  });

  describe('Database Connection Performance', () => {
    it('should maintain connection stability under load', async () => {
      const operations = 1000;
      const connectionStats: number[] = [];

      for (let i = 0; i < operations; i++) {
        const start = performance.now();

        // 获取数据库连接并执行简单查询
        const db = databaseManager.getDatabase();
        db.prepare('SELECT 1').get();

        const endTime = performance.now();
        connectionStats.push(endTime - start);
      }

      const avgTime = connectionStats.reduce((a, b) => a + b, 0) / connectionStats.length;
      const maxTime = Math.max(...connectionStats);
      const minTime = Math.min(...connectionStats);

      console.log(`Connection performance:`);
      console.log(`Average: ${avgTime.toFixed(2)}ms`);
      console.log(`Min: ${minTime.toFixed(2)}ms`);
      console.log(`Max: ${maxTime.toFixed(2)}ms`);

      expect(avgTime).toBeLessThan(1);
      expect(maxTime).toBeLessThan(10);
    });

    it('should handle WAL mode efficiently', async () => {
      const db = databaseManager.getDatabase();

      // 执行写入操作
      const writeOperations = 100;
      const writeTimes: number[] = [];

      for (let i = 0; i < writeOperations; i++) {
        const start = performance.now();

        db.prepare('INSERT INTO app_settings (key, value, type) VALUES (?, ?, ?)')
          .run([`test_${i}`, `value_${i}`, 'string']);

        writeTimes.push(performance.now() - start);
      }

      // 执行读取操作（测试并发读取）
      const readStart = performance.now();
      for (let i = 0; i < writeOperations; i++) {
        db.prepare('SELECT value FROM app_settings WHERE key = ?')
          .get([`test_${i}`]);
      }
      const readTime = performance.now() - readStart;

      const avgWriteTime = writeTimes.reduce((a, b) => a + b, 0) / writeTimes.length;

      console.log(`WAL mode performance:`);
      console.log(`Average write time: ${avgWriteTime.toFixed(2)}ms`);
      console.log(`Total read time: ${readTime.toFixed(2)}ms`);

      expect(avgWriteTime).toBeLessThan(5);
      expect(readTime).toBeLessThan(50);
    });
  });

  describe('Memory Usage', () => {
    it('should maintain stable memory usage', async () => {
      const initialMemory = process.memoryUsage();

      // 执行大量操作
      for (let i = 0; i < 1000; i++) {
        const testData: SavedPetData = {
          petTypeId: 'cat',
          status: {
            mood: Math.random() * 100,
            cleanliness: Math.random() * 100,
            hunger: Math.random() * 100,
            energy: Math.random() * 100,
            exp: Math.random() * 1000,
            level: 1,
            maxMood: 100.0,
            maxCleanliness: 100.0,
            maxHunger: 100.0,
            maxEnergy: 100.0,
            interactionCounts: {},
            unlockedAchievements: [],
            activeTasks: [],
            completedTasks: [],
            unlockedIdleAnimations: [],
            bubble: {
              active: true,
              text: 'test',
              type: 'thought',
              timeout: 5000
            },
            inventory: {}
          },
          position: {
            x: Math.random() * 1000,
            y: Math.random() * 1000,
            screenWidth: 1920,
            screenHeight: 1080
          }
        };

        petStatusService.savePetStatus(testData);
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      console.log(`Memory usage increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);

      // 内存增长应该小于50MB
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });

  describe('Transaction Performance', () => {
    it('should handle bulk operations efficiently with transactions', async () => {
      const db = databaseManager.getDatabase();
      const itemCount = 1000;

      // 不使用事务的批量操作
      const noTransactionStart = performance.now();
      for (let i = 0; i < itemCount; i++) {
        db.prepare('INSERT INTO app_settings (key, value, type) VALUES (?, ?, ?)')
          .run([`bulk_${i}`, `value_${i}`, 'string']);
      }
      const noTransactionTime = performance.now() - noTransactionStart;

      // 清理数据
      db.exec('DELETE FROM app_settings');

      // 使用事务的批量操作
      const transactionStart = performance.now();
      db.transaction(() => {
        for (let i = 0; i < itemCount; i++) {
          db.prepare('INSERT INTO app_settings (key, value, type) VALUES (?, ?, ?)')
            .run([`bulk_${i}`, `value_${i}`, 'string']);
        }
      })();
      const transactionTime = performance.now() - transactionStart;

      console.log(`Bulk operations performance:`);
      console.log(`Without transaction: ${noTransactionTime.toFixed(2)}ms`);
      console.log(`With transaction: ${transactionTime.toFixed(2)}ms`);
      console.log(`Transaction speedup: ${(noTransactionTime / transactionTime).toFixed(2)}x`);

      // 事务应该明显更快
      expect(transactionTime).toBeLessThan(noTransactionTime * 0.5);
    });
  });
});
