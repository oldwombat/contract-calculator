const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const url = 'https://oldwombat.github.io/contract-calculator/';

  for (const [label, viewport] of [
    ['desktop', { width: 1280, height: 900 }],
    ['mobile',  { width: 390,  height: 844 }],
  ]) {
    const page = await browser.newPage({ viewport });
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    await page.screenshot({ path: `tests/screenshots/${label}-full.png`, fullPage: true });

    // Input panel closeup
    await page.locator('.inputs-panel').screenshot({ path: `tests/screenshots/${label}-inputs.png` });

    // Cards closeup
    await page.locator('.cards-grid').screenshot({ path: `tests/screenshots/${label}-cards.png` });

    // Break-even
    await page.locator('.breakeven-box').screenshot({ path: `tests/screenshots/${label}-breakeven.png` });

    console.log(`✔ ${label} screenshots saved`);
    await page.close();
  }

  await browser.close();
})();
