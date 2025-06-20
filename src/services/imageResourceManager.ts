/**
 * 图像资源管理服务
 * 负责处理宠物图像的加载、验证、缓存和回退机制
 */

export interface ImageResource {
  url: string;
  loaded: boolean;
  error: boolean;
  fallbackUrl?: string;
}

export interface PetImageSet {
  petTypeId: string;
  baseImageUrl?: string;
  expressions: Record<string, string>;
}

class ImageResourceManager {
  private imageCache = new Map<string, ImageResource>();
  private loadingPromises = new Map<string, Promise<boolean>>();
  
  /**
   * 获取宠物图像路径
   */
  getPetImagePath(petTypeId: string, expressionKey?: string): string {
    const basePath = `/src/assets/pets/${petTypeId}`;
    
    if (expressionKey) {
      return `${basePath}/expressions/${expressionKey}.png`;
    }
    
    return `${basePath}/base.png`;
  }

  /**
   * 获取用户自定义图像路径
   */
  getCustomImagePath(filename: string): string {
    return `/src/assets/pets/custom/${filename}`;
  }

  /**
   * 预加载图像
   */
  async preloadImage(url: string): Promise<boolean> {
    // 如果已经在加载中，返回现有的Promise
    if (this.loadingPromises.has(url)) {
      return this.loadingPromises.get(url)!;
    }

    // 如果已经缓存，直接返回结果
    const cached = this.imageCache.get(url);
    if (cached) {
      return cached.loaded && !cached.error;
    }

    // 创建加载Promise
    const loadPromise = new Promise<boolean>((resolve) => {
      const img = new Image();
      
      img.onload = () => {
        this.imageCache.set(url, { url, loaded: true, error: false });
        this.loadingPromises.delete(url);
        resolve(true);
      };
      
      img.onerror = () => {
        this.imageCache.set(url, { url, loaded: false, error: true });
        this.loadingPromises.delete(url);
        resolve(false);
      };
      
      img.src = url;
    });

    this.loadingPromises.set(url, loadPromise);
    return loadPromise;
  }

  /**
   * 批量预加载宠物图像
   */
  async preloadPetImages(petTypeId: string, expressionKeys: string[]): Promise<void> {
    const promises: Promise<boolean>[] = [];
    
    // 预加载基础图像
    const baseImageUrl = this.getPetImagePath(petTypeId);
    promises.push(this.preloadImage(baseImageUrl));
    
    // 预加载所有表情图像
    for (const expressionKey of expressionKeys) {
      const expressionImageUrl = this.getPetImagePath(petTypeId, expressionKey);
      promises.push(this.preloadImage(expressionImageUrl));
    }
    
    await Promise.all(promises);
  }

  /**
   * 获取图像URL，带回退机制（同步版本，用于已缓存的图像）
   */
  getImageUrlSync(petTypeId: string, expressionKey?: string): string | null {
    // 首先尝试获取表情专用图像
    if (expressionKey) {
      const expressionImageUrl = this.getPetImagePath(petTypeId, expressionKey);
      if (this.isImageLoaded(expressionImageUrl)) {
        return expressionImageUrl;
      }
    }

    // 回退到基础图像
    const baseImageUrl = this.getPetImagePath(petTypeId);
    if (this.isImageLoaded(baseImageUrl)) {
      return baseImageUrl;
    }

    // 所有图像都未加载
    return null;
  }

  /**
   * 获取图像URL，带回退机制（异步版本）
   */
  async getImageUrl(petTypeId: string, expressionKey?: string): Promise<string | null> {
    // 首先尝试获取表情专用图像
    if (expressionKey) {
      const expressionImageUrl = this.getPetImagePath(petTypeId, expressionKey);
      const expressionLoaded = await this.preloadImage(expressionImageUrl);

      if (expressionLoaded) {
        return expressionImageUrl;
      }
    }

    // 回退到基础图像
    const baseImageUrl = this.getPetImagePath(petTypeId);
    const baseLoaded = await this.preloadImage(baseImageUrl);

    if (baseLoaded) {
      return baseImageUrl;
    }

    // 所有图像都加载失败
    return null;
  }

