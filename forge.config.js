const { FusesPlugin } = require('@electron-forge/plugin-fuses')
const { FuseVersion, FuseV1Options } = require('@electron/fuses')
const path = require('path')

module.exports = {
  packagerConfig: {
    name: 'Revel',
    appBundleId: 'com.revel.app',
    appCategoryType: 'public.app-category.utilities',
    icon: path.resolve(__dirname, 'build', 'icon.icns'),
    asar: true,
    electronLanguages: ['en', 'zh_CN', 'zh_TW'],
    ignore: [
      /^\/src\//,
      /^\/tests\//,
      /^\/scripts\//,
      /^\/docs\//,
      /^\/coverage\//,
      /^\/test-results\//,
      /^\/\.superpowers\//,
      /^\/\.mimocode\//,
      /^\/\.reasonix\//,
      /^\/\.codegraph\//,
      /^\/\.playwright-mcp\//,
      /^\/\.pnpm-store\//,
      /^\/\.pnpm-local\//,
      /^\/release\//,
      /^\/out\//,
      /vite\..*\.config\.js$/,
      /vitest\..*$/,
      /\.spec\.js$/,
      'pnpm-lock.yaml',
      'pnpm-workspace.yaml',
      '.oxlintrc.json',
      '.oxfmtrc.jsonc',
      'AGENTS.md',
      'SPEC.md',
      'CHANGELOG.md',
    ],
  },
  makers: [
    { name: '@electron-forge/maker-zip', platforms: ['darwin'] },
    {
      name: '@electron-forge/maker-dmg',
      config: {
        format: 'ULFO',
        icon: path.resolve(__dirname, 'build', 'icon.icns'),
      },
    },
  ],
  plugins: [
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.NodeCliInspect]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
  hooks: {
    generateAssets: async () => {
      const { execSync } = require('child_process')
      console.log('[forge] Running Vite build + icon export...')
      execSync('node scripts/build.mjs', { stdio: 'inherit', cwd: __dirname })
    },
  },
}
