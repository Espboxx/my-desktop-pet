/**
 * 兼容性检查服务
 * 确保应用在各种环境下都能正常运行
 */

import { PetType } from '../types/petTypes';
import imageResourceManager from './imageResourceManager';

export interface CompatibilityReport {
  imageSupport: boolean;
  webpSupport: boolean;
  localStorageSupport: boolean;
  fileApiSupport: boolean;
  dragDropSupport: boolean;
  recommendations: string[];
  fallbacksNeeded: string[];
}

class CompatibilityChecker {
  private cachedReport: CompatibilityReport | null = null;

  /**
   * 检查浏览器兼容性
   */
  async checkCompatibility(): Promise<CompatibilityReport> {
    if (this.cachedReport) {
      return this.cachedReport;
    }

    const report: CompatibilityReport = {
      imageSupport: this.checkImageSupport(),
      webpSupport: await this.checkWebPSupport(),
      localStorageSupport: this.checkLocalStorageSupport(),
      fileApiSupport: this.checkFileApiSupport(),
      dragDropSupport: this.checkDragDropSupport(),
      recommendations: [],
      fallbacksNeeded: []
    };

    // 生成建议和回退需求
    this.generateRecommendations(report);

    this.cachedReport = report;
    return report;
  }

  /**
   * 检查图像支持
   */
  private checkImageSupport(): boolean {
    try {
      const img = new Image();
      return typeof img.onload === 'object' || typeof img.onload === 'function';
    } catch {
      return false;
    }
  }

  /**
   * 检查WebP支持
   */
  private async checkWebPSupport(): Promise<boolean> {
    return new Promise((resolve) => {
      const webP = new Image();
      webP.onload = webP.onerror = () => {
        resolve(webP.height === 2);
      };
      webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
    });
  }

  /**
   * 检查本地存储支持
   */
  private checkLocalStorageSupport(): boolean {
    try {
      const test = '__localStorage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 检查文件API支持
   */
  private checkFileApiSupport(): boolean {
    return !!(window.File && window.FileReader && window.FileList && window.Blob);
  }

  /**
   * 检查拖拽支持
   */
  private checkDragDropSupport(): boolean {
    const div = document.createElement('div');
    return ('draggable' in div) || ('ondragstart' in div && 'ondrop' in div);
  }

  /**
   * 生成建议和回退需求
   */
  private generateRecommendations(report: CompatibilityReport): void {
    if (!report.imageSupport) {
      report.fallbacksNeeded.push('emoji');
      report.recommendations.push('您的浏览器不支持图像显示，将使用emoji作为回退');
    }

    if (!report.webpSupport) {
      report.recommendations.push('您的浏览器不支持WebP格式，建议使用PNG或JPG格式的图像');
    }

    if (!report.localStorageSupport) {
      report.fallbacksNeeded.push('memory-storage');
      report.recommendations.push('您的浏览器不支持本地存储，自定义设置将在页面刷新后丢失');
    }

    if (!report.fileApiSupport) {
      report.fallbacksNeeded.push('no-file-upload');
      report.recommendations.push('您的浏览器不支持文件上传，无法导入自定义图像');
    }

    if (!report.dragDropSupport) {
      report.recommendations.push('您的浏览器不支持拖拽功能，请使用点击方式选择文件');
    }
  }

  /**
   * 检查宠物类型兼容性
   */
  async checkPetTypeCompatibility(petType: PetType): Promise<{
    compatible: boolean;
    issues: string[];
    fallbackAvailable: boolean;
  }> {
    const issues: string[] = [];
    let compatible = true;
    let fallbackAvailable = true;

    // 检查模型类型支持
    switch (petType.modelType) {
      case 'image':
        if (!this.checkImageSupport()) {
          compatible = false;
          issues.push('浏览器不支持图像显示');
        }
        break;
      case 'svg':
        // SVG支持检查
        if (!document.createElementNS) {
          compatible = false;
          issues.push('浏览器不支持SVG');
        }
        break;
    }

    // 检查表情是否有emoji回退
    for (const [key, expression] of Object.entries(petType.expressions)) {
      if (!expression.emoji) {
        fallbackAvailable = false;
        issues.push(`表情 ${key} 缺少emoji回退`);
      }
    }

    return {
      compatible,
      issues,
      fallbackAvailable
    };
  }

  /**
   * 自动修复宠物类型兼容性
   */
  autoFixPetType(petType: PetType): PetType {
    const fixedPetType = { ...petType };

    // 如果不支持图像，强制使用emoji模式
    if (!this.checkImageSupport() && petType.modelType === 'image') {
      fixedPetType.modelType = 'emoji';
    }

    // 确保所有表情都有emoji回退
    for (const [key, expression] of Object.entries(fixedPetType.expressions)) {
      if (!expression.emoji) {
        fixedPetType.expressions[key] = {
          ...expression,
          emoji: '❓' // 默认回退emoji
        };
      }
    }

    return fixedPetType;
  }

  /**
   * 检查图像资源可用性
   */
  async checkImageResourceAvailability(petType: PetType): Promise<{
    available: number;
    total: number;
    missing: string[];
  }> {
    const missing: string[] = [];
    let available = 0;
    let total = 0;

    if (petType.modelType === 'image') {
      // 检查基础图像
      if (petType.baseImageUrl) {
        total++;
        const loaded = await imageResourceManager.preloadImage(petType.baseImageUrl);
        if (loaded) {
          available++;
        } else {
          missing.push('base');
        }
      }

      // 检查表情图像
      for (const [key, expression] of Object.entries(petType.expressions)) {
        if (expression.imageUrl) {
          total++;
          const loaded = await imageResourceManager.preloadImage(expression.imageUrl);
          if (loaded) {
            available++;
          } else {
            missing.push(key);
          }
        }
      }
    }

    return {
      available,
      total,
      missing
    };
  }

  /**
   * 获取性能建议
   */
  getPerformanceRecommendations(): string[] {
    const recommendations: string[] = [];

    // 检查设备性能
    if (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4) {
      recommendations.push('检测到设备性能较低，建议使用较小的图像尺寸');
    }

    // 检查网络状况
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      if (connection && connection.effectiveType && 
          ['slow-2g', '2g', '3g'].includes(connection.effectiveType)) {
        recommendations.push('检测到网络较慢，建议使用压缩图像或emoji模式');
      }
    }

    // 检查内存使用
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      if (memory && memory.usedJSHeapSize > memory.jsHeapSizeLimit * 0.8) {
        recommendations.push('内存使用较高，建议清理图像缓存');
      }
    }

    return recommendations;
  }

  /**
   * 重置缓存
   */
  resetCache(): void {
    this.cachedReport = null;
  }
}

// 创建单例实例
export const compatibilityChecker = new CompatibilityChecker();

export default compatibilityChecker;
