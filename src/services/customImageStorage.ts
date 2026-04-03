/**
 * 用户自定义图像本地存储管理服务
 */

export interface CustomImageData {
  id: string;
  petTypeId: string;
  expressionKey: string;
  dataUrl: string;
  filename: string;
  uploadDate: number;
  size: number;
}

type CustomImageDataLike = Partial<CustomImageData>;

export interface CustomImageStorage {
  images: CustomImageData[];
  version: number;
}

class CustomImageStorageManager {
  private readonly STORAGE_KEY = 'pet-custom-images';
  private readonly VERSION = 1;
  private readonly MAX_STORAGE_SIZE = 50 * 1024 * 1024; // 50MB

  /**
   * 获取所有自定义图像
   */
  getAllImages(): CustomImageData[] {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      if (!data) return [];

      const storage: CustomImageStorage = JSON.parse(data);
      return storage.images || [];
    } catch (error) {
      console.error('Failed to load custom images:', error);
      return [];
    }
  }

  /**
   * 获取特定宠物类型的图像
   */
  getImagesByPetType(petTypeId: string): CustomImageData[] {
    return this.getAllImages().filter(img => img.petTypeId === petTypeId);
  }

  /**
   * 获取特定表情的图像
   */
  getImageByExpression(petTypeId: string, expressionKey: string): CustomImageData | null {
    const images = this.getAllImages();
    return images.find(img => 
      img.petTypeId === petTypeId && img.expressionKey === expressionKey
    ) || null;
  }

  /**
   * 保存自定义图像
   */
  saveImage(
    petTypeId: string,
    expressionKey: string,
    dataUrl: string,
    filename: string
  ): { success: boolean; error?: string; id?: string } {
    try {
      // 检查存储空间
      const currentSize = this.getStorageSize();
      const imageSize = this.estimateDataUrlSize(dataUrl);
      
      if (currentSize + imageSize > this.MAX_STORAGE_SIZE) {
        return {
          success: false,
          error: '存储空间不足。请删除一些图像后重试。'
        };
      }

      const images = this.getAllImages();
      const id = this.generateId();
      
      // 检查是否已存在相同的图像配置
      const existingIndex = images.findIndex(img => 
        img.petTypeId === petTypeId && img.expressionKey === expressionKey
      );

      const newImage: CustomImageData = {
        id,
        petTypeId,
        expressionKey,
        dataUrl,
        filename,
        uploadDate: Date.now(),
        size: imageSize
      };

      if (existingIndex >= 0) {
        // 替换现有图像
        images[existingIndex] = newImage;
      } else {
        // 添加新图像
        images.push(newImage);
      }

      this.saveToStorage(images);
      return { success: true, id };
    } catch (error) {
      console.error('Failed to save custom image:', error);
      return {
        success: false,
        error: '保存图像失败'
      };
    }
  }

  /**
   * 删除自定义图像
   */
  deleteImage(id: string): boolean {
    try {
      const images = this.getAllImages();
      const filteredImages = images.filter(img => img.id !== id);
      
      if (filteredImages.length === images.length) {
        return false; // 没有找到要删除的图像
      }

      this.saveToStorage(filteredImages);
      return true;
    } catch (error) {
      console.error('Failed to delete custom image:', error);
      return false;
    }
  }

  /**
   * 删除特定宠物类型的所有图像
   */
  deleteImagesByPetType(petTypeId: string): number {
    try {
      const images = this.getAllImages();
      const filteredImages = images.filter(img => img.petTypeId !== petTypeId);
      const deletedCount = images.length - filteredImages.length;
      
      this.saveToStorage(filteredImages);
      return deletedCount;
    } catch (error) {
      console.error('Failed to delete images by pet type:', error);
      return 0;
    }
  }

  /**
   * 清空所有自定义图像
   */
  clearAllImages(): boolean {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      return true;
    } catch (error) {
      console.error('Failed to clear custom images:', error);
      return false;
    }
  }

  /**
   * 获取存储统计信息
   */
  getStorageStats(): {
    totalImages: number;
    totalSize: number;
    maxSize: number;
    usagePercentage: number;
  } {
    const images = this.getAllImages();
    const totalSize = this.getStorageSize();
    
    return {
      totalImages: images.length,
      totalSize,
      maxSize: this.MAX_STORAGE_SIZE,
      usagePercentage: (totalSize / this.MAX_STORAGE_SIZE) * 100
    };
  }

  /**
   * 导出所有自定义图像数据
   */
  exportData(): string {
    const storage: CustomImageStorage = {
      images: this.getAllImages(),
      version: this.VERSION
    };
    return JSON.stringify(storage, null, 2);
  }

  /**
   * 导入自定义图像数据
   */
  importData(jsonData: string): { success: boolean; error?: string; imported?: number } {
    try {
      const storage: CustomImageStorage = JSON.parse(jsonData);
      
      if (!storage.images || !Array.isArray(storage.images)) {
        return {
          success: false,
          error: '无效的数据格式'
        };
      }

      // 验证数据结构
      for (const image of storage.images) {
        if (!this.validateImageData(image)) {
          return {
            success: false,
            error: '数据包含无效的图像信息'
          };
        }
      }

      this.saveToStorage(storage.images);
      return {
        success: true,
        imported: storage.images.length
      };
    } catch (error) {
      console.error('Failed to import custom images:', error);
      return {
        success: false,
        error: '导入数据失败'
      };
    }
  }

  // 私有方法

  private saveToStorage(images: CustomImageData[]): void {
    const storage: CustomImageStorage = {
      images,
      version: this.VERSION
    };
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(storage));
  }

  private getStorageSize(): number {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? new Blob([data]).size : 0;
    } catch {
      return 0;
    }
  }

  private estimateDataUrlSize(dataUrl: string): number {
    return new Blob([dataUrl]).size;
  }

  private generateId(): string {
    return `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private validateImageData(image: CustomImageDataLike): boolean {
    return (
      typeof image.id === 'string' &&
      typeof image.petTypeId === 'string' &&
      typeof image.expressionKey === 'string' &&
      typeof image.dataUrl === 'string' &&
      typeof image.filename === 'string' &&
      typeof image.uploadDate === 'number' &&
      typeof image.size === 'number' &&
      image.dataUrl.startsWith('data:image/')
    );
  }
}

// 创建单例实例
export const customImageStorage = new CustomImageStorageManager();

export default customImageStorage;
