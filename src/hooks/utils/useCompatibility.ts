import { useState, useEffect, useCallback } from 'react';
import { compatibilityChecker, CompatibilityReport } from '@/services/compatibilityChecker';
import { PetType } from '@/types/petTypes';

/**
 * 兼容性检查Hook
 */
export function useCompatibility() {
  const [report, setReport] = useState<CompatibilityReport | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const checkCompatibility = useCallback(async () => {
    setIsChecking(true);
    try {
      const compatibilityReport = await compatibilityChecker.checkCompatibility();
      setReport(compatibilityReport);
    } catch (error) {
      console.error('Failed to check compatibility:', error);
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    checkCompatibility();
  }, [checkCompatibility]);

  return {
    report,
    isChecking,
    recheckCompatibility: checkCompatibility
  };
}

/**
 * 宠物类型兼容性检查Hook
 */
export function usePetTypeCompatibility(petType: PetType | null) {
  const [compatibility, setCompatibility] = useState<{
    compatible: boolean;
    issues: string[];
    fallbackAvailable: boolean;
    fixedPetType?: PetType;
  } | null>(null);

  const checkPetTypeCompatibility = useCallback(async (pet: PetType) => {
    try {
      const result = await compatibilityChecker.checkPetTypeCompatibility(pet);
      const fixedPetType = compatibilityChecker.autoFixPetType(pet);
      
      setCompatibility({
        ...result,
        fixedPetType
      });
    } catch (error) {
      console.error('Failed to check pet type compatibility:', error);
      setCompatibility({
        compatible: false,
        issues: ['兼容性检查失败'],
        fallbackAvailable: false,
        fixedPetType: pet
      });
    }
  }, []);

  useEffect(() => {
    if (petType) {
      checkPetTypeCompatibility(petType);
    }
  }, [petType, checkPetTypeCompatibility]);

  return compatibility;
}

/**
 * 图像资源可用性检查Hook
 */
export function useImageResourceAvailability(petType: PetType | null) {
  const [availability, setAvailability] = useState<{
    available: number;
    total: number;
    missing: string[];
    percentage: number;
  } | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const checkAvailability = useCallback(async (pet: PetType) => {
    setIsChecking(true);
    try {
      const result = await compatibilityChecker.checkImageResourceAvailability(pet);
      setAvailability({
        ...result,
        percentage: result.total > 0 ? (result.available / result.total) * 100 : 100
      });
    } catch (error) {
      console.error('Failed to check image resource availability:', error);
      setAvailability({
        available: 0,
        total: 0,
        missing: [],
        percentage: 0
      });
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    if (petType && petType.modelType === 'image') {
      checkAvailability(petType);
    } else {
      setAvailability(null);
    }
  }, [petType, checkAvailability]);

  return {
    availability,
    isChecking,
    recheckAvailability: petType ? () => checkAvailability(petType) : undefined
  };
}

/**
 * 性能监控Hook
 */
export function usePerformanceMonitoring() {
  const [recommendations, setRecommendations] = useState<string[]>([]);

  const updateRecommendations = useCallback(() => {
    const newRecommendations = compatibilityChecker.getPerformanceRecommendations();
    setRecommendations(newRecommendations);
  }, []);

  useEffect(() => {
    updateRecommendations();
    
    // 定期更新性能建议
    const interval = setInterval(updateRecommendations, 30000); // 每30秒检查一次
    
    return () => clearInterval(interval);
  }, [updateRecommendations]);

  return {
    recommendations,
    updateRecommendations
  };
}

/**
 * 自动回退Hook
 */
export function useAutoFallback(petType: PetType | null) {
  const [shouldUseFallback, setShouldUseFallback] = useState(false);
  const [fallbackReason, setFallbackReason] = useState<string>('');

  const compatibility = usePetTypeCompatibility(petType);
  const { availability } = useImageResourceAvailability(petType);

  useEffect(() => {
    if (!petType) {
      setShouldUseFallback(false);
      setFallbackReason('');
      return;
    }

    // 检查是否需要回退
    let needsFallback = false;
    let reason = '';

    // 兼容性问题
    if (compatibility && !compatibility.compatible) {
      needsFallback = true;
      reason = '浏览器兼容性问题';
    }

    // 图像资源不可用
    if (availability && availability.percentage < 50) {
      needsFallback = true;
      reason = reason ? `${reason}，图像资源不足` : '图像资源不足';
    }

    // 性能问题
    if (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 2) {
      needsFallback = true;
      reason = reason ? `${reason}，设备性能限制` : '设备性能限制';
    }

    setShouldUseFallback(needsFallback);
    setFallbackReason(reason);
  }, [compatibility, availability, petType]);

  return {
    shouldUseFallback,
    fallbackReason,
    fallbackPetType: compatibility?.fixedPetType
  };
}
