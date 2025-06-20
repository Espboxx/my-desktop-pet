import { useEffect, useState } from 'react'
import './App.css'
import PetWindow from './components/PetWindow';
import SettingsWindow from './components/SettingsWindow';
import { PetStatusProvider } from './context/PetStatusContext'; // 导入 Provider
import { BubbleProvider } from './services/bubble/BubbleContext'; // 导入 BubbleProvider
import UserInteractionInitializer from './components/UserInteractionInitializer'; // 导入用户交互初始化器
import { getUserActivationManager } from './services/userActivation/UserActivationManager'; // 导入用户激活管理器

// Removed duplicate global declaration - types should come from electron-env.d.ts

function App() {
  const [windowType, setWindowType] = useState<string>('pet');

  useEffect(() => {
    // 确定当前窗口类型
    const currentWindow = window.windowInfo?.getCurrentWindow() || 'pet';
    setWindowType(currentWindow);

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
    // 使用 Provider 包裹窗口组件
    <BubbleProvider>
      <PetStatusProvider>
        <UserInteractionInitializer onUserInteraction={handleUserInteraction}>
          <div className="app-container">
            {windowType === 'pet' && <PetWindow />}
            {windowType === 'settings' && <SettingsWindow />}
          </div>
        </UserInteractionInitializer>
      </PetStatusProvider>
    </BubbleProvider>
  )
}

export default App
