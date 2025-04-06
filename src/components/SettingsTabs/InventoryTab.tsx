import React from 'react';
import { useSharedPetStatus } from '../../context/PetStatusContext';
import { ITEMS as predefinedItems } from '../../constants/itemData'; // Import predefined item details
import '../../styles/InventoryTab.css'; // Create this CSS file later

const InventoryTab: React.FC = () => {
  const { status } = useSharedPetStatus();
  const inventory = status.inventory || {}; // Get inventory from status, default to empty object

  const inventoryItems = Object.entries(inventory)
    .map(([itemId, quantity]) => {
      const itemDetails = predefinedItems[itemId];
      if (!itemDetails || quantity <= 0) {
        return null; // Skip if item details not found or quantity is zero
      }
      return {
        ...itemDetails,
        quantity,
      };
    })
    .filter(item => item !== null); // Remove null entries

  return (
    <div className="inventory-tab">
      <h2><i className="fas fa-box-open icon"></i> 库存</h2>
      {inventoryItems.length === 0 ? (
        <p className="empty-inventory-message">你的库存是空的。</p>
      ) : (
        <ul className="inventory-list">
          {inventoryItems.map(item => (
            item && ( // Ensure item is not null
              <li key={item.id} className="inventory-item">
                <span className="item-name">{item.name}</span>
                <span className="item-quantity">x {item.quantity}</span>
                <p className="item-description">{item.description}</p>
              </li>
            )
          ))}
        </ul>
      )}
      {/* 可以添加获取道具的提示信息 */}
      <p className="inventory-tip">完成任务可以获得更多道具！</p>
    </div>
  );
};

export default InventoryTab;