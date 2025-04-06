import { useCallback } from 'react';
import { InteractionType, ItemType, PetStatus } from '../../types/petTypes';
import { ITEMS as predefinedItems } from '../../constants/itemData';

/**
 * 宠物互动hook
 * 处理各种类型的互动操作和物品消耗
 */
export function useInteraction(
  setStatus: React.Dispatch<React.SetStateAction<PetStatus>>,
  statusRef: React.MutableRefObject<PetStatus>
) {
  // 互动逻辑
  const interact = useCallback((type: InteractionType, value: number, requiredItemType?: ItemType): boolean => {
    let itemToConsumeId: string | null = null;

    // --- 1. 检查物品可用性 ---
    if (requiredItemType) {
      const inventory = statusRef.current.inventory;
      const availableItems = Object.entries(inventory)
        // 按数量 > 0 和来自predefinedItems的匹配物品类型过滤
        .filter(([itemId, quantity]) => quantity > 0 && predefinedItems[itemId]?.type === requiredItemType);

      if (availableItems.length === 0) {
        console.log(`互动 '${type}' 需要 '${requiredItemType}' 类型的物品，但没有可用的。`);
        return false; // 表示由于缺少物品，互动失败
      }
      itemToConsumeId = availableItems[0][0]; // 选择第一个可用的物品ID
    }

    // --- 2. 检查其他前提条件（例如，能量）---
    let canPerformAction = true;
    let energyCost = 0;
    switch (type) {
      case 'play':
        energyCost = 10; // 玩耍的能量消耗示例
        if (statusRef.current.energy < energyCost) {
          canPerformAction = false;
          console.log("互动 'play' 失败: 能量不足。");
        }
        break;
      // 根据需要添加其他前提条件检查
      // case 'feed': if (statusRef.current.hunger < 5) { canPerformAction = false; ... } break;
    }

    if (!canPerformAction) {
      return false; // 表示由于不满足前提条件，互动失败
    }

    // --- 3. 如果所有检查通过，尝试消耗物品并更新状态 ---
    let consumedSuccessfully = !itemToConsumeId; // 如果不需要物品，则假定成功
    let statusUpdateAttempted = false;

    setStatus(prev => {
      let currentInventory = { ...prev.inventory };
      let currentItemQuantity = 0;

      // 如果需要物品并已识别，则尝试消耗
      if (itemToConsumeId) {
        currentItemQuantity = currentInventory[itemToConsumeId] || 0; // 获取当前数量
        if (currentItemQuantity > 0) {
          const newQuantity = currentItemQuantity - 1;
          if (newQuantity <= 0) {
            delete currentInventory[itemToConsumeId]; // 如果为零则移除
          } else {
            currentInventory[itemToConsumeId] = newQuantity; // 更新数量
          }
          consumedSuccessfully = true;
          console.log(`为互动 '${type}' 消耗了 1x ${itemToConsumeId}。剩余: ${newQuantity}`);
        } else {
          // 物品在检查和消耗之间消失（应该很少见，但防御性处理）
          console.warn(`并发问题？尝试消耗 ${itemToConsumeId} 但数量为 ${currentItemQuantity}`);
          consumedSuccessfully = false;
        }
      }

      // 如果消耗意外失败，中止状态更新
      if (!consumedSuccessfully) {
        statusUpdateAttempted = false;
        return prev;
      }

      // 继续进行状态更新
      statusUpdateAttempted = true;
      const newStatus = { ...prev, inventory: currentInventory }; // 从更新的库存开始
      let baseMoodChange = 0;
      let baseCleanlinessChange = 0;
      let baseHungerChange = 0;
      let baseEnergyChange = -energyCost;
      let baseExpChange = 0;

      switch (type) {
        case 'feed':
          baseHungerChange = -value;
          baseMoodChange = 5;
          baseExpChange = 2;
          break;
        case 'clean':
          baseCleanlinessChange = value;
          baseMoodChange = 3;
          baseExpChange = 1;
          break;
        case 'play':
          baseMoodChange = value;
          baseExpChange = 3;
          break;
        case 'petting':
          baseMoodChange = 15;
          baseEnergyChange += 2;
          baseExpChange = 1;
          break;
        default:
          console.warn(`状态更新中未处理的互动类型: ${type}`);
          break;
      }

      // 应用计算的变化
      newStatus.mood = Math.min(prev.maxMood, Math.max(0, prev.mood + baseMoodChange));
      newStatus.cleanliness = Math.min(prev.maxCleanliness, Math.max(0, prev.cleanliness + baseCleanlinessChange));
      newStatus.hunger = Math.min(prev.maxHunger, Math.max(0, prev.hunger + baseHungerChange));
      newStatus.energy = Math.min(prev.maxEnergy, Math.max(0, prev.energy + baseEnergyChange));
      newStatus.exp = prev.exp + baseExpChange;
      newStatus.interactionCounts[type] = (newStatus.interactionCounts[type] || 0) + 1;

      return newStatus;
    });

    if (statusUpdateAttempted) {
      console.log(`互动: ${type}, 值: ${value}${itemToConsumeId ? `, 消耗: ${itemToConsumeId}` : ''}`);
    }

    // 仅当前提条件通过且消耗（如果需要）成功且尝试了状态更新时返回true
    return consumedSuccessfully && statusUpdateAttempted;

  }, [setStatus, statusRef]); // 依赖

  return { interact };
}