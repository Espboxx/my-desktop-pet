import { useState, useEffect } from 'react';

export interface PetSettings {
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

export default function useSettings() {
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
        setSettings(prev => ({ ...prev, ...savedSettings }));
      } catch (error) {
        console.error('加载设置失败:', error);
      }
    };

    loadSettings();
  }, []);

  // 更新设置
  const updateSetting = (key: keyof PetSettings, value: any) => {
    setSettings(prev => {
      const newSettings = { ...prev, [key]: value };
      window.desktopPet.savePetSettings(newSettings);
      return newSettings;
    });
  };

  return {
    settings,
    updateSetting
  };
}