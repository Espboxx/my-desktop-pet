import React from 'react';
import useSettings from '../../hooks/useSettings';

const GeneralTab: React.FC = () => {
  const { settings, updateSetting } = useSettings();

  return (
    <div className="settings-section" style={{ display: 'block' }}>
      <h3>常规</h3>
      <div className="setting-item">
        <label htmlFor="launch-startup">开机启动</label>
        <label className="toggle-switch">
          <input 
            type="checkbox"
            id="launch-startup"
            checked={settings.launchOnStartup}
            onChange={(e) => updateSetting('launchOnStartup', e.target.checked)}
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
            onChange={(e) => updateSetting('soundEnabled', e.target.checked)}
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
            onChange={() => updateSetting('activityLevel', 'calm')}
          /> 
          <label htmlFor="activity-calm">安静</label>
          
          <input 
            type="radio"
            id="activity-normal"
            name="activity"
            value="normal"
            checked={settings.activityLevel === 'normal'}
            onChange={() => updateSetting('activityLevel', 'normal')}
          /> 
          <label htmlFor="activity-normal">正常</label>
          
          <input 
            type="radio"
            id="activity-playful"
            name="activity"
            value="playful"
            checked={settings.activityLevel === 'playful'}
            onChange={() => updateSetting('activityLevel', 'playful')}
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
            onChange={(e) => updateSetting('autoHideFullscreen', e.target.checked)}
          />
          <span className="slider"></span>
        </label>
      </div>
    </div>
  );
};

export default GeneralTab;