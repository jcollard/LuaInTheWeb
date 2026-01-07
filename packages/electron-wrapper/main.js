const { app, BrowserWindow, Menu, dialog } = require('electron');
const path = require('path');

// Audio configuration for Electron
app.commandLine.appendSwitch('disable-features', 'AudioServiceOutOfProcess,AudioServiceSandbox');
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

// Dev mode: set ELECTRON_DEV=1 or pass --dev flag
const isDev = process.env.ELECTRON_DEV === '1' || process.argv.includes('--dev');
const DEV_URL = 'http://localhost:5173';
const PROD_URL = 'https://adventuresinlua.web.app';

const HOSTED_URL = isDev ? DEV_URL : PROD_URL;
const ALLOWED_HOST = isDev ? 'localhost' : 'adventuresinlua.web.app';

// Handle uncaught exceptions in main process
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception in main process:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection in main process:', reason);
});

function createWindow() {
  // Set up application menu
  if (process.platform === 'darwin') {
    // macOS: Create minimal menu with standard options
    const template = [
      {
        label: app.name,
        submenu: [
          { role: 'about' },
          { type: 'separator' },
          { role: 'quit' }
        ]
      },
      {
        label: 'Edit',
        submenu: [
          { role: 'undo' },
          { role: 'redo' },
          { type: 'separator' },
          { role: 'cut' },
          { role: 'copy' },
          { role: 'paste' },
          { role: 'selectAll' }
        ]
      }
    ];
    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
  } else {
    // Windows/Linux: Remove menu bar
    Menu.setApplicationMenu(null);
  }

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
    // Hide menu bar on Windows/Linux
    autoHideMenuBar: true,
  });

  // Maximize and show window
  win.maximize();
  win.show();

  // Load the hosted application
  win.loadURL(HOSTED_URL);

  // Auto-open DevTools in dev mode
  if (isDev) {
    win.webContents.openDevTools();
  }

  // Handle renderer process crash
  win.webContents.on('render-process-gone', (event, details) => {
    console.error('Renderer process crashed:', details.reason);

    // Attempt recovery for certain crash types
    if (details.reason === 'crashed' || details.reason === 'oom' || details.reason === 'killed') {
      dialog.showMessageBox(win, {
        type: 'error',
        title: 'Application Error',
        message: 'The application encountered an error and needs to reload.',
        buttons: ['Reload', 'Quit'],
        defaultId: 0,
      }).then((result) => {
        if (result.response === 0) {
          win.loadURL(HOSTED_URL);
        } else {
          app.quit();
        }
      });
    }
  });

  // Handle unresponsive renderer
  win.webContents.on('unresponsive', () => {
    console.warn('Renderer became unresponsive');
    dialog.showMessageBox(win, {
      type: 'warning',
      title: 'Application Not Responding',
      message: 'The application is not responding. Would you like to wait or reload?',
      buttons: ['Wait', 'Reload'],
      defaultId: 0,
    }).then((result) => {
      if (result.response === 1) {
        win.loadURL(HOSTED_URL);
      }
    });
  });

  // Log when renderer becomes responsive again
  win.webContents.on('responsive', () => {
    console.log('Renderer became responsive again');
  });

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

  // Handle new window creation
  // Allow canvas popup windows (for lua --canvas=window) and same-host navigation
  win.webContents.setWindowOpenHandler(({ url, frameName }) => {
    // Allow canvas popup windows (blank URL with canvas-* frame name)
    // These are created by useCanvasWindowManager for canvas games
    if (frameName?.startsWith('canvas-') && (!url || url === 'about:blank')) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          width: 816,
          height: 639,
          title: 'Canvas Game',
          autoHideMenuBar: true,
          resizable: true,
        },
      };
    }

    // Block external domains
    const parsedUrl = new URL(url);
    if (parsedUrl.host !== ALLOWED_HOST) {
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  // Handle window close - bypass beforeunload handlers from web content
  // The web app may have unsaved changes warnings that block closing in Electron
  win.on('close', (event) => {
    event.preventDefault();
    // Clear beforeunload handler and destroy window
    win.webContents.executeJavaScript('window.onbeforeunload = null;', true)
      .finally(() => {
        win.destroy();
      });
  });
}

// Create window when app is ready
app.whenReady().then(() => {
  if (isDev) {
    console.log('Running in DEV mode - connecting to', DEV_URL);
  }
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
