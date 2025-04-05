/// <reference types="vite-plugin-electron/electron-env" />

declare namespace NodeJS {
  interface ProcessEnv {
    /**
     * The built directory structure
     *
     * ```tree
     * ├─┬─┬ dist
     * │ │ └── index.html
     * │ │
     * │ ├─┬ dist-electron
     * │ │ ├── main.js
     * │ │ └── preload.js
     * │
     * ```
     */
    APP_ROOT: string
    /** /dist/ or /public/ */
    VITE_PUBLIC: string
  }
}

import { PetStatus, SavedPetData } from '../src/types/petTypes'; // Import PetStatus and SavedPetData types

// Used in Renderer process, expose in `preload.ts`
interface Window {
  ipcRenderer: import('electron').IpcRenderer;
  // Define the structure of the API exposed by preload.ts
  desktopPet: {
    on: (channel: string, callback: (...args: any[]) => void) => () => void;
    off: (channel: string) => void;
    send: (channel: string, ...args: any[]) => void;
    invoke: (channel: string, ...args: any[]) => Promise<any>;
    getWindowPosition: () => Promise<number[] | undefined>;
    setPetPosition: (x: number, y: number) => void;
    openSettings: () => void;
    setAlwaysOnTop: (flag: boolean) => void;
    getPetSettings: () => Promise<any>; // Consider defining a Settings type
    savePetSettings: (settings: any) => void;
    getPetState: () => Promise<SavedPetData | null>; // Updated return type to include petTypeId
    savePetState: (data: SavedPetData) => void; // Updated parameter type to include petTypeId
    interactWithPet: (action: string) => void; // Updated action type
    updatePetBehavior: (behavior: any) => void; // Consider defining a Behavior type
    adjustPetWindowSize: (expand: boolean) => void;
    exitApp: () => void;
    setMousePassthrough: (enable: boolean) => void;
    showStatusDetails: () => void;
    showSkinSelector: () => void;
    showNameEditor: () => void;
    takePetPhoto: () => void;
    // Add any other exposed methods here
  };
  windowInfo: {
      getCurrentWindow: () => string;
  };
}
