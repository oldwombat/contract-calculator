// @ts-check
const { test, expect } = require('@playwright/test');

// Helper: wait for results to render
async function waitForResults(page) {
  await page.waitForSelector('#card-salary-body .highlight', { state: 'visible' });
}

// ---------- Default $120k salary scenario ----------
test.describe('Default salary scenario ($120k)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForResults(page);
  });

  test('salary card net take-home is in expected range', async ({ page }) => {
    // $120k salary 2024-25: tax=$28,912, Medicare=$2,400, MLS=$1,500 → net ~$87k–$90k
    const net = await page.locator('#card-salary-body .highlight .result-value').first().textContent();
    const num = parseInt(net.replace(/[^0-9]/g, ''));
    expect(num).toBeGreaterThan(85000);
    expect(num).toBeLessThan(95000);
  });

  test('salary card contains annual leave row', async ({ page }) => {
    const text = await page.locator('#card-salary-body').textContent();
    expect(text).toMatch(/Annual leave/i);
  });

  test('break-even box shows min rate', async ({ page }) => {
    const beText = await page.locator('#breakeven-box').textContent();
    expect(beText).toMatch(/break-even/i);
    // Min rate for $120k salary should be ~$540–$650/day
    const match = beText.match(/\$([0-9,]+)\/day/);
    expect(match).toBeTruthy();
    const rate = parseInt(match[1].replace(',', ''));
    expect(rate).toBeGreaterThan(500);
    expect(rate).toBeLessThan(700);
  });
});

// ---------- Mode switch: contract rate ----------
test.describe('Contract rate mode', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.click('#btn-mode-rate');
    await waitForResults(page);
  });

  test('daily rate input becomes visible', async ({ page }) => {
    await expect(page.locator('#daily-rate-row')).toBeVisible();
  });

  test('salary input row becomes hidden', async ({ page }) => {
    await expect(page.locator('#input-salary-group')).toBeHidden();
  });

  test('break-even third column shows equivalent salary label', async ({ page }) => {
    const beText = await page.locator('#breakeven-box').textContent();
    expect(beText).toMatch(/contract rate = salary of/i);
  });

  test('changing rate recalculates cards', async ({ page }) => {
    const netBefore = await page.locator('#card-salary-body .highlight .result-value').first().textContent();
    await page.fill('#daily-rate', '1000');
    await page.locator('#daily-rate').dispatchEvent('input');
    await page.waitForTimeout(300);
    const netAfter = await page.locator('#card-salary-body .highlight .result-value').first().textContent();
    expect(netAfter).not.toBe(netBefore);
  });
});

// ---------- PSI toggle ----------
test.describe('PSI rules toggle', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForResults(page);
  });

  test('PSI on by default — retain profit toggle is disabled', async ({ page }) => {
    const retainToggle = page.locator('#pty-retain');
    await expect(retainToggle).toBeDisabled();
  });

  test('PSI off — retain profit toggle becomes enabled', async ({ page }) => {
    await page.click('#pty-psi');
    await page.waitForTimeout(200);
    const retainToggle = page.locator('#pty-retain');
    await expect(retainToggle).toBeEnabled();
  });
});

// ---------- EV toggle ----------
test.describe('FBT-exempt EV toggle', () => {
  test('EV cost input hidden by default', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#pty-ev-cost-row')).toBeHidden();
  });

  test('EV cost input visible after toggle on', async ({ page }) => {
    await page.goto('/');
    await page.click('#pty-ev');
    await page.waitForTimeout(200);
    await expect(page.locator('#pty-ev-cost-row')).toBeVisible();
  });
});
