import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  workers: 1,
  timeout: 60000,
  expect: {
    timeout: 15000
  },
  reporter: [
    ['list'],
    ['json', { outputFile: '../reports/e2e/report.json' }],
    ['html', { outputFolder: '../reports/e2e' }]
  ],
  use: {
    trace: 'on-first-retry'
  }
})
