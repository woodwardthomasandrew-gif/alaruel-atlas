// =============================================================================
// apps/desktop/forge.config.ts
//
// Electron Forge build configuration.
//
// Packages the app for Windows (.exe / NSIS installer), macOS (.dmg), and
// Linux (.deb, .rpm) from a single config.
// =============================================================================

import type { ForgeConfig }              from '@electron-forge/shared-types';
import { MakerSquirrel }                 from '@electron-forge/maker-squirrel';
import { MakerZIP }                      from '@electron-forge/maker-zip';
import { MakerDeb }                      from '@electron-forge/maker-deb';
import { MakerRpm }                      from '@electron-forge/maker-rpm';
import { MakerDMG }                      from '@electron-forge/maker-dmg';
import { VitePlugin }                    from '@electron-forge/plugin-vite';

const config: ForgeConfig = {
  packagerConfig: {
    name:        'Alaruel Atlas',
    executableName: 'alaruel-atlas',
    appVersion:  process.env['npm_package_version'] ?? '0.1.0',
    icon:        '../../assets/icons/icon',  // .ico / .icns resolved by platform
    appBundleId: 'com.alaruel.atlas',
    // macOS entitlements for sandboxing
    osxSign:     {},
    osxNotarize: process.env['APPLE_ID'] ? {
      appleId:             process.env['APPLE_ID'] ?? '',
      appleIdPassword:     process.env['APPLE_ID_PASSWORD'] ?? '',
      teamId:              process.env['APPLE_TEAM_ID'] ?? '',
    } : undefined,
    // Prune devDependencies from the packaged app
    ignore: [
      /\.map$/,
      /node_modules\/\.cache/,
      /\.git/,
    ],
  },

  makers: [
    // Windows: Squirrel installer
    new MakerSquirrel({
      name:            'AlaruelAtlas',
      setupExe:        'AlaruelAtlas-Setup.exe',
      setupIcon:       '../../assets/icons/icon.ico',
      noMsi:           false,
    }),
    // macOS: DMG disk image
    new MakerDMG({
      name:   'Alaruel Atlas',
      icon:   '../../assets/icons/icon.icns',
      format: 'ULMO',
    }),
    // All platforms: ZIP archive (for portable distribution)
    new MakerZIP({}, ['darwin', 'linux']),
    // Linux: Debian package
    new MakerDeb({
      options: {
        name:        'alaruel-atlas',
        productName: 'Alaruel Atlas',
        description: 'Modular offline campaign management system for tabletop RPGs',
        categories:  ['Game', 'Utility'],
        icon:        '../../assets/icons/icon.png',
      },
    }),
    // Linux: RPM package
    new MakerRpm({
      options: {
        name:        'alaruel-atlas',
        productName: 'Alaruel Atlas',
        description: 'Modular offline campaign management system for tabletop RPGs',
        icon:        '../../assets/icons/icon.png',
      },
    }),
  ],

  plugins: [
    new VitePlugin({
      build: [
        // Main process
        {
          entry:  'src/main.ts',
          config: 'vite.main.config.ts',
        },
        // Preload script (separate bundle for security isolation)
        {
          entry:  'src/preload.ts',
          config: 'vite.preload.config.ts',
        },
      ],
      renderer: [
        // Renderer process (the React app)
        {
          name:   'main_window',
          config: '../../ui/vite.config.ts',
        },
      ],
    }),
  ],
};

export default config;
