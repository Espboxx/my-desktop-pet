import { useState, useEffect, useCallback } from "react";
import imageResourceManager from "@/services/imageResourceManager";

export interface UseImageResourceResult {
  imageUrl: string | null;
  isLoading: boolean;
  hasError: boolean;
  reload: () => void;
}

/**
 * 用于加载和管理宠物图像资源的Hook
 */
export function useImageResource(
  petTypeId: string,
  expressionKey?: string,
): UseImageResourceResult {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const loadImage = useCallback(async () => {
    setIsLoading(true);
    setHasError(false);

    try {
      const url = await imageResourceManager.getImageUrl(
        petTypeId,
        expressionKey,
      );
      setImageUrl(url);
      setHasError(url === null);
    } catch (error) {
      console.error("Failed to load image:", error);
      setImageUrl(null);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, [petTypeId, expressionKey]);

  const reload = useCallback(() => {
    loadImage();
  }, [loadImage]);

  useEffect(() => {
    loadImage();
  }, [loadImage]);

  return {
    imageUrl,
    isLoading,
    hasError,
    reload,
  };
}

/**
 * 用于预加载宠物图像集的Hook
 */
export function usePetImagePreloader(
  petTypeId: string,
  expressionKeys: string[],
) {
  const [isPreloading, setIsPreloading] = useState(false);
  const [preloadProgress, setPreloadProgress] = useState(0);

  const preloadImages = useCallback(async () => {
    setIsPreloading(true);
    setPreloadProgress(0);

    try {
      await imageResourceManager.preloadPetImages(petTypeId, expressionKeys);
      setPreloadProgress(100);
    } catch (error) {
      console.error("Failed to preload images:", error);
    } finally {
      setIsPreloading(false);
    }
  }, [petTypeId, expressionKeys]);

  useEffect(() => {
    preloadImages();
  }, [preloadImages]);

  return {
    isPreloading,
    preloadProgress,
  };
}

/**
 * 用于管理用户自定义图像的Hook
 */
export function useCustomImageManager() {
  const [customImages, setCustomImages] = useState<string[]>([]);

  const validateAndProcessFile = useCallback(
    async (
      file: File,
    ): Promise<{
      success: boolean;
      dataUrl?: string;
      error?: string;
    }> => {
      // 验证文件
      const validation = imageResourceManager.validateImageFile(file);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error,
        };
      }

      try {
        // 转换为Data URL
        const dataUrl = await imageResourceManager.fileToDataUrl(file);
        return {
          success: true,
          dataUrl,
        };
      } catch (error) {
        return {
          success: false,
          error: "文件处理失败",
        };
      }
    },
    [],
  );

  const addCustomImage = useCallback((dataUrl: string, filename: string) => {
    // 这里可以添加将图像保存到本地存储的逻辑
    void filename;
    setCustomImages((prev) => [...prev, dataUrl]);
  }, []);

  const removeCustomImage = useCallback((index: number) => {
    setCustomImages((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const clearCustomImages = useCallback(() => {
    setCustomImages([]);
  }, []);

  return {
    customImages,
    validateAndProcessFile,
    addCustomImage,
    removeCustomImage,
    clearCustomImages,
  };
}
