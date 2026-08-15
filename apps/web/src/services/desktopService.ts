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

declare global {
  interface Window {
    desktopAPI?: DesktopAPI;
  }
}

export const isDesktopApp = (): boolean => {
  return typeof window !== 'undefined' && Boolean(window.desktopAPI?.isDesktop);
};

export const getDesktopAPI = (): DesktopAPI | null => {
  if (isDesktopApp()) {
    return window.desktopAPI!;
  }
  return null;
};

/**
 * Print receipt directly via desktop thermal printer if running in PC desktop app,
 * otherwise fall back to browser print dialog.
 */
export const printReceiptNatively = async (
  receiptText: string,
  options?: { printerName?: string; silent?: boolean }
): Promise<{ success: boolean; message?: string }> => {
  const desktop = getDesktopAPI();
  if (desktop) {
    return desktop.printReceipt(receiptText, options);
  }

  // Browser Fallback: Print via popup window or print preview
  return new Promise((resolve) => {
    try {
      const printWin = window.open('', '_blank', 'width=350,height=600');
      if (printWin) {
        printWin.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Receipt Print</title>
            <style>
              body { font-family: monospace; font-size: 12px; white-space: pre-wrap; margin: 10px; }
            </style>
          </head>
          <body>${receiptText.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</body>
          </html>
        `);
        printWin.document.close();
        printWin.focus();
        printWin.print();
        printWin.close();
        resolve({ success: true });
      } else {
        resolve({ success: false, message: 'Popup blocked by browser' });
      }
    } catch (err: any) {
      resolve({ success: false, message: err?.message });
    }
  });
};

/**
 * Save report files (Excel, PDF, CSV) using native Windows Save Dialog
 * or fallback to browser anchor download.
 */
export const saveReportFile = async (
  defaultFilename: string,
  data: ArrayBuffer | Uint8Array | string,
  mimeType: string,
  extension: string
): Promise<{ success: boolean; filePath?: string }> => {
  const desktop = getDesktopAPI();
  if (desktop) {
    const ext = extension.replace(/^\./, '');
    const filters = [{ name: `${ext.toUpperCase()} Files`, extensions: [ext] }];
    const res = await desktop.saveFile(defaultFilename, data, filters);
    return { success: res.success, filePath: res.filePath };
  }

  // Browser download fallback
  try {
    const blob = new Blob([data as any], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = defaultFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return { success: true };
  } catch (err: any) {
    return { success: false };
  }
};
