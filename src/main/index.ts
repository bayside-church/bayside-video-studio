import { app, BrowserWindow, session } from 'electron';
import path from 'path';
import fs from 'fs';
import { registerIpcHandlers } from './ipc/handlers';
import { isDev, RECORDINGS_DIR } from './config';

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;
declare const MAIN_WINDOW_VITE_NAME: string;

let mainWindow: BrowserWindow | null = null;

// Clean up stale recordings from previous sessions
function cleanupStaleRecordings() {
  try {
    if (!fs.existsSync(RECORDINGS_DIR)) return;
    const files = fs.readdirSync(RECORDINGS_DIR);
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    for (const file of files) {
      const filePath = path.join(RECORDINGS_DIR, file);
      const stat = fs.statSync(filePath);
      if (stat.mtimeMs < oneHourAgo) {
        fs.unlinkSync(filePath);
        console.log(`[Cleanup] Deleted stale recording: ${file}`);
      }
    }
  } catch (err) {
    console.warn('[Cleanup] Failed to clean stale recordings:', err);
  }
}

app.whenReady().then(() => {
  cleanupStaleRecordings();

  // Set CSP headers in production only (Vite dev server requires inline scripts)
  if (!isDev) {
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [
            "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'",
          ],
        },
      });
    });
  }

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    kiosk: !isDev,
    fullscreen: !isDev,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  registerIpcHandlers(() => mainWindow);

  if (typeof MAIN_WINDOW_VITE_DEV_SERVER_URL !== 'undefined') {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }

  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }
});

app.on('window-all-closed', () => {
  app.quit();
});
