# Adventures in Lua - Electron Wrapper

Desktop application wrapper for Adventures in Lua. Provides a Chromium-based runtime for users on Safari and Firefox who need FileSystem Access API support.

## Overview

This package wraps the hosted web application (https://adventuresinlua.web.app) in an Electron shell. The app loads the hosted URL directly, so web updates are automatic without requiring app reinstalls.

## Development

### Prerequisites

- Node.js 18+
- npm 9+

### Install dependencies

```bash
cd packages/electron-wrapper
npm install
```

### Run locally

```bash
npm start
```

This launches the Electron app pointing to the production hosted URL.

### Build for distribution

```bash
# Build portable Windows exe (no installation required)
npm run build:win

# Build macOS zip
npm run build:mac

# Build Linux AppImage
npm run build:linux

# Build all platforms
npm run build
```

Build artifacts are output to the `dist/` directory.

## Platform Support

| Platform | Format | Notes |
|----------|--------|-------|
| Windows | Portable (.exe) | Single exe, no installation needed |
| macOS | ZIP | Supports x64 and arm64 |
| Linux | AppImage | Portable, no installation needed |

## macOS Installation

The macOS app is ad-hoc signed but not notarized with Apple. On first launch, macOS may show a security warning for apps from unidentified developers.

**To open the app for the first time:**

1. Extract the downloaded ZIP file
2. Move "Adventures in Lua.app" to your Applications folder (optional)
3. **Right-click** (or Control-click) on the app
4. Select **"Open"** from the context menu
5. Click **"Open"** in the security dialog

After the first launch, you can open the app normally by double-clicking.

## Project Structure

```
packages/electron-wrapper/
├── main.js           # Main process - window creation, URL loading
├── preload.js        # Preload script (placeholder for future OAuth)
├── icons/            # App icons (ico, png)
└── package.json      # Dependencies, scripts, and electron-builder config
```

## Security

- Navigation is restricted to the app domain only
- External links are blocked
- Node.js integration is disabled in the renderer
- Context isolation is enabled

## Future Enhancements

- Google OAuth integration (via preload script)
- Code signing for macOS and Windows
- Auto-update functionality
