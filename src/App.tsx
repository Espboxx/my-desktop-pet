import { useEffect, useState } from 'react'
import './App.css'
import PetWindow from './components/PetWindow'
import SettingsWindow from './components/SettingsWindow'

declare global {
  interface Window {
    desktopPet: {
      on: (channel: string, callback: (...args: any[]) => void) => void;
      off: (channel: string) => void;
      send: (channel: string, ...args: any[]) => void;
      invoke: (channel: string, ...args: any[]) => Promise<any>;
      dragPet: (mouseX: number, mouseY: number) => void;
      openSettings: () => void;
      setAlwaysOnTop: (flag: boolean) => void;
      getPetSettings: () => Promise<any>;
      savePetSettings: (settings: any) => void;
    };
    windowInfo: {
      getCurrentWindow: () => string;
    };
  }
}

function App() {
  const [windowType, setWindowType] = useState<string>('pet');

  useEffect(() => {
    // 确定当前窗口类型
    const currentWindow = window.windowInfo?.getCurrentWindow() || 'pet';
    setWindowType(currentWindow);
  }, []);

  return (
    <div className="app-container">
      {windowType === 'pet' && <PetWindow />}
      {windowType === 'settings' && <SettingsWindow />}
    </div>
  )
}

export default App
