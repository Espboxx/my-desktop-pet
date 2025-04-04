import React, { useState, useEffect } from 'react';
import '../styles/SettingsWindow.css';

// 宠物选项接口
interface PetOption {
  id: string;
  name: string;
  color: string;
  borderColor: string;
}

// 饰品选项接口
interface AccessoryOption {
  id: string;
  name: string;
  emoji: string;
}

// 设置接口
interface PetSettings {
  petType: string;
  accessory: string | null;
  alwaysOnTop: boolean;
  soundEnabled: boolean;
  activityLevel: 'calm' | 'normal' | 'playful';
  autoHideFullscreen: boolean;
  launchOnStartup: boolean;
  size: number;
  opacity: number;
}

const PET_OPTIONS: PetOption[] = [
  { id: 'default', name: '默认宠物', color: '#ffcc80', borderColor: '#e65100' },
  { id: 'leafy', name: '小叶子', color: '#a5d6a7', borderColor: '#2e7d32' },
  { id: 'droplet', name: '水滴滴', color: '#90caf9', borderColor: '#1565c0' },
];

const ACCESSORY_OPTIONS: AccessoryOption[] = [
  { id: 'crown', name: '皇冠', emoji: '👑' },
  { id: 'glasses', name: '眼镜', emoji: '👓' },
  { id: 'bowtie', name: '领结', emoji: '🎀' },
  { id: 'cap', name: '帽子', emoji: '🧢' },
];

