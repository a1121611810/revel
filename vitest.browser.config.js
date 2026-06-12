import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import { playwright } from '@vitest/browser-playwright'

export default defineConfig({
  plugins: [vue()],
  test: {
    include: ['tests/browser/**/*.browser.spec.js'],
    browser: {
      provider: playwright(),
      enabled: true,
      headless: true,
      instances: [{ browser: 'chromium' }]
    },
    setupFiles: ['./vitest.browser.setup.js']
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src/renderer/src'),
      '@renderer': resolve(__dirname, 'src/renderer')
    }
  },
  optimizeDeps: {
    exclude: ['vue', '@vue/test-utils']
  }
})
