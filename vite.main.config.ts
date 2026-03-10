import { defineConfig } from 'vite';
import { builtinModules } from 'module';
import pkg from './package.json';

// Externalize all Node.js built-ins, electron, and all dependencies
const externals = [
  'electron',
  ...builtinModules,
  ...builtinModules.map((m) => `node:${m}`),
  ...Object.keys(pkg.dependencies ?? {}),
];

export default defineConfig({
  build: {
    rollupOptions: {
      external: externals,
    },
  },
  resolve: {
    conditions: ['node'],
    mainFields: ['module', 'jsnext:main', 'jsnext'],
  },
});
