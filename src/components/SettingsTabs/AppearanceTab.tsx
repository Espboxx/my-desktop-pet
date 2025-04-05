import React from 'react';
import useSettings from '../../hooks/useSettings';

const AppearanceTab: React.FC = () => {
  const { settings, updateSetting } = useSettings();

  return (
    <div className="settings-section">
      <h3>外观</h3>
      <div className="setting-item">
        <label htmlFor="pet-size">宠物大小</label>
        <input 
          type="range"
          id="pet-size"
          className="range-slider"
          min="50"
          max="150"
          value={settings.size}
          onChange={(e) => updateSetting('size', parseInt(e.target.value))}
        />
      </div>
      <div className="setting-item">
        <label htmlFor="pet-opacity">透明度</label>
        <input 
          type="range"
          id="pet-opacity"
          className="range-slider"
          min="20"
          max="100"
          value={settings.opacity}
          onChange={(e) => updateSetting('opacity', parseInt(e.target.value))}
        />
      </div>
    </div>
  );
};

export default AppearanceTab;