import { defineConfig } from 'vite';
import { builtinModules } from 'module';

// Only externalize electron and Node.js built-ins.
// All npm dependencies get bundled by Vite so they're available inside the asar.
const externals = [
  'electron',
  ...builtinModules,
  ...builtinModules.map((m) => `node:${m}`),
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
