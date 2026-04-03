import { useEffect, useState } from 'react'
import './App.css'
import PetWindow from './components/PetWindow';
import SettingsWindow from './components/SettingsWindow';
import { PetStatusProvider } from './context/PetStatusContext'; // 导入 Provider
import { SettingsProvider } from './context/SettingsContext'
import useSettings from './hooks/settings/useSettings';
import { BubbleProvider } from './services/bubble/BubbleContext'; // 导入 BubbleProvider
import UserInteractionInitializer from './components/UserInteractionInitializer'; // 导入用户交互初始化器
import { getUserActivationManager } from './services/userActivation/UserActivationManager'; // 导入用户激活管理器

// Removed duplicate global declaration - types should come from electron-env.d.ts

function AppContent() {
  const [windowType] = useState<'pet' | 'settings'>(() => window.windowInfo?.getCurrentWindow() ?? 'pet')
  const { isLoaded } = useSettings()

  useEffect(() => {
    const currentWindow = window.windowInfo?.getCurrentWindow() || 'pet';

    // 初始化用户激活管理器（仅在宠物窗口中）
    if (currentWindow === 'pet') {
      const userActivationManager = getUserActivationManager({
        debugMode: process.env.NODE_ENV === 'development',
        persistToStorage: true
      });

      // 在开发模式下输出初始状态
      if (process.env.NODE_ENV === 'development') {
        console.log('[App] 用户激活管理器初始化完成', userActivationManager.getActivationInfo());
      }
    }
  }, []);

  // 处理用户交互激活
  const handleUserInteraction = () => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[App] 用户首次交互检测到，触觉反馈功能已启用');
    }
  };

  return (
    <div className="app-container">
      {windowType === 'pet' ? (
        isLoaded ? (
          <BubbleProvider>
            <PetStatusProvider>
              <UserInteractionInitializer onUserInteraction={handleUserInteraction}>
                <PetWindow />
              </UserInteractionInitializer>
            </PetStatusProvider>
          </BubbleProvider>
        ) : (
          <div className="loading-placeholder">加载设置中...</div>
        )
      ) : (
        <SettingsWindow />
      )}
    </div>
  )
}

function App() {
  return (
    <SettingsProvider>
      <AppContent />
    </SettingsProvider>
  )
}

export default App
