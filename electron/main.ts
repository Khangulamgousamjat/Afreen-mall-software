import { app, BrowserWindow, ipcMain, dialog, net } from 'electron';
import path from 'path';
import fs from 'fs';

let mainWindow: BrowserWindow | null = null;
let isQuitting = false;

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 720,
    title: 'Afreen Mall — Internal Operations Platform',
    backgroundColor: '#0B0F0D',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  // F12 to toggle DevTools, F5/Ctrl+R to reload
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12' && input.type === 'keyDown') {
      mainWindow?.webContents.toggleDevTools();
      event.preventDefault();
    }
  });

  // Smooth appearance once content is ready
  mainWindow.once('ready-to-show', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  mainWindow.on('close', () => {
    if (!isQuitting) {
      // Clean up
    }
  });

  // Load URL: In dev load Vite dev server, in prod load built static files
  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    // In production, resolve index.html from app package
    const possiblePaths = [
      path.join(__dirname, '../apps/web/dist/index.html'),
      path.join(app.getAppPath(), 'apps/web/dist/index.html'),
      path.join(process.resourcesPath, 'app.asar/apps/web/dist/index.html'),
      path.join(process.resourcesPath, 'app/apps/web/dist/index.html'),
      path.join(__dirname, 'apps/web/dist/index.html'),
    ];

    const foundPath = possiblePaths.find((p) => fs.existsSync(p));
    if (foundPath) {
      mainWindow.loadFile(foundPath);
    } else {
      console.warn('Could not find local index.html. Tried:', possiblePaths);
      mainWindow.loadURL('http://localhost:3000');
    }
  }

  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
}

// ── Native IPC Handlers ──────────────────────────────────────────────────────

function setupIpcHandlers() {
  // Window Management
  ipcMain.on('window:minimize', () => {
    if (mainWindow) mainWindow.minimize();
  });

  ipcMain.on('window:maximize', () => {
    if (mainWindow) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow.maximize();
      }
    }
  });

  ipcMain.on('window:close', () => {
    if (mainWindow) mainWindow.close();
  });

  ipcMain.handle('window:is-maximized', () => {
    return mainWindow ? mainWindow.isMaximized() : false;
  });

  ipcMain.on('window:toggle-kiosk', () => {
    if (mainWindow) {
      const current = mainWindow.isKiosk();
      mainWindow.setKiosk(!current);
      mainWindow.setFullScreen(!current);
    }
  });

  // Direct POS Thermal Receipt Printing
  ipcMain.handle('printer:get-printers', async () => {
    if (!mainWindow) return [];
    try {
      const printers = await mainWindow.webContents.getPrintersAsync();
      return printers.map((p: any) => ({
        name: p.name || p.displayName,
        isDefault: Boolean(p.isDefault),
        status: Number(p.status || 0),
      }));
    } catch (err: any) {
      console.error('Failed to get printers:', err);
      return [];
    }
  });

  ipcMain.handle('printer:print-receipt', async (_, text: string, options?: { printerName?: string; silent?: boolean }) => {
    try {
      const printWindow = new BrowserWindow({
        show: false,
        width: 300,
        height: 600,
        webPreferences: { nodeIntegration: false, contextIsolation: true },
      });

      const formattedHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8" />
          <style>
            @page { margin: 0; size: 80mm auto; }
            body {
              font-family: 'Courier New', Courier, monospace;
              font-size: 11px;
              line-height: 1.25;
              color: #000;
              background: #fff;
              margin: 4mm;
              white-space: pre-wrap;
              word-break: break-all;
            }
          </style>
        </head>
        <body>${text.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</body>
        </html>
      `;

      await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(formattedHtml)}`);

      return new Promise((resolve) => {
        printWindow.webContents.print(
          {
            silent: options?.silent !== false,
            deviceName: options?.printerName || '',
            printBackground: true,
            margins: { marginType: 'none' },
          },
          (success, failureReason) => {
            printWindow.close();
            if (success) {
              resolve({ success: true });
            } else {
              console.warn('Print failed or cancelled:', failureReason);
              resolve({ success: false, message: failureReason });
            }
          }
        );
      });
    } catch (err: any) {
      console.error('Error in print-receipt handler:', err);
      return { success: false, message: err?.message || 'Print execution failed' };
    }
  });

  // Native OS File Save Dialog (for Excel, PDF, CSV reports)
  ipcMain.handle('dialog:save-file', async (_, defaultName: string, data: any, filters?: any[]) => {
    if (!mainWindow) return { success: false };
    try {
      const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
        defaultPath: defaultName,
        filters: filters || [{ name: 'All Files', extensions: ['*'] }],
      });

      if (canceled || !filePath) {
        return { success: false, canceled: true };
      }

      let buffer: Buffer;
      if (Buffer.isBuffer(data)) {
        buffer = data;
      } else if (typeof data === 'string') {
        buffer = Buffer.from(data, 'utf-8');
      } else if (data instanceof ArrayBuffer || ArrayBuffer.isView(data)) {
        buffer = Buffer.from(data as any);
      } else {
        buffer = Buffer.from(JSON.stringify(data));
      }

      await fs.promises.writeFile(filePath, buffer);
      return { success: true, filePath };
    } catch (err: any) {
      console.error('Failed to save file natively:', err);
      return { success: false, message: err?.message };
    }
  });

  // Network Connectivity Check
  ipcMain.handle('app:get-network-status', async () => {
    const isOnline = net.isOnline();
    return { isOnline, latencyMs: 15 };
  });
}

// ── App Lifecycle ────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  setupIpcHandlers();
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  isQuitting = true;
});
