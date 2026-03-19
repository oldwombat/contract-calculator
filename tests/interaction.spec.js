// @ts-check
const { test, expect } = require('@playwright/test');

// Helper: wait for JS to render results into the cards
async function waitForResults(page) {
  await page.waitForFunction(() => {
    const body = document.querySelector('#results-tbody');
    return body && body.children.length > 3;
  });
}

// ---------- Default $120k salary scenario ----------
test.describe('Default salary scenario ($120k)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/contract-calculator/');
    await waitForResults(page);
  });

  test('salary card net take-home is in expected range', async ({ page }) => {
    // $120k salary 2024-25: income tax=$26,788 (no Medicare levy) → net ~$93,212
    const cardText = await page.locator('#results-tbody').textContent();
    // Find the annual net value — it appears after "Net take-home (annual)"
    const match = cardText.match(/Net take-home \(annual\)\s+\$([0-9,]+)/);
    expect(match).toBeTruthy();
    const num = parseInt(match[1].replace(/,/g, ''));
    expect(num).toBeGreaterThan(89000);
    expect(num).toBeLessThan(97000);
  });

  test('salary card contains expected rows', async ({ page }) => {
    const text = await page.locator('#results-tbody').textContent();
    expect(text).toMatch(/Taxable income/i);
    expect(text).toMatch(/Net take-home/i);
    expect(text).toMatch(/Income tax/i);
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
    await page.goto('/contract-calculator/');
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
    const cardTextBefore = await page.locator('#results-tbody').textContent();
    const matchBefore = cardTextBefore.match(/Net take-home \(annual\)\s+\$([0-9,]+)/);
    await page.fill('#daily-rate', '1000');
    await page.locator('#daily-rate').dispatchEvent('input');
    await page.waitForTimeout(300);
    const cardTextAfter = await page.locator('#results-tbody').textContent();
    const matchAfter = cardTextAfter.match(/Net take-home \(annual\)\s+\$([0-9,]+)/);
    expect(matchAfter[1]).not.toBe(matchBefore[1]);
  });
});

// ---------- PSI toggle ----------
test.describe('PSI rules toggle', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/contract-calculator/');
    await waitForResults(page);
  });

  test('PSI on by default — retain profit toggle is disabled', async ({ page }) => {
    const retainToggle = page.locator('#pty-retain');
    await expect(retainToggle).toBeDisabled();
  });

  test('PSI off — retain profit toggle becomes enabled', async ({ page }) => {
    await page.locator('label:has(#pty-psi)').click();
    await page.waitForTimeout(200);
    const retainToggle = page.locator('#pty-retain');
    await expect(retainToggle).toBeEnabled();
  });
});

// ---------- EV toggle ----------
test.describe('FBT-exempt EV toggle', () => {
  test('EV cost input hidden by default', async ({ page }) => {
    await page.goto('/contract-calculator/');
    await page.waitForFunction(() => document.querySelector('#results-tbody')?.children.length > 3);
    // Check via JS property since CSS display:flex can override the hidden attribute
    // (We also fix this in CSS with [hidden] { display:none !important })
    const isHidden = await page.evaluate(() => document.querySelector('#pty-ev-cost-row').hidden);
    expect(isHidden).toBe(true);
  });

  test('EV cost input visible after toggle on', async ({ page }) => {
    await page.goto('/contract-calculator/');
    await page.waitForFunction(() => document.querySelector('#results-tbody')?.children.length > 3);
    await page.locator('label:has(#pty-ev)').click();
    await page.waitForTimeout(200);
    await expect(page.locator('#pty-ev-cost-row')).toBeVisible();
  });
});
