import { useEffect, useState } from 'react'
import './App.css'
import PetWindow from './components/PetWindow';
import SettingsWindow from './components/SettingsWindow';
import { PetStatusProvider } from './context/PetStatusContext'; // 导入 Provider

// Removed duplicate global declaration - types should come from electron-env.d.ts

function App() {
  const [windowType, setWindowType] = useState<string>('pet');

  useEffect(() => {
    // 确定当前窗口类型
    const currentWindow = window.windowInfo?.getCurrentWindow() || 'pet';
    setWindowType(currentWindow);
  }, []);

  return (
    // 使用 Provider 包裹窗口组件
    <PetStatusProvider>
      <div className="app-container">
        {windowType === 'pet' && <PetWindow />}
        {windowType === 'settings' && <SettingsWindow />}
      </div>
    </PetStatusProvider>
  )
}

export default App