  /**
   * 检查图像是否已加载
   */
  isImageLoaded(url: string): boolean {
    const cached = this.imageCache.get(url);
    return cached ? cached.loaded && !cached.error : false;
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.imageCache.clear();
    this.loadingPromises.clear();
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats(): { total: number; loaded: number; failed: number } {
    let loaded = 0;
    let failed = 0;
    
    for (const resource of this.imageCache.values()) {
      if (resource.loaded && !resource.error) {
        loaded++;
      } else if (resource.error) {
        failed++;
      }
    }
    
    return {
      total: this.imageCache.size,
      loaded,
      failed
    };
  }

  /**
   * 验证图像文件格式
   */
  validateImageFile(file: File): { valid: boolean; error?: string } {
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
    const maxSize = 5 * 1024 * 1024; // 5MB
    
    if (!validTypes.includes(file.type)) {
      return {
        valid: false,
        error: '不支持的文件格式。请使用 PNG、JPG、GIF 或 WEBP 格式。'
      };
    }
    
    if (file.size > maxSize) {
      return {
        valid: false,
        error: '文件大小超过限制。请使用小于 5MB 的图像文件。'
      };
    }
    
    return { valid: true };
  }

  /**
   * 将文件转换为Data URL
   */
  async fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.readAsDataURL(file);
    });
  }

  /**
   * 预热缓存 - 预加载所有宠物类型的图像
   */
  async warmupCache(petTypes: Record<string, any>): Promise<void> {
    const promises: Promise<boolean>[] = [];

    for (const [petTypeId, petType] of Object.entries(petTypes)) {
      if (petType.modelType === 'image') {
        // 预加载基础图像
        if (petType.baseImageUrl) {
          promises.push(this.preloadImage(petType.baseImageUrl));
        }

        // 预加载所有表情图像
        for (const [expressionKey, expression] of Object.entries(petType.expressions)) {
          if (expression.imageUrl) {
            promises.push(this.preloadImage(expression.imageUrl));
          }
        }
      }
    }

    // 批量加载，但不等待全部完成
    Promise.allSettled(promises).then(results => {
      const successful = results.filter(r => r.status === 'fulfilled' && r.value).length;
      const total = results.length;
      console.log(`Image cache warmed up: ${successful}/${total} images loaded`);
    });
  }

  /**
   * 智能预加载 - 根据使用频率预加载图像
   */
  async smartPreload(currentPetTypeId: string, petTypes: Record<string, any>): Promise<void> {
    const currentPetType = petTypes[currentPetTypeId];
    if (!currentPetType || currentPetType.modelType !== 'image') return;

    // 高优先级：当前宠物的常用表情
    const highPriorityExpressions = ['normal', 'happy', 'hungry', 'sleepy'];
    const highPriorityPromises: Promise<boolean>[] = [];

    for (const expressionKey of highPriorityExpressions) {
      const expression = currentPetType.expressions[expressionKey];
      if (expression?.imageUrl) {
        highPriorityPromises.push(this.preloadImage(expression.imageUrl));
      }
    }

    // 等待高优先级图像加载完成
    await Promise.allSettled(highPriorityPromises);

    // 低优先级：其他表情和其他宠物类型
    const lowPriorityPromises: Promise<boolean>[] = [];

    // 当前宠物的其他表情
    for (const [expressionKey, expression] of Object.entries(currentPetType.expressions)) {
      if (!highPriorityExpressions.includes(expressionKey) && expression.imageUrl) {
        lowPriorityPromises.push(this.preloadImage(expression.imageUrl));
      }
    }

    // 其他宠物类型的常用表情
    for (const [petTypeId, petType] of Object.entries(petTypes)) {
      if (petTypeId !== currentPetTypeId && petType.modelType === 'image') {
        for (const expressionKey of highPriorityExpressions) {
          const expression = petType.expressions[expressionKey];
          if (expression?.imageUrl) {
            lowPriorityPromises.push(this.preloadImage(expression.imageUrl));
          }
        }
      }
    }

    // 后台加载低优先级图像
    Promise.allSettled(lowPriorityPromises);
  }
}

// 创建单例实例
export const imageResourceManager = new ImageResourceManager();

// 导出类型和实例
export default imageResourceManager;
