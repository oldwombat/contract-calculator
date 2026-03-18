// @ts-check
const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const SNAP_DIR = path.join(__dirname, 'screenshots');

test.describe('Visual screenshots', () => {
  test('desktop — full page', async ({ page }, testInfo) => {
    await page.goto('/');
    await page.waitForSelector('#card-salary .card-net', { state: 'visible' });
    await page.waitForTimeout(500);

    const dir = path.join(SNAP_DIR, testInfo.project.name);
    fs.mkdirSync(dir, { recursive: true });
    await page.screenshot({ path: path.join(dir, 'home-default.png'), fullPage: true });
    // Just verify page renders with key elements
    await expect(page.locator('#breakeven-box')).toBeVisible();
    await expect(page.locator('#card-salary')).toBeVisible();
    await expect(page.locator('#card-pty')).toBeVisible();
  });

  test('mobile — full page', async ({ page }, testInfo) => {
    await page.goto('/');
    await page.waitForSelector('#card-salary .card-net', { state: 'visible' });
    await page.waitForTimeout(500);

    const dir = path.join(SNAP_DIR, testInfo.project.name);
    fs.mkdirSync(dir, { recursive: true });
    await page.screenshot({ path: path.join(dir, 'home-default.png'), fullPage: true });
    await expect(page.locator('#breakeven-box')).toBeVisible();
  });
});
