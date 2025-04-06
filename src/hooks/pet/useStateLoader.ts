import { useState, useEffect } from 'react';
import { PetStatus, SavedPetData } from '../../types/petTypes';
import { PetPosition } from '../interaction/types';
import { PET_TYPES } from '../../constants/petConstants';
import { defaultInitialStatus } from './constants';

/**
 * 宠物状态加载hook
 * 处理从存储中加载宠物状态、类型和位置
 */
export function useStateLoader() {
  const [status, setStatus] = useState<PetStatus>(defaultInitialStatus);
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentPetTypeId, setCurrentPetTypeId] = useState<string>('default');
  const [initialPosition, setInitialPosition] = useState<PetPosition | null>(null);

  // 加载初始状态
  useEffect(() => {
    const loadState = async () => {
      let loadedSuccessfully = false;
      try {
        if (window.desktopPet && typeof window.desktopPet.getPetState === 'function') {
          // 假设getPetState现在返回SavedPetData | null
          // 显式类型savedData以帮助TypeScript
          const savedData: SavedPetData | null = await window.desktopPet.getPetState();
          console.log('从文件加载数据:', savedData);

          if (savedData && typeof savedData === 'object') {
            // 加载状态
            if (savedData.status && typeof savedData.status === 'object' && 'mood' in savedData.status) {
              // 将加载的状态与默认值合并
              // 确保库存被加载或使用默认值
              const loadedStatus = {
                ...defaultInitialStatus,
                ...savedData.status,
                inventory: savedData.status.inventory && typeof savedData.status.inventory === 'object' ? savedData.status.inventory : {}
              };
              setStatus(loadedStatus);
              console.log('状态加载成功:', savedData.status);
            } else {
              console.log('加载的状态无效或缺失，使用默认状态。');
              setStatus(defaultInitialStatus);
            }

            // 加载宠物类型ID
            if (savedData.petTypeId && typeof savedData.petTypeId === 'string') {
              // 验证加载的petTypeId是否存在于PET_TYPES中
              // 如果PET_TYPES已经导入，则不需要动态导入
              if (PET_TYPES[savedData.petTypeId]) {
                setCurrentPetTypeId(savedData.petTypeId);
                console.log('宠物类型ID加载成功:', savedData.petTypeId);
              } else {
                console.warn(`加载的宠物类型ID "${savedData.petTypeId}" 无效，使用默认值 'default'。`);
                setCurrentPetTypeId('default');
              }
            } else {
              console.log('未找到宠物类型ID或类型无效，使用默认值 \'default\'。');
              setCurrentPetTypeId('default'); // 如果petTypeId缺失或无效则回退
            }
            // 加载位置（可选）
            if (savedData.position && typeof savedData.position === 'object' && 'x' in savedData.position && 'y' in savedData.position) {
                // 基本验证：确保坐标是数字
                if (typeof savedData.position.x === 'number' && typeof savedData.position.y === 'number') {
                    setInitialPosition(savedData.position); // 设置加载的位置
                    console.log('宠物位置加载成功:', savedData.position);
                } else {
                    console.warn('加载的位置坐标无效，将使用默认居中位置。');
                    setInitialPosition(null); // 表示应使用默认值
                }
            } else {
                console.log('未找到保存的位置数据，将使用默认居中位置。');
                setInitialPosition(null); // 表示应使用默认值
            }

            loadedSuccessfully = true; // 如果获取到任何有效的数据对象则标记为成功
          } else {
            console.log('未找到保存的数据或数据无效，使用默认值。');
            setStatus(defaultInitialStatus);
            setCurrentPetTypeId('default');
            setInitialPosition(null); // 使用默认位置
          }
        } else {
          console.warn('window.desktopPet.getPetState 不可用，使用默认值。');
          setStatus(defaultInitialStatus);
          setCurrentPetTypeId('default');
          setInitialPosition(null); // 使用默认位置
        }
      } catch (error) {
        console.error('加载宠物状态失败:', error);
      } finally {
        // 确保在加载完全失败时设置默认值
        if (!loadedSuccessfully) {
          setStatus(defaultInitialStatus);
          setCurrentPetTypeId('default');
          setInitialPosition(null); // 使用默认位置
        }
        setIsLoaded(true); // 标记加载完成
      }
    };
    loadState();
  }, []); // 在组件挂载时运行一次

  return {
    status,
    setStatus,
    isLoaded,
    currentPetTypeId,
    setCurrentPetTypeId,
    initialPosition
  };
}