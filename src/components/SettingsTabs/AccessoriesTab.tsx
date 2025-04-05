import React from 'react';
import { ACCESSORY_OPTIONS, PET_OPTIONS } from '../../constants/settingsConstants';
import useSettings from '../../hooks/useSettings';

const AccessoriesTab: React.FC = () => {
  const { settings, updateSetting } = useSettings();
  const selectedPet = PET_OPTIONS.find(pet => pet.id === settings.petType) || PET_OPTIONS[0];
  const selectedAccessory = settings.accessory 
    ? ACCESSORY_OPTIONS.find(acc => acc.id === settings.accessory) 
    : null;

  return (
    <div className="settings-section">
      <h3>饰品</h3>
      <div className="selection-section-layout">
        <div className="live-preview">
          <div 
            className="preview-pet" 
            style={{
              backgroundColor: selectedPet.color,
              borderColor: selectedPet.borderColor
            }}
          >
            {selectedAccessory && (
              <span className="preview-accessory">{selectedAccessory.emoji}</span>
            )}
          </div>
          <div className="preview-name">{selectedPet.name}</div>
        </div>
        
        <div className="selection-grid-container">
          <div className="selection-grid">
            {ACCESSORY_OPTIONS.map(accessory => (
              <div 
                key={accessory.id}
                className={`grid-item ${settings.accessory === accessory.id ? 'selected' : ''}`}
                onClick={() => updateSetting('accessory', accessory.id)}
              >
                <span className="item-preview">{accessory.emoji}</span>
                <span className="item-name">{accessory.name}</span>
              </div>
            ))}
            <div className="grid-item get-more">
              <span className="item-preview">+</span>
              <span className="item-name">获取更多</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccessoriesTab;