import { useCallback } from 'react';
import { PetStatus } from '../../types/petTypes';
import { ITEMS as predefinedItems } from '../../constants/itemData';

/**
 * 物品管理hook
 * 处理物品的添加和移除
 */
export function useInventory(
  setStatus: React.Dispatch<React.SetStateAction<PetStatus>>
) {
  // 添加道具到库存
  const addItem = useCallback((itemId: string, quantity: number = 1) => {
    if (!predefinedItems[itemId]) {
      console.warn(`Attempted to add unknown item: ${itemId}`);
      return;
    }
    setStatus(prev => {
      const newInventory = { ...prev.inventory };
      newInventory[itemId] = (newInventory[itemId] || 0) + quantity;
      console.log(`Added ${quantity}x ${itemId}. New count: ${newInventory[itemId]}`);
      return { ...prev, inventory: newInventory };
    });
  }, [setStatus]); // 依赖: setStatus (稳定)

  // 从库存移除道具
  const removeItem = useCallback((itemId: string, quantity: number = 1) => {
    let actuallyRemoved = 0;
    setStatus(prev => {
      const newInventory = { ...prev.inventory };
      const currentQuantity = newInventory[itemId] || 0;

      if (currentQuantity <= 0) {
        console.warn(`Attempted to remove item not in inventory: ${itemId}`);
        return prev; // 不变
      }

      actuallyRemoved = Math.min(quantity, currentQuantity);
      newInventory[itemId] = currentQuantity - actuallyRemoved;

      if (newInventory[itemId] <= 0) {
        delete newInventory[itemId]; // 如果数量为零或更少，则移除项目
      }
      console.log(`Removed ${actuallyRemoved}x ${itemId}. Remaining: ${newInventory[itemId] || 0}`);
      return { ...prev, inventory: newInventory };
    });
    return actuallyRemoved > 0; // 如果成功移除了物品则返回true
  }, [setStatus]); // 依赖: setStatus (稳定)

  return { 
    addItem,
    removeItem
  };
}