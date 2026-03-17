
const { VitePlugin } = require('@electron-forge/plugin-vite');

module.exports = {
  packagerConfig: {
    name: 'Alaruel Atlas',
    executableName: 'alaruel-atlas',
  },
  makers: [
    { name: '@electron-forge/maker-squirrel', config: { name: 'AlaruelAtlas' } },
  ],
  plugins: [
    new VitePlugin({
      build: [],
      renderer: [{ name: 'main_window', config: 'vite.renderer.config.ts' }],
    }),
  ],
};
