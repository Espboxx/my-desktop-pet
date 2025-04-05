import React, { useState } from 'react';
import { FaCog, FaPalette, FaPaw, FaHatWizard, FaTrophy, FaTimes } from 'react-icons/fa'; // 导入图标
import '../styles/SettingsWindow.css';
import GeneralTab from './SettingsTabs/GeneralTab';
import AppearanceTab from './SettingsTabs/AppearanceTab';
import PetSelectionTab from './SettingsTabs/PetSelectionTab';
import AccessoriesTab from './SettingsTabs/AccessoriesTab';
import TasksAchievementsTab from './SettingsTabs/TasksAchievementsTab';

const SettingsWindow: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('general');

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
          <li 
            className={activeTab === 'general' ? 'active' : ''}
            onClick={() => handleTabChange('general')}
          >
            <FaCog className="nav-icon" /> 常规
          </li>
          <li 
            className={activeTab === 'appearance' ? 'active' : ''}
            onClick={() => handleTabChange('appearance')}
          >
            <FaPalette className="nav-icon" /> 外观
          </li>
          <li 
            className={activeTab === 'pet-selection' ? 'active' : ''}
            onClick={() => handleTabChange('pet-selection')}
          >
            <FaPaw className="nav-icon" /> 宠物选择
          </li>
          <li 
            className={activeTab === 'accessories' ? 'active' : ''}
            onClick={() => handleTabChange('accessories')}
          >
            <FaHatWizard className="nav-icon" /> 饰品
          </li>
          {/* 新增任务/成就标签 */}
          <li
            className={activeTab === 'tasks-achievements' ? 'active' : ''}
            onClick={() => handleTabChange('tasks-achievements')}
          >
            <FaTrophy className="nav-icon" /> 任务/成就
          </li>
        </ul>
      </nav>

      {/* 主内容区 */}
      <div className="settings-main-content">
        <div className="settings-header">
          <span>设置</span>
          <button className="close-btn" title="关闭" onClick={handleCloseWindow}><FaTimes /></button>
        </div>

        <div className="settings-content-area">
          <div style={{ display: activeTab === 'general' ? 'block' : 'none' }}>
            <GeneralTab />
          </div>
          <div style={{ display: activeTab === 'appearance' ? 'block' : 'none' }}>
            <AppearanceTab />
          </div>
          <div style={{ display: activeTab === 'pet-selection' ? 'block' : 'none' }}>
            <PetSelectionTab />
          </div>
          <div style={{ display: activeTab === 'accessories' ? 'block' : 'none' }}>
            <AccessoriesTab />
          </div>
          {/* 新增任务/成就内容区域 */}
          <div style={{ display: activeTab === 'tasks-achievements' ? 'block' : 'none' }}>
            <TasksAchievementsTab />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsWindow;