// Preload script for Adventures in Lua Electron wrapper
// This script runs in the renderer process before the web page loads.
// It has access to Node.js APIs and can expose specific functionality
// to the web page via contextBridge.

// Placeholder for future OAuth integration:
// When Google OAuth is implemented, this file will expose an electronAPI
// that allows the web app to trigger desktop OAuth flows.

// Example future implementation:
// const { contextBridge, ipcRenderer } = require('electron');
// contextBridge.exposeInMainWorld('electronAPI', {
//   initiateOAuth: () => ipcRenderer.invoke('oauth:initiate'),
//   onAuthComplete: (callback) => ipcRenderer.on('oauth:complete', callback),
// });
