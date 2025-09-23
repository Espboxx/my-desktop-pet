import { databaseManager } from './DatabaseManager';

/**
 * 缓存条目接口
 */
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // 生存时间（毫秒）
  hits: number;
}

/**
 * 缓存配置接口
 */
export interface CacheConfig {
  defaultTTL: number;
  maxSize: number;
  enableStats: boolean;
}

/**
 * 查询缓存服务
 */
export class QueryCache {
  private cache = new Map<string, CacheEntry<any>>();
  private config: CacheConfig;
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    totalQueries: 0
  };

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      defaultTTL: 30000, // 默认30秒
      maxSize: 1000,    // 最大缓存条目数
      enableStats: true,
      ...config
    };

    this.startCleanupTimer();
  }

  /**
   * 生成缓存键
   */
  private generateKey(sql: string, params: any[] = []): string {
    const normalizedParams = JSON.stringify(params || []);
    return `${sql}:${normalizedParams}`;
  }

  /**
   * 检查缓存条目是否过期
   */
  private isExpired(entry: CacheEntry<any>): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  /**
   * 检查并清理过期的缓存条目
   */
  private cleanupExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        this.cache.delete(key);
        this.stats.evictions++;
      }
    }
  }

  /**
   * 清理最旧的条目（LRU策略）
   */
  private evictOldest(): void {
    if (this.cache.size >= this.config.maxSize) {
      // 找到最旧的条目
      let oldestKey = '';
      let oldestTime = Infinity;

      for (const [key, entry] of this.cache.entries()) {
        if (entry.timestamp < oldestTime) {
          oldestTime = entry.timestamp;
          oldestKey = key;
        }
      }

      if (oldestKey) {
        this.cache.delete(oldestKey);
        this.stats.evictions++;
      }
    }
  }

  /**
   * 获取缓存数据
   */
  public get<T>(sql: string, params: any[] = []): T | null {
    if (!this.config.enableStats) {
      return null; // 如果缓存被禁用，直接返回null
    }

    const key = this.generateKey(sql, params);
    const entry = this.cache.get(key);

    if (entry && !this.isExpired(entry)) {
      entry.hits++;
      this.stats.hits++;
      this.stats.totalQueries++;
      return entry.data;
    }

    this.stats.misses++;
    this.stats.totalQueries++;
    return null;
  }

  /**
   * 设置缓存数据
   */
  public set<T>(sql: string, params: any[] = [], data: T, ttl?: number): void {
    if (!this.config.enableStats) {
      return; // 如果缓存被禁用，直接返回
    }

    const key = this.generateKey(sql, params);

    // 检查大小限制
    this.evictOldest();

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.config.defaultTTL,
      hits: 0
    };

    this.cache.set(key, entry);
  }

  /**
   * 删除指定缓存
   */
  public delete(sql: string, params: any[] = []): void {
    const key = this.generateKey(sql, params);
    this.cache.delete(key);
  }

  /**
   * 删除匹配模式的缓存
   */
  public deletePattern(pattern: RegExp): void {
    for (const [key] of this.cache.entries()) {
      if (pattern.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * 清空所有缓存
   */
  public clear(): void {
    this.cache.clear();
    this.stats.evictions += this.cache.size;
  }

  /**
   * 获取缓存统计信息
   */
  public getStats() {
    return {
      ...this.stats,
      size: this.cache.size,
      hitRate: this.stats.totalQueries > 0 ?
        (this.stats.hits / this.stats.totalQueries) * 100 : 0,
      config: this.config
    };
  }

  /**
   * 获取缓存内容（用于调试）
   */
  public getCacheContents() {
    const contents: Array<{
      key: string;
      data: any;
      timestamp: number;
      ttl: number;
      hits: number;
      expired: boolean;
    }> = [];

    for (const [key, entry] of this.cache.entries()) {
      contents.push({
        key,
        data: entry.data,
        timestamp: entry.timestamp,
        ttl: entry.ttl,
        hits: entry.hits,
        expired: this.isExpired(entry)
      });
    }

    return contents;
  }

  /**
   * 启动定期清理定时器
   */
  private startCleanupTimer(): void {
    // 每分钟清理一次过期缓存
    setInterval(() => {
      this.cleanupExpired();
    }, 60 * 1000);
  }

  /**
   * 预热缓存（批量加载常用数据）
   */
  public async warmUp(): Promise<void> {
    try {
      // 预加载宠物状态
      const petStatusKey = 'SELECT ps.*, pt.id as petTypeId FROM pet_status ps JOIN pet_types pt ON ps.pet_type_id = pt.id ORDER BY ps.id DESC LIMIT 1';
      const petStatus = databaseManager.queryOne(petStatusKey);
      if (petStatus) {
        this.set(petStatusKey, [], petStatus, 60000); // 1分钟缓存
      }

      // 预加载应用设置
      const settingsKey = 'SELECT key, value, type FROM app_settings';
      const settings = databaseManager.query(settingsKey);
      this.set(settingsKey, [], settings, 120000); // 2分钟缓存

      console.log('✅ 查询缓存预热完成');
    } catch (error) {
      console.error('❌ 查询缓存预热失败:', error);
    }
  }

  /**
   * 智能缓存失效（基于表变更）
   */
  public invalidateOnTableChange(tableName: string): void {
    const pattern = new RegExp(`\\b${tableName}\\b`);
    this.deletePattern(pattern);
  }

  /**
   * 更新缓存配置
   */
  public updateConfig(newConfig: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...newConfig };

    // 如果新的大小限制比当前小，需要清理
    if (newConfig.maxSize && newConfig.maxSize < this.cache.size) {
      while (this.cache.size > newConfig.maxSize) {
        this.evictOldest();
      }
    }
  }

  /**
   * 获取缓存的TTL（剩余生存时间）
   */
  public getTTL(sql: string, params: any[] = []): number {
    const key = this.generateKey(sql, params);
    const entry = this.cache.get(key);

    if (!entry) {
      return 0;
    }

    const elapsed = Date.now() - entry.timestamp;
    return Math.max(0, entry.ttl - elapsed);
  }

  /**
   * 检查缓存是否存在且未过期
   */
  public has(sql: string, params: any[] = []): boolean {
    const key = this.generateKey(sql, params);
    const entry = this.cache.get(key);
    return entry !== undefined && !this.isExpired(entry);
  }

  /**
   * 获取缓存大小（字节数，估算）
   */
  public getMemoryUsage(): number {
    let totalSize = 0;

    for (const [key, entry] of this.cache.entries()) {
      // 估算键的大小
      totalSize += key.length * 2; // UTF-16编码，每个字符2字节

      // 估算数据的大小
      const dataSize = JSON.stringify(entry.data).length * 2;
      totalSize += dataSize;

      // 其他元数据的大小
      totalSize += 32; // 时间戳、TTL、命中数等
    }

    return totalSize;
  }

  /**
   * 导出缓存状态
   */
  public exportState() {
    return {
      stats: this.getStats(),
      memoryUsage: this.getMemoryUsage(),
      cacheContents: this.getCacheContents()
    };
  }
}

/**
 * 缓存装饰器
 */
export function cacheQuery(ttl?: number) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    const queryCache = new QueryCache();

    descriptor.value = async function (...args: any[]) {
      // 生成缓存键（基于方法名和参数）
      const cacheKey = `${propertyName}:${JSON.stringify(args)}`;

      // 尝试从缓存获取
      const cachedResult = queryCache.get(cacheKey, []);
      if (cachedResult) {
        return cachedResult;
      }

      // 执行原方法
      const result = await method.apply(this, args);

      // 缓存结果
      queryCache.set(cacheKey, [], result, ttl);

      return result;
    };

    return descriptor;
  };
}

/**
 * 导出查询缓存实例
 */
export const queryCache = new QueryCache({
  defaultTTL: 30000,  // 30秒
  maxSize: 1000,      // 1000个条目
  enableStats: true   // 启用统计
});