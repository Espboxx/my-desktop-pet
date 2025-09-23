import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';
import { DatabaseErrorHandler } from './ErrorHandler';
import { performanceMonitor } from './PerformanceMonitor';
import { queryCache } from './QueryCache';
import { indexManager } from './IndexManager';

/**
 * 数据库连接管理器
 * 单例模式管理SQLite连接，支持多进程并发访问
 */
export class DatabaseManager {
  private static instance: DatabaseManager;
  private db: Database.Database | null = null;
  private isConnected = false;
  private retryCount = 0;
  private maxRetries = 3;
  private errorHandler: DatabaseErrorHandler;

  /**
   * 私有构造函数，确保单例模式
   */
  private constructor() {
    this.errorHandler = new DatabaseErrorHandler();
    this.setupExitHandlers();
    this.setupCleanupHandlers();
  }

  /**
   * 获取数据库管理器实例
   */
  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  /**
   * 获取数据库连接
   */
  public getDatabase(): Database.Database {
    if (!this.isConnected || !this.db) {
      throw new Error('数据库未连接，请先调用 connect() 方法');
    }
    return this.db;
  }

  /**
   * 连接到数据库
   */
  public connect(): void {
    if (this.isConnected) {
      console.log('数据库已经连接');
      return;
    }

    try {
      // 确保userData目录存在
      const userDataPath = app.getPath('userData');
      if (!fs.existsSync(userDataPath)) {
        fs.mkdirSync(userDataPath, { recursive: true });
      }

      // 数据库文件路径
      const dbPath = path.join(userDataPath, 'pet-data.sqlite');

      // 创建数据库连接
      this.db = new Database(dbPath, {
        readonly: false,
        fileMustExist: false,
        timeout: 10000, // 10秒超时
        verbose: process.env.NODE_ENV === 'development' ? console.log : undefined
      });

      // 配置数据库性能参数
      this.configureDatabase();

      // 执行Schema
      this.executeSchema();

      this.isConnected = true;
      this.retryCount = 0;
      console.log('✅ 数据库连接成功:', dbPath);

    } catch (error) {
      this.isConnected = false;
      this.handleError('数据库连接失败', error as Error);

      // 重试逻辑
      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        console.log(`🔄 数据库连接重试 ${this.retryCount}/${this.maxRetries}`);
        setTimeout(() => this.connect(), 2000 * this.retryCount);
      } else {
        console.error('❌ 数据库连接失败，已达到最大重试次数');
        throw error;
      }
    }
  }

  /**
   * 配置数据库性能参数
   */
  private configureDatabase(): void {
    if (!this.db) return;

    try {
      // 启用WAL模式提升并发性能
      this.db.pragma('journal_mode = WAL');

      // 同步模式设置
      this.db.pragma('synchronous = NORMAL');

      // 缓存大小 (64KB)
      this.db.pragma('cache_size = -64000');

      // 外键约束
      this.db.pragma('foreign_keys = ON');

      // 编码设置
      this.db.pragma('encoding = "UTF-8"');

      // 忙时超时设置
      this.db.pragma('busy_timeout = 10000');

      console.log('🔧 数据库配置完成');

    } catch (error) {
      this.handleError('数据库配置失败', error as Error);
    }
  }

  /**
   * 执行数据库Schema
   */
  private executeSchema(): void {
    if (!this.db) return;

    try {
      // 读取Schema文件
      const schemaPath = path.join(__dirname, 'schema.sql');
      if (fs.existsSync(schemaPath)) {
        const schema = fs.readFileSync(schemaPath, 'utf8');
        this.db.exec(schema);
        console.log('📋 数据库Schema执行完成');
      } else {
        console.warn('⚠️ Schema文件不存在:', schemaPath);
      }

    } catch (error) {
      this.handleError('Schema执行失败', error as Error);
    }
  }

  /**
   * 检查数据库连接状态
   */
  public isConnectedToDatabase(): boolean {
    return this.isConnected && this.db !== null && this.db.open;
  }

  /**
   * 执行事务
   */
  public transaction<T>(callback: (db: Database.Database) => T): T {
    const db = this.getDatabase();
    return db.transaction(callback)();
  }

  /**
   * 执行查询
   */
  public query(sql: string, params: any[] = [], useCache: boolean = true): any[] {
    const startTime = performance.now();

    // 尝试从缓存获取
    if (useCache) {
      const cachedResult = queryCache.get(sql, params);
      if (cachedResult) {
        performanceMonitor.recordQuery('query-cache', startTime, true);
        return cachedResult;
      }
    }

    const db = this.getDatabase();
    try {
      const stmt = db.prepare(sql);
      const result = stmt.all(params);

      // 缓存结果（SELECT查询才缓存）
      if (useCache && sql.trim().toUpperCase().startsWith('SELECT')) {
        queryCache.set(sql, params, result);
      }

      performanceMonitor.recordQuery('query', startTime, true);
      return result;
    } catch (error) {
      performanceMonitor.recordQuery('query', startTime, false, error as Error);
      this.errorHandler.handleError(`查询执行失败: ${sql}`, error as Error);
      throw error;
    }
  }

  /**
   * 执行单条查询
   */
  public queryOne(sql: string, params: any[] = [], useCache: boolean = true): any {
    const startTime = performance.now();

    // 尝试从缓存获取
    if (useCache) {
      const cachedResult = queryCache.get(sql, params);
      if (cachedResult) {
        performanceMonitor.recordQuery('queryOne-cache', startTime, true);
        return cachedResult;
      }
    }

    const db = this.getDatabase();
    try {
      const stmt = db.prepare(sql);
      const result = stmt.get(params);

      // 缓存结果（SELECT查询才缓存）
      if (useCache && sql.trim().toUpperCase().startsWith('SELECT')) {
        queryCache.set(sql, params, result);
      }

      performanceMonitor.recordQuery('queryOne', startTime, true);
      return result;
    } catch (error) {
      performanceMonitor.recordQuery('queryOne', startTime, false, error as Error);
      this.errorHandler.handleError(`单条查询失败: ${sql}`, error as Error);
      throw error;
    }
  }

  /**
   * 执行插入/更新/删除
   */
  public execute(sql: string, params: any[] = []): Database.RunResult {
    const startTime = performance.now();
    const db = this.getDatabase();

    // 解析SQL以确定需要失效的缓存表
    const tables = this.extractTablesFromSQL(sql);

    try {
      const stmt = db.prepare(sql);
      const result = stmt.run(params);

      // 失效相关表的缓存
      tables.forEach(table => {
        queryCache.invalidateOnTableChange(table);
      });

      performanceMonitor.recordQuery('execute', startTime, true);
      return result;
    } catch (error) {
      performanceMonitor.recordQuery('execute', startTime, false, error as Error);
      this.errorHandler.handleError(`执行失败: ${sql}`, error as Error);
      throw error;
    }
  }

  /**
   * 从SQL中提取表名
   */
  private extractTablesFromSQL(sql: string): string[] {
    const tables: string[] = [];
    const normalizedSQL = sql.trim().toUpperCase();

    // 简单的表名提取（基于常见SQL模式）
    const patterns = [
      /INSERT\s+INTO\s+(\w+)/i,
      /UPDATE\s+(\w+)/i,
      /DELETE\s+FROM\s+(\w+)/i,
      /CREATE\s+TABLE\s+(\w+)/i,
      /DROP\s+TABLE\s+(\w+)/i,
      /ALTER\s+TABLE\s+(\w+)/i
    ];

    for (const pattern of patterns) {
      const match = normalizedSQL.match(pattern);
      if (match) {
        tables.push(match[1].toLowerCase());
      }
    }

    return [...new Set(tables)]; // 去重
  }

  /**
   * 批量执行
   */
  public batchExecute(sql: string, paramsList: any[][]): Database.RunResult[] {
    const db = this.getDatabase();
    try {
      const stmt = db.prepare(sql);
      const transaction = db.transaction((params: any[][]) => {
        return params.map(param => stmt.run(param));
      });
      return transaction(paramsList);
    } catch (error) {
      this.errorHandler.handleError(`批量执行失败: ${sql}`, error as Error);
      throw error;
    }
  }

  /**
   * 获取数据库统计信息
   */
  public getStats(): DatabaseStats {
    const db = this.getDatabase();
    const stats = db.pragma('cache_size', { simple: true });

    return {
      connected: this.isConnected,
      open: db.open,
      inTransaction: db.inTransaction,
      memory: db.memory,
      readonly: db.readonly,
      name: db.name,
      cacheSize: stats,
      retryCount: this.retryCount
    };
  }

  /**
   * 获取缓存统计信息
   */
  public getCacheStats() {
    return queryCache.getStats();
  }

  /**
   * 清空查询缓存
   */
  public clearCache(): void {
    queryCache.clear();
  }

  /**
   * 预热查询缓存
   */
  public async warmUpCache(): Promise<void> {
    await queryCache.warmUp();
  }

  /**
   * 更新缓存配置
   */
  public updateCacheConfig(config: { defaultTTL?: number; maxSize?: number; enableStats?: boolean }): void {
    queryCache.updateConfig(config);
  }

  /**
   * 获取索引信息
   */
  public getIndexes() {
    return indexManager.getAllIndexes();
  }

  /**
   * 获取索引统计信息
   */
  public getIndexStats() {
    return indexManager.getIndexStats();
  }

  /**
   * 分析查询性能
   */
  public analyzeQuery(sql: string) {
    return indexManager.analyzeQueryPerformance(sql);
  }

  /**
   * 创建索引
   */
  public createIndex(indexName: string, tableName: string, columns: string[], options?: { unique?: boolean; where?: string }) {
    return indexManager.createIndex(indexName, tableName, columns, options);
  }

  /**
   * 删除索引
   */
  public dropIndex(indexName: string) {
    return indexManager.dropIndex(indexName);
  }

  /**
   * 重建索引
   */
  public rebuildIndex(indexName?: string) {
    if (indexName) {
      return indexManager.rebuildIndex(indexName);
    } else {
      return indexManager.rebuildAllIndexes();
    }
  }

  /**
   * 获取索引使用报告
   */
  public getIndexUsageReport() {
    return indexManager.getIndexUsageReport();
  }

  /**
   * 优化索引策略
   */
  public optimizeIndexes() {
    return indexManager.optimizeIndexStrategy();
  }

  /**
   * 执行WAL检查点
   */
  public checkpoint(): void {
    const db = this.getDatabase();
    try {
      db.pragma('wal_checkpoint(RESTART)');
      console.log('🔄 WAL检查点执行完成');
    } catch (error) {
      this.errorHandler.handleError('WAL检查点执行失败', error as Error);
    }
  }

  /**
   * 备份数据库
   */
  public backup(backupPath: string): Promise<void> {
    const db = this.getDatabase();
    return new Promise((resolve, reject) => {
      db.backup(backupPath, {
        progress: (info) => {
          const progress = ((info.totalPages - info.remainingPages) / info.totalPages * 100).toFixed(1);
          console.log(`📊 数据库备份进度: ${progress}%`);
        }
      }).then(() => {
        console.log('✅ 数据库备份完成:', backupPath);
        resolve();
      }).catch((error) => {
        this.errorHandler.handleError('数据库备份失败', error);
        reject(error);
      });
    });
  }

  /**
   * 关闭数据库连接
   */
  public close(): void {
    if (this.db && this.db.open) {
      try {
        // 执行最后的WAL检查点
        this.checkpoint();

        // 关闭连接
        this.db.close();
        this.isConnected = false;
        console.log('🔒 数据库连接已关闭');

      } catch (error) {
        this.errorHandler.handleError('关闭数据库连接失败', error as Error);
      }
    }
  }

  /**
   * 统一错误处理方法
   */
  private handleError(context: string, error: Error): void {
    this.errorHandler.handleError(context, error);
    this.logErrorMetric(context, error);
  }

  /**
   * 记录错误指标
   */
  private logErrorMetric(context: string, error: Error): void {
    // 这里可以添加性能监控逻辑
    const errorInfo = {
      context,
      error: error.name,
      message: error.message,
      timestamp: new Date().toISOString(),
      connected: this.isConnected
    };

    // 在开发环境下输出详细信息
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 错误指标:', errorInfo);
    }
  }

  /**
   * 设置退出处理器
   */
  private setupExitHandlers(): void {
    const cleanup = () => {
      console.log('🧹 应用退出，清理数据库连接...');
      this.close();
      process.exit(0);
    };

    // 监听进程退出事件
    process.on('exit', cleanup);
    process.on('SIGHUP', () => process.exit(128 + 1));
    process.on('SIGINT', () => process.exit(128 + 2));
    process.on('SIGTERM', () => process.exit(128 + 15));

    // 开发环境下的未捕获异常处理
    if (process.env.NODE_ENV === 'development') {
      process.on('uncaughtException', (error) => {
        console.error('🚨 未捕获的异常:', error);
        cleanup();
      });

      process.on('unhandledRejection', (reason, promise) => {
        console.error('🚨 未处理的Promise拒绝:', reason);
        cleanup();
      });
    }
  }

  /**
   * 设置清理处理器
   */
  private setupCleanupHandlers(): void {
    // 监听进程信号
    process.on('SIGINT', () => this.cleanup());
    process.on('SIGTERM', () => this.cleanup());

    // 监听异常退出
    process.on('uncaughtException', () => this.cleanup());
    process.on('unhandledRejection', () => this.cleanup());
  }

  /**
   * 清理资源
   */
  private cleanup(): void {
    try {
      if (this.db && this.db.open) {
        this.db.close();
        console.log('🔒 数据库连接已清理');
      }
    } catch (error) {
      console.error('❌ 清理数据库连接失败:', error);
    }
  }
}

/**
 * 数据库统计信息接口
 */
export interface DatabaseStats {
  connected: boolean;
  open: boolean;
  inTransaction: boolean;
  memory: boolean;
  readonly: boolean;
  name: string;
  cacheSize: number;
  retryCount: number;
}

/**
 * 导出单例实例
 */
export const databaseManager = DatabaseManager.getInstance();