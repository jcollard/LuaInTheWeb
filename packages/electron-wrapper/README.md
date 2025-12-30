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
# Package the app (without creating installers)
npm run package

# Create platform-specific installers
npm run make
```

Build artifacts are output to the `out/` directory.

## Platform Support

| Platform | Format | Notes |
|----------|--------|-------|
| Windows | Squirrel (.exe) | Standard Windows installer |
| macOS | DMG, ZIP | Supports x64 and arm64 |
| Linux | ZIP | Portable archive |

## Project Structure

```
packages/electron-wrapper/
├── main.js           # Main process - window creation, URL loading
├── preload.js        # Preload script (placeholder for future OAuth)
├── forge.config.js   # Electron Forge build configuration
├── icons/            # App icons (icns, ico, png)
└── package.json      # Dependencies and scripts
```

## Security

- Navigation is restricted to the app domain only
- External links are blocked
- Node.js integration is disabled in the renderer
- Context isolation is enabled

## Future Enhancements

- Custom app icons
- Google OAuth integration (via preload script)
- Code signing for macOS and Windows
- Auto-update functionality
