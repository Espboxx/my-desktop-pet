import fs from 'fs';
import path from 'path';
import { app } from 'electron';

/**
 * 数据库错误处理器
 * 提供统一的错误处理和日志记录功能
 */
export class DatabaseErrorHandler {
  private logFilePath: string;
  private maxLogFileSize = 10 * 1024 * 1024; // 10MB
  private maxLogFiles = 5;

  private isErrorInfoRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }

  constructor() {
    // 确保userData目录存在
    const userDataPath = app.getPath('userData');
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true });
    }

    // 日志文件路径
    this.logFilePath = path.join(userDataPath, 'database-errors.log');
  }

  /**
   * 处理数据库错误
   */
  public handleError(context: string, error: Error): void {
    const errorInfo = {
      timestamp: new Date().toISOString(),
      context,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      database: {
        connected: this.isDatabaseConnected(),
        file: this.getDatabaseFilePath()
      }
    };

    // 记录到控制台
    console.error(`🚨 数据库错误 [${context}]:`, error);

    // 记录到日志文件
    this.writeToLog(errorInfo);

    // 根据错误类型进行特殊处理
    this.handleSpecificError(error);
  }

  /**
   * 写入日志文件
   */
  private writeToLog(errorInfo: Record<string, unknown>): void {
    try {
      // 检查日志文件大小，进行轮转
      this.rotateLogFileIfNeeded();

      // 写入错误日志
      const logLine = JSON.stringify(errorInfo) + '\n';
      fs.appendFileSync(this.logFilePath, logLine, 'utf8');

    } catch (logError) {
      console.error('🚨 写入错误日志失败:', logError);
    }
  }

  /**
   * 轮转日志文件
   */
  private rotateLogFileIfNeeded(): void {
    try {
      if (fs.existsSync(this.logFilePath)) {
        const stats = fs.statSync(this.logFilePath);
        if (stats.size > this.maxLogFileSize) {
          // 轮转日志文件
          for (let i = this.maxLogFiles - 1; i > 0; i--) {
            const oldFile = `${this.logFilePath}.${i}`;
            const newFile = `${this.logFilePath}.${i + 1}`;

            if (fs.existsSync(oldFile)) {
              fs.renameSync(oldFile, newFile);
            }
          }

          // 重命名当前日志文件
          fs.renameSync(this.logFilePath, `${this.logFilePath}.1`);
        }
      }
    } catch (error) {
      console.error('🚨 日志文件轮转失败:', error);
    }
  }

  /**
   * 处理特定类型的错误
   */
  private handleSpecificError(error: Error): void {
    const errorMessage = error.message.toLowerCase();

    // 数据库锁定错误
    if (errorMessage.includes('database is locked') ||
        errorMessage.includes('sqlite_busy')) {
      console.log('🔒 数据库锁定，等待重试...');
      this.scheduleRetry();
    }

    // 磁盘空间不足
    if (errorMessage.includes('disk i/o error') ||
        errorMessage.includes('no space left on device')) {
      console.error('💾 磁盘空间不足，请清理磁盘空间');
      this.handleDiskSpaceError();
    }

    // 权限错误
    if (errorMessage.includes('permission denied') ||
        errorMessage.includes('unable to open database file')) {
      console.error('🔐 数据库文件权限问题');
      this.handlePermissionError();
    }

    // 数据库损坏
    if (errorMessage.includes('database disk image is malformed')) {
      console.error('🗄️ 数据库文件损坏');
      this.handleCorruptionError();
    }
  }

  /**
   * 调度重试
   */
  private scheduleRetry(): void {
    // 这里可以添加重试逻辑
    // 由于数据库管理器已经实现了重试，这里主要用于通知
  }

  /**
   * 处理磁盘空间错误
   */
  private handleDiskSpaceError(): void {
    // 清理临时文件
    this.cleanupTempFiles();

    // 发送通知给用户
    this.notifyUser('磁盘空间不足', '请清理磁盘空间以继续使用应用');
  }

  /**
   * 处理权限错误
   */
  private handlePermissionError(): void {
    // 尝试修复权限
    try {
      const dbPath = this.getDatabaseFilePath();
      if (dbPath && fs.existsSync(dbPath)) {
        fs.chmodSync(dbPath, 0o666);
      }
    } catch (error) {
      console.error('修复权限失败:', error);
    }
  }

  /**
   * 处理数据库损坏错误
   */
  private handleCorruptionError(): void {
    // 尝试从备份恢复
    this.restoreFromBackup();
  }

  /**
   * 清理临时文件
   */
  private cleanupTempFiles(): void {
    try {
      const userDataPath = app.getPath('userData');
      const tempFiles = fs.readdirSync(userDataPath)
        .filter(file => file.startsWith('temp-') || file.endsWith('.tmp'));

      tempFiles.forEach(file => {
        const filePath = path.join(userDataPath, file);
        try {
          fs.unlinkSync(filePath);
          console.log(`🧹 清理临时文件: ${file}`);
        } catch (error) {
          console.error(`清理临时文件失败 ${file}:`, error);
        }
      });
    } catch (error) {
      console.error('清理临时文件失败:', error);
    }
  }

  /**
   * 从备份恢复
   */
  private restoreFromBackup(): void {
    try {
      const userDataPath = app.getPath('userData');
      const mainDb = path.join(userDataPath, 'pet-data.sqlite');
      const backupDb = path.join(userDataPath, 'pet-data.sqlite.bak');

      if (fs.existsSync(backupDb)) {
        // 删除损坏的数据库
        if (fs.existsSync(mainDb)) {
          fs.unlinkSync(mainDb);
        }

        // 从备份恢复
        fs.copyFileSync(backupDb, mainDb);
        console.log('✅ 数据库从备份恢复成功');

        this.notifyUser('数据库恢复', '数据库已从备份恢复，请重启应用');
      } else {
        console.error('🚨 备份文件不存在，无法恢复数据库');
        this.notifyUser('数据库错误', '数据库损坏且无备份，请重新安装应用');
      }
    } catch (error) {
      console.error('数据库恢复失败:', error);
    }
  }

  /**
   * 通知用户
   */
  private notifyUser(title: string, message: string): void {
    // 这里可以添加系统通知或UI通知
    console.log(`📢 用户通知: ${title} - ${message}`);
  }

  /**
   * 检查数据库连接状态
   */
  private isDatabaseConnected(): boolean {
    try {
      // 这里需要访问数据库管理器，但由于依赖关系，简化处理
      return false;
    } catch {
      return false;
    }
  }

  /**
   * 获取数据库文件路径
   */
  private getDatabaseFilePath(): string {
    try {
      return path.join(app.getPath('userData'), 'pet-data.sqlite');
    } catch {
      return '';
    }
  }

  /**
   * 获取错误日志
   */
  public getErrorLogs(limit: number = 100): Array<Record<string, unknown>> {
    try {
      if (!fs.existsSync(this.logFilePath)) {
        return [];
      }

      const content = fs.readFileSync(this.logFilePath, 'utf8');
      const lines = content.trim().split('\n').filter(line => line.length > 0);

      // 返回最后的N条日志
      return lines
        .slice(-limit)
        .map(line => {
          try {
            return JSON.parse(line) as Record<string, unknown>;
          } catch {
            return { timestamp: new Date().toISOString(), raw: line };
          }
        });

    } catch (error) {
      console.error('读取错误日志失败:', error);
      return [];
    }
  }

  /**
   * 清理错误日志
   */
  public clearErrorLogs(): void {
    try {
      if (fs.existsSync(this.logFilePath)) {
        fs.unlinkSync(this.logFilePath);
        console.log('🧹 错误日志已清理');
      }
    } catch (error) {
      console.error('清理错误日志失败:', error);
    }
  }

  /**
   * 获取错误统计
   */
  public getErrorStats(): ErrorStats {
    try {
      const logs = this.getErrorLogs(1000);
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const recentErrors = logs.filter(log => {
        const timestamp = typeof log.timestamp === 'string' ? log.timestamp : new Date().toISOString();
        const logTime = new Date(timestamp);
        return logTime > oneHourAgo;
      });

      const todayErrors = logs.filter(log => {
        const timestamp = typeof log.timestamp === 'string' ? log.timestamp : new Date().toISOString();
        const logTime = new Date(timestamp);
        return logTime > oneDayAgo;
      });

       const errorTypes = logs.reduce<Record<string, number>>((acc, log) => {
         const errorField = this.isErrorInfoRecord(log.error) ? log.error : undefined;
         const errorType = typeof errorField?.name === 'string' ? errorField.name : 'Unknown';
         acc[errorType] = (acc[errorType] || 0) + 1;
         return acc;
       }, {});

      return {
        totalErrors: logs.length,
        recentErrors: recentErrors.length,
        todayErrors: todayErrors.length,
        errorTypes,
        lastError: logs[logs.length - 1] || null
      };

    } catch (error) {
      console.error('获取错误统计失败:', error);
      return {
        totalErrors: 0,
        recentErrors: 0,
        todayErrors: 0,
        errorTypes: {},
        lastError: null
      };
    }
  }
}

/**
 * 错误统计信息接口
 */
export interface ErrorStats {
  totalErrors: number;
  recentErrors: number;
  todayErrors: number;
  errorTypes: Record<string, number>;
  lastError: Record<string, unknown> | null;
}
