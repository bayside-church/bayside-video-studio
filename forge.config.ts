import type { ForgeConfig } from '@electron-forge/shared-types';
import { VitePlugin } from '@electron-forge/plugin-vite';
import path from 'path';

const config: ForgeConfig = {
  packagerConfig: {
    name: 'Bayside Video Studio',
    icon: './assets/icon',
    asar: true,
    extraResource: [path.resolve(__dirname, 'resources', 'ffmpeg')],
  },
  makers: [
    {
      name: '@electron-forge/maker-dmg',
      config: {
        name: 'BaysideVideoStudio',
        icon: './assets/icon.icns',
      },
    },
  ],
  plugins: [
    new VitePlugin({
      build: [
        {
          entry: 'src/main/index.ts',
          config: 'vite.main.config.ts',
          target: 'main',
        },
        {
          entry: 'src/preload/preload.ts',
          config: 'vite.preload.config.ts',
          target: 'preload',
        },
      ],
      renderer: [
        {
          name: 'main_window',
          config: 'vite.renderer.config.ts',
        },
      ],
    }),
  ],
};

export default config;
