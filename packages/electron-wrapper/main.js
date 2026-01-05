const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

const HOSTED_URL = 'https://adventuresinlua.web.app';
const ALLOWED_HOST = 'adventuresinlua.web.app';

function createWindow() {
  // Remove the application menu
  Menu.setApplicationMenu(null);

  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false, // Don't show until maximized
    icon: path.join(__dirname, 'icons', 'icon-512.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    // macOS: use hidden inset title bar
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    // Hide menu bar on Windows/Linux
    autoHideMenuBar: true,
  });

  // Maximize and show window
  win.maximize();
  win.show();

  // Load the hosted application
  win.loadURL(HOSTED_URL);

  // Handle keyboard shortcuts
  win.webContents.on('before-input-event', (event, input) => {
    // F12: Toggle DevTools
    if (input.key === 'F12') {
      win.webContents.toggleDevTools();
      event.preventDefault();
    }
    // F11: Toggle fullscreen
    if (input.key === 'F11') {
      win.setFullScreen(!win.isFullScreen());
      event.preventDefault();
    }
  });

  // Restrict navigation to the app domain only
  win.webContents.on('will-navigate', (event, url) => {
    const parsedUrl = new URL(url);
    if (parsedUrl.host !== ALLOWED_HOST) {
      event.preventDefault();
    }
  });

  // Block new window creation to external domains
  win.webContents.setWindowOpenHandler(({ url }) => {
    const parsedUrl = new URL(url);
    if (parsedUrl.host !== ALLOWED_HOST) {
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });
}

// Create window when app is ready
app.whenReady().then(() => {
  createWindow();

  // macOS: re-create window when dock icon is clicked
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
