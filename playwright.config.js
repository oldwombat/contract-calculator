// @ts-check
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.js',
  fullyParallel: true,
  retries: 0,
  reporter: 'list',
  timeout: 60000,          // 60s per test (GitHub Pages can be slow)
  use: {
    baseURL: 'https://oldwombat.github.io',
    navigationTimeout: 30000,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } } },
    { name: 'mobile',  use: { ...devices['iPhone 14'] } },
  ],
});
