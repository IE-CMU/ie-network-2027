import { builtinModules } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

import pkg from './package.json'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const externalDeps = [
  ...Object.keys(pkg.dependencies ?? {}),
  ...Object.keys(pkg.devDependencies ?? {}),
]

export default defineConfig({
  publicDir: false,
  build: {
    outDir: 'dist-worker',
    emptyOutDir: true,
    target: 'node22',
    sourcemap: true,
    lib: {
      entry: path.resolve(__dirname, 'src/lib/queue/worker.ts'),
      formats: ['es'],
      fileName: () => 'worker.js',
    },
    rollupOptions: {
      external: [
        ...builtinModules,
        ...builtinModules.map((module) => `node:${module}`),
        ...externalDeps,
      ],
      output: {
        inlineDynamicImports: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@db': path.resolve(__dirname, 'src/db'),
      '@utils': path.resolve(__dirname, 'src/utils'),
      '@components': path.resolve(__dirname, 'src/components'),
      '@pages': path.resolve(__dirname, 'src/pages'),
      '@lib': path.resolve(__dirname, 'src/lib'),
      '@fixtures': path.resolve(__dirname, 'src/fixtures'),
      '@layouts': path.resolve(__dirname, 'src/layouts'),
    },
  },
})
