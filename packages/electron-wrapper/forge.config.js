module.exports = {
  packagerConfig: {
    name: 'Adventures in Lua',
    executableName: 'adventures-in-lua',
    // Icon path - uses default Electron icon until custom icons are added
    // To add custom icons, place: icon.icns (macOS), icon.ico (Windows), icon.png (Linux) in ./icons/
    // icon: './icons/icon',
    appBundleId: 'app.adventuresinlua.desktop',
    // Code signing deferred to future issue
    // osxSign: {},
    // osxNotarize: {},
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: 'AdventuresInLua',
        // Windows code signing deferred to future issue
        // certificateFile: '',
        // certificatePassword: '',
      },
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin', 'linux'],
    },
    {
      name: '@electron-forge/maker-dmg',
      config: {
        format: 'ULFO',
      },
    },
  ],
};
