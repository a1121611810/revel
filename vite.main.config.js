// @ts-check
import { defineConfig } from 'vite'
import path from 'path'
import { builtinModules } from 'module'
import { copyFileSync, existsSync } from 'fs'

export default defineConfig({
  root: path.resolve(__dirname, 'src/main'),
  build: {
    outDir: path.resolve(__dirname, 'dist/main'),
    emptyOutDir: true,
    lib: {
      entry: path.resolve(__dirname, 'src/main/main.js'),
      formats: ['cjs'],
      fileName: () => 'main.js'
    },
    rollupOptions: {
      external: [
        'electron',
        'child_process',
        'path',
        'fs',
        'os',
        'url',
        /tests\/fixtures\/mole-outputs/,
        ...builtinModules
      ]
    },
    target: 'node24',
    minify: false,
    sourcemap: true
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src/renderer/src')
    }
  },
  plugins: [
    {
      name: 'copy-menu-bar-assets',
      writeBundle() {
        const outDir = path.resolve(__dirname, 'dist/main')
        const files = ['menu-bar-popup.html', 'menu-bar-popup-preload.js']
        for (const file of files) {
          const src = path.resolve(__dirname, 'src/main', file)
          const dest = path.resolve(outDir, file)
          if (existsSync(src)) {
            copyFileSync(src, dest)
            console.log(`[copy-menu-bar-assets] ${file} → dist/main/`)
          }
        }
      }
    }
  ],
  clearScreen: false
})
