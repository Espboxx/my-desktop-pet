import React, { useState } from 'react';
import { FaCog, FaPalette, FaPaw, FaHatWizard, FaTrophy, FaTimes, FaBoxOpen, FaImage, FaMagic } from 'react-icons/fa';
import type { IconType } from 'react-icons'
import '../styles/SettingsWindow.css';
import GeneralTab from './SettingsTabs/GeneralTab';
import AppearanceTab from './SettingsTabs/AppearanceTab';
import PetSelectionTab from './SettingsTabs/PetSelectionTab';
import AccessoriesTab from './SettingsTabs/AccessoriesTab';
import TasksAchievementsTab from './SettingsTabs/TasksAchievementsTab';
import InventoryTab from './SettingsTabs/InventoryTab'; // 导入新的库存标签页组件
import ImageManagementTab from './SettingsTabs/ImageManagementTab'; // 导入图像管理标签页组件
import WindowEffectsTab from './SettingsTabs/WindowEffectsTab'
import ImageSystemTest from '@tests/components/ImageSystemTest'

interface SettingsTabDefinition {
  id: string
  label: string
  icon: IconType
  component: React.ComponentType
  devOnly?: boolean
}

const SETTINGS_TABS: SettingsTabDefinition[] = [
  { id: 'general', label: '常规', icon: FaCog, component: GeneralTab },
  { id: 'appearance', label: '外观', icon: FaPalette, component: AppearanceTab },
  { id: 'pet-selection', label: '宠物选择', icon: FaPaw, component: PetSelectionTab },
  { id: 'accessories', label: '饰品', icon: FaHatWizard, component: AccessoriesTab },
  { id: 'window-effects', label: '窗口特效', icon: FaMagic, component: WindowEffectsTab },
  { id: 'tasks-achievements', label: '任务/成就', icon: FaTrophy, component: TasksAchievementsTab },
  { id: 'inventory', label: '库存', icon: FaBoxOpen, component: InventoryTab },
  { id: 'image-management', label: '图像管理', icon: FaImage, component: ImageManagementTab },
  { id: 'debug', label: '调试', icon: FaCog, component: ImageSystemTest, devOnly: true },
]

const SettingsWindow: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('general');
  const visibleTabs = SETTINGS_TABS.filter((tab) => !tab.devOnly || process.env.NODE_ENV === 'development')
  const activeTabDefinition = visibleTabs.find((tab) => tab.id === activeTab) ?? visibleTabs[0]

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  const handleCloseWindow = () => {
    window.close();
  };

  return (
    <div className="settings-window">
      {/* 导航侧边栏 */}
      <nav className="settings-nav">
        <ul>
          {visibleTabs.map(({ id, label, icon: Icon }) => (
            <li
              key={id}
              className={activeTab === id ? 'active' : ''}
              onClick={() => handleTabChange(id)}
            >
              <Icon className="nav-icon" /> {label}
            </li>
          ))}
        </ul>
      </nav>

      {/* 主内容区 */}
      <div className="settings-main-content">
        <div className="settings-header">
          <span>设置</span>
          <button className="close-btn" title="关闭" onClick={handleCloseWindow}><FaTimes /></button>
        </div>

        <div className="settings-content-area">
          {activeTabDefinition ? <activeTabDefinition.component /> : null}
        </div>
      </div>
    </div>
  );
};

export default SettingsWindow;
