import { app, BrowserWindow, session } from 'electron';
import path from 'path';
import fs from 'fs';
import { registerIpcHandlers } from './ipc/handlers';
import { ffmpegController } from './ffmpeg/controller';
import { isDev, getRecordingsDir } from './config';
import { getAutoDeleteOnUpload } from './settings';

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;
declare const MAIN_WINDOW_VITE_NAME: string;

let mainWindow: BrowserWindow | null = null;

// Clean up stale recordings from previous sessions
function cleanupStaleRecordings() {
  if (!getAutoDeleteOnUpload()) return; // User manages deletion manually
  try {
    const dir = getRecordingsDir();
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    for (const file of files) {
      const filePath = path.join(dir, file);
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
            "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com",
          ],
        },
      });
    });
  }

  if (isDev && app.dock) {
    app.dock.setIcon(path.join(app.getAppPath(), 'assets', 'icon.png'));
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
  ffmpegController.killAll().finally(() => app.quit());
});
