import { contextBridge, ipcRenderer } from 'electron';

export interface DesktopAPI {
  isDesktop: boolean;
  platform: string;
  version: string;
  windowControl: {
    minimize: () => void;
    maximize: () => void;
    close: () => void;
    isMaximized: () => Promise<boolean>;
    toggleKiosk: () => void;
  };
  printReceipt: (
    text: string,
    options?: { printerName?: string; silent?: boolean }
  ) => Promise<{ success: boolean; message?: string }>;
  getPrinters: () => Promise<Array<{ name: string; isDefault: boolean; status: number }>>;
  saveFile: (
    defaultName: string,
    data: ArrayBuffer | Uint8Array | string,
    filters?: Array<{ name: string; extensions: string[] }>
  ) => Promise<{ success: boolean; filePath?: string; canceled?: boolean }>;
  getNetworkStatus: () => Promise<{ isOnline: boolean; latencyMs: number }>;
  onNetworkChange: (callback: (isOnline: boolean) => void) => () => void;
}

const desktopAPI: DesktopAPI = {
  isDesktop: true,
  platform: process.platform,
  version: '1.0.0',

  windowControl: {
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close: () => ipcRenderer.send('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:is-maximized'),
    toggleKiosk: () => ipcRenderer.send('window:toggle-kiosk'),
  },

  printReceipt: (text, options) => ipcRenderer.invoke('printer:print-receipt', text, options),
  getPrinters: () => ipcRenderer.invoke('printer:get-printers'),

  saveFile: (defaultName, data, filters) =>
    ipcRenderer.invoke('dialog:save-file', defaultName, data, filters),

  getNetworkStatus: () => ipcRenderer.invoke('app:get-network-status'),

  onNetworkChange: (callback) => {
    const handler = (_: any, isOnline: boolean) => callback(isOnline);
    ipcRenderer.on('network:status-change', handler);
    return () => {
      ipcRenderer.removeListener('network:status-change', handler);
    };
  },
};

contextBridge.exposeInMainWorld('desktopAPI', desktopAPI);
