// @ts-check
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.js',
  fullyParallel: true,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'https://oldwombat.github.io/contract-calculator/',
    // To test locally instead: baseURL: 'http://localhost:8080'
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } } },
    { name: 'mobile',  use: { ...devices['iPhone 14'] } },
  ],
});
