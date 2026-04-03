/// <reference types="vite/client" />

import type { DesktopPetAPI, WindowInfoAPI } from "./types/ipcTypes";

declare global {
  interface Window {
    desktopPet: DesktopPetAPI;
    windowInfo: WindowInfoAPI;
  }
}

export {};
