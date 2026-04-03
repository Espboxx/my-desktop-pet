import { databaseManager } from './DatabaseManager';
import { DatabaseErrorHandler } from './ErrorHandler';

interface ConnectionTestRow {
  test: number;
}

/**
 * 性能监控数据接口
 */
export interface PerformanceMetrics {
  queryTime: number;
  memoryUsage: NodeJS.MemoryUsage;
  timestamp: string;
  operation: string;
  success: boolean;
  error?: string;
}

/**
 * 健康检查结果接口
 */
export interface HealthCheckResult {
  status: 'healthy' | 'warning' | 'critical';
  checks: {
    connection: boolean;
    performance: boolean;
    memory: boolean;
    diskSpace: boolean;
    walSize: boolean;
  };
  metrics: {
    avgQueryTime: number;
    memoryUsage: number;
    walFileSize: number;
    connectionCount: number;
  };
  recommendations: string[];
  timestamp: string;
}

/**
 * 性能监控和健康检查服务
 */
export class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private maxMetricsCount = 1000;
  private errorHandler: DatabaseErrorHandler;
  private queryTimes: number[] = [];
  private maxQueryTimes = 100;

  constructor() {
    this.errorHandler = new DatabaseErrorHandler();
    this.startPeriodicChecks();
  }

  /**
   * 记录查询性能指标
   */
  public recordQuery(operation: string, startTime: number, success: boolean = true, error?: Error): void {
    const queryTime = performance.now() - startTime;
    const metrics: PerformanceMetrics = {
      queryTime,
      memoryUsage: process.memoryUsage(),
      timestamp: new Date().toISOString(),
      operation,
      success,
      error: error?.message
    };

    this.metrics.push(metrics);
    this.queryTimes.push(queryTime);

    // 保持数组大小限制
    if (this.metrics.length > this.maxMetricsCount) {
      this.metrics = this.metrics.slice(-this.maxMetricsCount);
    }

    if (this.queryTimes.length > this.maxQueryTimes) {
      this.queryTimes = this.queryTimes.slice(-this.maxQueryTimes);
    }

    // 记录慢查询
    if (queryTime > 100) { // 超过100ms的查询
      console.warn(`⚠️ 慢查询检测: ${operation} 耗时 ${queryTime.toFixed(2)}ms`);
      this.errorHandler.handleError(`慢查询检测: ${operation}`, error || new Error(`Query took ${queryTime.toFixed(2)}ms`));
    }
  }

  /**
   * 获取性能统计
   */
  public getPerformanceStats(): {
    avgQueryTime: number;
    maxQueryTime: number;
    minQueryTime: number;
    totalQueries: number;
    errorRate: number;
    memoryUsage: NodeJS.MemoryUsage;
    recentMetrics: PerformanceMetrics[];
  } {
    const recentMetrics = this.metrics.slice(-100); // 最近100条记录
    const totalQueries = recentMetrics.length;
    const errorCount = recentMetrics.filter(m => !m.success).length;

    const queryTimes = recentMetrics.map(m => m.queryTime);
    const avgQueryTime = queryTimes.reduce((sum, time) => sum + time, 0) / totalQueries || 0;
    const maxQueryTime = Math.max(...queryTimes, 0);
    const minQueryTime = Math.min(...queryTimes, 0);
    const errorRate = totalQueries > 0 ? (errorCount / totalQueries) * 100 : 0;

    return {
      avgQueryTime,
      maxQueryTime,
      minQueryTime,
      totalQueries,
      errorRate,
      memoryUsage: process.memoryUsage(),
      recentMetrics
    };
  }

  /**
   * 执行健康检查
   */
  public async performHealthCheck(): Promise<HealthCheckResult> {
    const result: HealthCheckResult = {
      status: 'healthy',
      checks: {
        connection: false,
        performance: false,
        memory: false,
        diskSpace: false,
        walSize: false
      },
      metrics: {
        avgQueryTime: 0,
        memoryUsage: 0,
        walFileSize: 0,
        connectionCount: 0
      },
      recommendations: [],
      timestamp: new Date().toISOString()
    };

    try {
      // 1. 检查数据库连接
      result.checks.connection = this.checkDatabaseConnection();

      // 2. 检查性能指标
      result.checks.performance = this.checkPerformance();

      // 3. 检查内存使用
      result.checks.memory = this.checkMemoryUsage();

      // 4. 检查磁盘空间
      result.checks.diskSpace = await this.checkDiskSpace();

      // 5. 检查WAL文件大小
      result.checks.walSize = await this.checkWalFileSize();

      // 计算综合指标
      result.metrics = this.calculateMetrics();

      // 确定整体状态
      result.status = this.determineOverallStatus(result.checks);

      // 生成建议
      result.recommendations = this.generateRecommendations(result);

    } catch (error) {
      result.status = 'critical';
      result.recommendations.push('健康检查执行失败: ' + (error as Error).message);
      this.errorHandler.handleError('健康检查失败', error as Error);
    }

    return result;
  }

  /**
   * 检查数据库连接
   */
  private checkDatabaseConnection(): boolean {
    try {
      const db = databaseManager.getDatabase();
      const result = db.prepare<[], ConnectionTestRow>('SELECT 1 as test').get();
      return result?.test === 1;
    } catch (error) {
      this.errorHandler.handleError('数据库连接检查失败', error as Error);
      return false;
    }
  }

  /**
   * 检查性能指标
   */
  private checkPerformance(): boolean {
    const stats = this.getPerformanceStats();
    return stats.avgQueryTime < 50 && stats.errorRate < 5; // 平均查询时间小于50ms，错误率小于5%
  }

  /**
   * 检查内存使用
   */
  private checkMemoryUsage(): boolean {
    const memory = process.memoryUsage();
    const memoryUsageMB = memory.heapUsed / 1024 / 1024;
    return memoryUsageMB < 500; // 内存使用小于500MB
  }

  /**
   * 检查磁盘空间
   */
  private async checkDiskSpace(): Promise<boolean> {
    try {
      const fs = await import('fs');
      const app = await import('electron').then(m => m.app);

      const userDataPath = app.getPath('userData');
      const stats = fs.statfsSync(userDataPath);
      const freeSpaceGB = stats.bfree * stats.bsize / 1024 / 1024 / 1024;
      return freeSpaceGB > 1; // 剩余空间大于1GB
    } catch (error) {
      this.errorHandler.handleError('磁盘空间检查失败', error as Error);
      return true; // 如果检查失败，假设是健康的
    }
  }

  /**
   * 检查WAL文件大小
   */
  private async checkWalFileSize(): Promise<boolean> {
    try {
      const fs = await import('fs');
      const path = await import('path');
      const app = await import('electron').then(m => m.app);

      const userDataPath = app.getPath('userData');
      const walPath = path.join(userDataPath, 'pet-data.sqlite-wal');

      if (fs.existsSync(walPath)) {
        const stats = fs.statSync(walPath);
        const walSizeMB = stats.size / 1024 / 1024;
        return walSizeMB < 100; // WAL文件小于100MB
      }
      return true;
    } catch (error) {
      this.errorHandler.handleError('WAL文件检查失败', error as Error);
      return true;
    }
  }

  /**
   * 计算综合指标
   */
  private calculateMetrics() {
    const stats = this.getPerformanceStats();
    const memory = process.memoryUsage();

    return {
      avgQueryTime: stats.avgQueryTime,
      memoryUsage: memory.heapUsed / 1024 / 1024, // MB
      walFileSize: 0, // 将在检查中更新
      connectionCount: 1 // 当前为单连接
    };
  }

  /**
   * 确定整体状态
   */
  private determineOverallStatus(checks: HealthCheckResult['checks']): HealthCheckResult['status'] {
    const failedChecks = Object.values(checks).filter(check => !check).length;

    if (failedChecks === 0) {
      return 'healthy';
    } else if (failedChecks <= 2) {
      return 'warning';
    } else {
      return 'critical';
    }
  }

  /**
   * 生成优化建议
   */
  private generateRecommendations(result: HealthCheckResult): string[] {
    const recommendations: string[] = [];

    if (!result.checks.connection) {
      recommendations.push('检查数据库连接配置');
    }

    if (!result.checks.performance) {
      recommendations.push('优化数据库查询，考虑添加索引');
    }

    if (!result.checks.memory) {
      recommendations.push('内存使用过高，考虑优化数据结构或增加清理机制');
    }

    if (!result.checks.diskSpace) {
      recommendations.push('磁盘空间不足，清理旧文件或增加存储空间');
    }

    if (!result.checks.walSize) {
      recommendations.push('WAL文件过大，执行WAL检查点');
    }

    if (result.metrics.avgQueryTime > 20) {
      recommendations.push('平均查询时间较长，考虑优化数据库索引');
    }

    if (result.metrics.memoryUsage > 300) {
      recommendations.push('内存使用较高，考虑实现缓存清理机制');
    }

    return recommendations;
  }

  /**
   * 启动定期检查
   */
  private startPeriodicChecks(): void {
    // 每5分钟执行一次健康检查
    setInterval(async () => {
      const healthResult = await this.performHealthCheck();

      if (healthResult.status === 'critical') {
        console.error('🚨 数据库健康检查失败:', healthResult.recommendations);
      } else if (healthResult.status === 'warning') {
        console.warn('⚠️ 数据库健康检查警告:', healthResult.recommendations);
      } else {
        console.log('✅ 数据库健康检查通过');
      }
    }, 5 * 60 * 1000); // 5分钟
  }

  /**
   * 获取最近的错误日志
   */
  public getRecentErrors(count: number = 10): PerformanceMetrics[] {
    return this.metrics
      .filter(m => !m.success)
      .slice(-count);
  }

  /**
   * 清理旧的指标数据
   */
  public cleanupOldData(olderThanDays: number = 7): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    this.metrics = this.metrics.filter(m => new Date(m.timestamp) > cutoffDate);
    this.queryTimes = this.queryTimes.slice(-this.maxQueryTimes);
  }

  /**
   * 导出性能报告
   */
  public exportPerformanceReport(): string {
    const stats = this.getPerformanceStats();
    const recentErrors = this.getRecentErrors(5);

    return JSON.stringify({
      timestamp: new Date().toISOString(),
      stats,
      recentErrors,
      totalMetrics: this.metrics.length,
      timeRange: {
        start: this.metrics[0]?.timestamp,
        end: this.metrics[this.metrics.length - 1]?.timestamp
      }
    }, null, 2);
  }
}

/**
 * 性能监控装饰器
 */
export function monitorPerformance(target: unknown, propertyName: string, descriptor: PropertyDescriptor) {
  void target;
  const method = descriptor.value;
  const performanceMonitor = new PerformanceMonitor();

  descriptor.value = async function (...args: unknown[]) {
    const startTime = performance.now();
    let success = true;
    let error: Error | undefined;

    try {
      const result = await method.apply(this, args);
      return result;
    } catch (err) {
      success = false;
      error = err as Error;
      throw err;
    } finally {
      performanceMonitor.recordQuery(propertyName, startTime, success, error);
    }
  };

  return descriptor;
}

/**
 * 导出性能监控服务实例
 */
export const performanceMonitor = new PerformanceMonitor();
