// @ts-check
import { defineConfig } from 'vite'
import path from 'path'

export default defineConfig({
  root: path.resolve(__dirname, 'src/preload'),
  build: {
    outDir: path.resolve(__dirname, 'dist/preload'),
    emptyOutDir: true,
    lib: {
      entry: path.resolve(__dirname, 'src/preload/preload.js'),
      formats: ['cjs'],
      fileName: () => 'preload.js'
    },
    rollupOptions: {
      external: ['electron']
    },
    target: 'node24',
    minify: false,
    sourcemap: true
  },
  clearScreen: false
})