const SettingsWindow: React.FC = () => {
  // 导航状态
  const [activeTab, setActiveTab] = useState<string>('general');
  
  // 设置状态
  const [settings, setSettings] = useState<PetSettings>({
    petType: 'default',
    accessory: null,
    alwaysOnTop: true,
    soundEnabled: true,
    activityLevel: 'normal',
    autoHideFullscreen: true,
    launchOnStartup: true,
    size: 100,
    opacity: 100
  });
  
  // 加载设置
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const savedSettings = await window.desktopPet.getPetSettings();
        setSettings({ ...settings, ...savedSettings });
      } catch (error) {
        console.error('加载设置失败:', error);
      }
    };
    
    loadSettings();
  }, []);
  
  // 保存设置到主进程
  const saveSettings = () => {
    window.desktopPet.savePetSettings(settings);
  };
  
  // 更新设置处理函数
  const handleSettingChange = (key: keyof PetSettings, value: any) => {
    setSettings(prev => {
      const newSettings = { ...prev, [key]: value };
      window.desktopPet.savePetSettings(newSettings);
      return newSettings;
    });
  };
  
  // 处理选项卡切换
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };
  
  // 关闭窗口处理函数
  const handleCloseWindow = () => {
    window.close();
  };
  
  // 获取当前选择的宠物
  const selectedPet = PET_OPTIONS.find(pet => pet.id === settings.petType) || PET_OPTIONS[0];
  
  // 获取当前选择的饰品
  const selectedAccessory = settings.accessory 
    ? ACCESSORY_OPTIONS.find(acc => acc.id === settings.accessory) 
    : null;

  return (
    <div className="settings-window">
      {/* 导航侧边栏 */}
      <nav className="settings-nav">
        <ul>
          <li 
            className={activeTab === 'general' ? 'active' : ''}
            onClick={() => handleTabChange('general')}
          >
            <span className="icon-placeholder">📄</span> 常规
          </li>
          <li 
            className={activeTab === 'appearance' ? 'active' : ''}
            onClick={() => handleTabChange('appearance')}
          >
            <span className="icon-placeholder">🎨</span> 外观
          </li>
          <li 
            className={activeTab === 'pet-selection' ? 'active' : ''}
            onClick={() => handleTabChange('pet-selection')}
          >
            <span className="icon-placeholder">🐾</span> 宠物选择
          </li>
          <li 
            className={activeTab === 'accessories' ? 'active' : ''}
            onClick={() => handleTabChange('accessories')}
          >
            <span className="icon-placeholder">🎩</span> 饰品
          </li>
        </ul>
      </nav>

      {/* 主内容区 */}
      <div className="settings-main-content">
        {/* 页眉 */}
        <div className="settings-header">
          <span>设置</span>
          <button className="close-btn" title="关闭" onClick={handleCloseWindow}>×</button>
        </div>

        {/* 内容区域 */}
        <div className="settings-content-area">
          {/* 常规设置 */}
          <div 
            className="settings-section" 
            id="general-settings" 
            style={{ display: activeTab === 'general' ? 'block' : 'none' }}
          >
            <h3>常规</h3>
            <div className="setting-item">
              <label htmlFor="launch-startup">开机启动</label>
              <label className="toggle-switch">
                <input 
                  type="checkbox" 
                  id="launch-startup" 
                  checked={settings.launchOnStartup} 
                  onChange={(e) => handleSettingChange('launchOnStartup', e.target.checked)}
                />
                <span className="slider"></span>
              </label>
            </div>
            <div className="setting-item">
              <label htmlFor="enable-sound">启用声音效果</label>
              <label className="toggle-switch">
                <input 
                  type="checkbox" 
                  id="enable-sound" 
                  checked={settings.soundEnabled} 
                  onChange={(e) => handleSettingChange('soundEnabled', e.target.checked)}
                />
                <span className="slider"></span>
              </label>
            </div>
            <div className="setting-item">
              <label htmlFor="activity-level">宠物活跃度</label>
              <div className="activity-options">
                <input 
                  type="radio" 
                  id="activity-calm" 
                  name="activity" 
                  value="calm" 
                  checked={settings.activityLevel === 'calm'}
                  onChange={() => handleSettingChange('activityLevel', 'calm')}
                /> 
                <label htmlFor="activity-calm">安静</label>
                
                <input 
                  type="radio" 
                  id="activity-normal" 
                  name="activity" 
                  value="normal" 
                  checked={settings.activityLevel === 'normal'}
                  onChange={() => handleSettingChange('activityLevel', 'normal')}
                /> 
                <label htmlFor="activity-normal">正常</label>
                
                <input 
                  type="radio" 
                  id="activity-playful" 
                  name="activity" 
                  value="playful" 
                  checked={settings.activityLevel === 'playful'}
                  onChange={() => handleSettingChange('activityLevel', 'playful')}
                /> 
                <label htmlFor="activity-playful">活泼</label>
              </div>
            </div>
            <div className="setting-item">
              <label htmlFor="auto-hide">全屏时自动隐藏</label>
              <label className="toggle-switch">
                <input 
                  type="checkbox" 
                  id="auto-hide" 
                  checked={settings.autoHideFullscreen} 
                  onChange={(e) => handleSettingChange('autoHideFullscreen', e.target.checked)}
                />
                <span className="slider"></span>
              </label>
            </div>
          </div>

          {/* 外观设置 */}
          <div 
            className="settings-section" 
            id="appearance-settings" 
            style={{ display: activeTab === 'appearance' ? 'block' : 'none' }}
          >
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
                onChange={(e) => handleSettingChange('size', parseInt(e.target.value))}
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
                onChange={(e) => handleSettingChange('opacity', parseInt(e.target.value))}
              />
            </div>
          </div>

          {/* 宠物选择 */}
          <div 
            className="settings-section" 
            id="pet-selection-settings" 
            style={{ display: activeTab === 'pet-selection' ? 'block' : 'none' }}
          >
            <h3>宠物选择</h3>
            <div className="selection-section-layout">
              {/* 实时预览 */}
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
              
              {/* 选择网格 */}
              <div className="selection-grid-container">
                <div className="selection-grid">
                  {PET_OPTIONS.map(pet => (
                    <div 
                      key={pet.id}
                      className={`grid-item ${settings.petType === pet.id ? 'selected' : ''}`}
                      onClick={() => handleSettingChange('petType', pet.id)}
                    >
                      <span 
                        className="item-preview" 
                        style={{ backgroundColor: pet.color }}
                      ></span>
                      <span className="item-name">{pet.name}</span>
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

          {/* 饰品 */}
          <div 
            className="settings-section" 
            id="accessories-settings" 
            style={{ display: activeTab === 'accessories' ? 'block' : 'none' }}
          >
            <h3>饰品</h3>
            <div className="selection-section-layout">
              {/* 实时预览 */}
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
              
              {/* 选择网格 */}
              <div className="selection-grid-container">
                <div className="selection-grid">
                  {ACCESSORY_OPTIONS.map(accessory => (
                    <div 
                      key={accessory.id}
                      className={`grid-item ${settings.accessory === accessory.id ? 'selected' : ''}`}
                      onClick={() => handleSettingChange('accessory', accessory.id)}
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
        </div>
      </div>
    </div>
  );
};

export default SettingsWindow;