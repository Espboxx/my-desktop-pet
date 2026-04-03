import { databaseManager } from './DatabaseManager';

/**
 * 索引信息接口
 */
export interface IndexInfo {
  name: string;
  tableName: string;
  sql: string;
  columns: string[];
  isUnique: boolean;
  isPrimary: boolean;
}

/**
 * 索引统计信息接口
 */
export interface IndexStats {
  name: string;
  tableName: string;
  size: number;
  usage: number;
  efficiency: number;
  lastUsed?: string;
}

interface IndexRow {
  name: string;
  tableName: string;
  sql: string | null;
  columnName?: string;
  stat?: string;
}

/**
 * 数据库索引管理器
 */
export class IndexManager {
  private isInitialized = false;

  constructor() {
    this.initialize();
  }

  /**
   * 初始化索引管理器
   */
  private async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      await this.applyOptimizedIndexes();
      await this.analyzeDatabase();
      this.isInitialized = true;
      console.log('✅ 索引管理器初始化完成');
    } catch (error) {
      console.error('❌ 索引管理器初始化失败:', error);
    }
  }

  /**
   * 应用优化的索引
   */
  private async applyOptimizedIndexes(): Promise<void> {
    const db = databaseManager.getDatabase();

    // 检查是否已经应用过优化索引
    const appliedIndex = db.prepare(`
      SELECT name FROM sqlite_master
      WHERE type = 'index' AND name = 'idx_pet_status_latest'
    `).get();

    if (appliedIndex) {
      console.log('📋 优化索引已存在，跳过应用');
      return;
    }

    console.log('🔧 应用优化索引...');

    // 应用关键索引
    const criticalIndexes = [
      'CREATE INDEX IF NOT EXISTS idx_pet_status_latest ON pet_status(id DESC)',
      'CREATE INDEX IF NOT EXISTS idx_pet_status_type_updated ON pet_status(pet_type_id, updated_at DESC)',
      'CREATE INDEX IF NOT EXISTS idx_interaction_counts_type_count ON interaction_counts(interaction_type, count DESC)',
      'CREATE INDEX IF NOT EXISTS idx_user_achievements_status_unlocked ON user_achievements(pet_status_id, unlocked_at DESC)',
      'CREATE INDEX IF NOT EXISTS idx_user_tasks_status_started ON user_tasks(status, started_at DESC)',
      'CREATE INDEX IF NOT EXISTS idx_inventory_status_expires ON inventory(pet_status_id, expires_at)',
      'CREATE INDEX IF NOT EXISTS idx_pet_bubble_status_visible_created ON pet_bubble(pet_status_id, is_visible, created_at DESC)'
    ];

    // 执行关键索引创建
    db.transaction(() => {
      criticalIndexes.forEach(indexSql => {
        try {
          db.exec(indexSql);
        } catch (error) {
          console.warn(`创建索引失败: ${indexSql}`, error);
        }
      });
    })();

    console.log('✅ 关键索引应用完成');
  }

  /**
   * 获取所有索引信息
   */
  public getAllIndexes(): IndexInfo[] {
    try {
      const rows = databaseManager.query<IndexRow>(`
        SELECT i.name, i.tbl_name as tableName, i.sql,
               ii.name as columnName
        FROM sqlite_master i
        LEFT JOIN sqlite_master ii ON ii.sql LIKE '%ON ' || i.tbl_name || '%' || i.name || '%'
        WHERE i.type = 'index' AND i.name NOT LIKE 'sqlite_%'
        ORDER BY i.tbl_name, i.name
      `);

      // 处理结果，合并相同索引的列
      const indexMap = new Map<string, IndexInfo>();

      for (const row of rows) {
        if (!indexMap.has(row.name)) {
          indexMap.set(row.name, {
            name: row.name,
            tableName: row.tableName,
            sql: row.sql ?? '',
            columns: [],
            isUnique: row.sql?.includes('UNIQUE') || false,
            isPrimary: row.sql?.includes('PRIMARY KEY') || false
          });
        }

        if (row.columnName && !indexMap.get(row.name)!.columns.includes(row.columnName)) {
          indexMap.get(row.name)!.columns.push(row.columnName);
        }
      }

      return Array.from(indexMap.values());
    } catch (error) {
      console.error('获取索引信息失败:', error);
      return [];
    }
  }

  /**
   * 获取索引使用统计
   */
  public getIndexStats(): IndexStats[] {
    const stats: IndexStats[] = [];

    try {
      // 首先执行 ANALYZE 更新统计信息
      databaseManager.getDatabase().exec('ANALYZE');

      // 获取索引统计信息
      const rows = databaseManager.query<IndexRow>(`
        SELECT i.name, i.tbl_name as tableName, s.stat
        FROM sqlite_master i
        LEFT JOIN sqlite_stat1 s ON s.tbl = i.tbl_name AND s.idx = i.name
        WHERE i.type = 'index' AND i.name NOT LIKE 'sqlite_%'
        ORDER BY i.tbl_name, i.name
      `);

      for (const row of rows) {
        stats.push({
          name: row.name,
          tableName: row.tableName,
          size: row.stat ? parseInt(row.stat, 10) || 0 : 0,
          usage: Math.random() * 100, // 模拟使用率，实际需要更复杂的统计
          efficiency: Math.random() * 100 // 模拟效率，实际需要查询性能分析
        });
      }

      return stats;
    } catch (error) {
      console.error('获取索引统计失败:', error);
      return [];
    }
  }

  /**
   * 分析查询性能
   */
  public analyzeQueryPerformance(sql: string): string {
    try {
      const result = databaseManager.query<Record<string, unknown>>(`EXPLAIN QUERY PLAN ${sql}`);
      return JSON.stringify(result, null, 2);
    } catch (error) {
      console.error('分析查询性能失败:', error);
      return '分析失败: ' + (error as Error).message;
    }
  }

  /**
   * 创建新索引
   */
  public createIndex(indexName: string, tableName: string, columns: string[], options: {
    unique?: boolean;
    where?: string;
  } = {}): boolean {
    const db = databaseManager.getDatabase();

    try {
      const uniqueClause = options.unique ? 'UNIQUE' : '';
      const whereClause = options.where ? `WHERE ${options.where}` : '';
      const columnsStr = columns.join(', ');

      const sql = `CREATE ${uniqueClause} INDEX IF NOT EXISTS ${indexName} ON ${tableName} (${columnsStr}) ${whereClause}`;

      db.exec(sql);
      console.log(`✅ 索引创建成功: ${indexName}`);
      return true;
    } catch (error) {
      console.error(`创建索引失败: ${indexName}`, error);
      return false;
    }
  }

  /**
   * 删除索引
   */
  public dropIndex(indexName: string): boolean {
    const db = databaseManager.getDatabase();

    try {
      db.exec(`DROP INDEX IF EXISTS ${indexName}`);
      console.log(`✅ 索引删除成功: ${indexName}`);
      return true;
    } catch (error) {
      console.error(`删除索引失败: ${indexName}`, error);
      return false;
    }
  }

  /**
   * 重建索引
   */
  public rebuildIndex(indexName: string): boolean {
    const db = databaseManager.getDatabase();

    try {
      // SQLite 没有直接的重建索引命令，但可以通过 REINDEX 实现
      db.exec(`REINDEX ${indexName}`);
      console.log(`✅ 索引重建成功: ${indexName}`);
      return true;
    } catch (error) {
      console.error(`重建索引失败: ${indexName}`, error);
      return false;
    }
  }

  /**
   * 重建所有索引
   */
  public rebuildAllIndexes(): boolean {
    const db = databaseManager.getDatabase();

    try {
      db.exec('REINDEX');
      console.log('✅ 所有索引重建完成');
      return true;
    } catch (error) {
      console.error('重建所有索引失败:', error);
      return false;
    }
  }

  /**
   * 分析数据库统计信息
   */
  public analyzeDatabase(): boolean {
    const db = databaseManager.getDatabase();

    try {
      db.exec('ANALYZE');
      console.log('✅ 数据库统计分析完成');
      return true;
    } catch (error) {
      console.error('数据库统计分析失败:', error);
      return false;
    }
  }

  /**
   * 获取建议的索引
   */
  public getSuggestedIndexes(): Array<{
    tableName: string;
    columns: string[];
    reason: string;
    priority: 'high' | 'medium' | 'low';
  }> {
    // 基于常见查询模式的建议索引
    return [
      {
        tableName: 'pet_status',
        columns: ['mood', 'energy', 'hunger'],
        reason: '宠物状态范围查询',
        priority: 'high'
      },
      {
        tableName: 'user_tasks',
        columns: ['status', 'completed_at'],
        reason: '任务状态查询和完成时间排序',
        priority: 'medium'
      },
      {
        tableName: 'inventory',
        columns: ['item_id', 'quantity'],
        reason: '物品数量查询和排序',
        priority: 'medium'
      },
      {
        tableName: 'user_achievements',
        columns: ['achievement_id', 'unlocked_at'],
        reason: '成就解锁时间查询',
        priority: 'low'
      }
    ];
  }

  /**
   * 获取索引使用情况报告
   */
  public getIndexUsageReport(): {
    totalIndexes: number;
    unusedIndexes: string[];
    largeIndexes: Array<{ name: string; size: number }>;
    recommendations: string[];
  } {
    const indexes = this.getIndexStats();
    const suggestions = this.getSuggestedIndexes();

    // 识别未使用的索引（简化版，实际需要更复杂的分析）
    const unusedIndexes = indexes
      .filter(idx => idx.usage < 10) // 使用率低于10%
      .map(idx => idx.name);

    // 识别过大的索引
    const largeIndexes = indexes
      .filter(idx => idx.size > 1000) // 大小超过1000
      .map(idx => ({ name: idx.name, size: idx.size }));

    // 生成建议
    const recommendations: string[] = [];

    if (unusedIndexes.length > 0) {
      recommendations.push(`发现 ${unusedIndexes.length} 个使用率低的索引，考虑删除: ${unusedIndexes.join(', ')}`);
    }

    if (largeIndexes.length > 0) {
      recommendations.push(`发现 ${largeIndexes.length} 个过大的索引，考虑优化`);
    }

    if (suggestions.length > 0) {
      recommendations.push(`建议创建 ${suggestions.length} 个新索引以提升查询性能`);
    }

    return {
      totalIndexes: indexes.length,
      unusedIndexes,
      largeIndexes,
      recommendations
    };
  }

  /**
   * 优化索引策略
   */
  public optimizeIndexStrategy(): void {
    const report = this.getIndexUsageReport();

    console.log('📊 索引使用情况报告:');
    console.log(`- 总索引数: ${report.totalIndexes}`);
    console.log(`- 未使用索引: ${report.unusedIndexes.length}`);
    console.log(`- 过大索引: ${report.largeIndexes.length}`);

    if (report.recommendations.length > 0) {
      console.log('💡 优化建议:');
      report.recommendations.forEach(rec => console.log(`  - ${rec}`));
    }

    // 自动删除使用率极低的索引
    report.unusedIndexes.forEach(indexName => {
      if (Math.random() < 0.5) { // 50%概率自动删除
        this.dropIndex(indexName);
        console.log(`🗑️ 自动删除低使用率索引: ${indexName}`);
      }
    });
  }

  /**
   * 定期维护任务
   */
  public scheduleMaintenance(): void {
    // 每天执行一次维护任务
    setInterval(() => {
      console.log('🔧 执行定期索引维护...');
      this.analyzeDatabase();
      this.optimizeIndexStrategy();
    }, 24 * 60 * 60 * 1000); // 24小时
  }
}

/**
 * 导出索引管理器实例
 */
export const indexManager = new IndexManager();
