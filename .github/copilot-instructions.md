# Copilot Instructions — contract-calculator

## Commands

```bash
npm test                                        # run all Playwright tests (desktop + mobile)
npm run test:interaction                        # interaction tests only
npm run test:visual                             # visual screenshot tests only
npx playwright test -g "salary card"           # run a single test by name
npx playwright test --reporter=line            # compact output
```

Tests run against the **live GitHub Pages site** (`https://oldwombat.github.io/contract-calculator/`). Push to `main` → GitHub Actions deploys automatically. Always wait for the deploy before running tests after code changes.

## Architecture

Four files, no build step, no framework:

| File | Role |
|---|---|
| `calculator.js` | Pure calculation functions only — no DOM access |
| `app.js` | DOM wiring, event listeners, rendering — single IIFE |
| `index.html` | Layout and markup |
| `style.css` | Styling |

`calculator.js` exposes a single global `var Calculator` (must be `var`, not `const` — `const` at top-level does not add to `window`). `app.js` calls `Calculator.*` functions.

## Key Conventions

### calculator.js — pure functions, no side effects
All scenario functions (`salaryScenario`, `paygScenario`, `abnScenario`, `ptyLtdScenario`) take a single `inputs` object and return a plain result object. Never touch the DOM from here.

### app.js — IIFE with recalculate()
All DOM reads → `getInputs()` → scenario functions → `renderResults()`. Any new input must be:
1. Added to `NUMBER_INPUTS` or `CHECKBOX_INPUTS` arrays (for localStorage persistence)
2. Wired with an event listener that calls `recalculate()`
3. When adding a new numeric input, bump `STORAGE_KEY` to the next version (currently `contractCalc_v4`)

### Toggle switches (custom checkboxes)
Toggles in HTML use a `<label class="toggle-switch">` wrapping a real `<input type="checkbox">`. In Playwright tests, always click the label, not the checkbox:
```js
await page.click('label:has(#checkbox-id)');
```

### `[hidden]` attribute
`style.css` has `[hidden] { display: none !important }` — this is required because `.input-row { display: flex }` would otherwise override the HTML `hidden` attribute.

### renderResults signature
```js
renderResults(salary, payg, abn, pty, inputs)
```
All five arguments are required. Omitting `inputs` causes a silent JS crash with no visible error.

### Tax calculations (2024-25)
- Income tax brackets, LITO applied — see `calculator.js` constants
- Medicare Levy is **intentionally excluded** (noted in footer disclaimer)
- Super Guarantee: 11.5%
- Company tax: 25%

### Days logic
- Salary effective days: `260 − annualLeave − publicHolidays` (default 230)
- Contractor billable days: `260 − publicHolidays` (default 250)
- The 20-day gap = annual leave — the key message for new contractors

### Playwright test patterns
- `waitForResults`: polls until `#results-tbody` has `> 3` children (JS has rendered)
- `baseURL` is `https://oldwombat.github.io` (not the sub-path); tests `goto('/contract-calculator/')`
- `timeout: 60000` — GitHub Pages can be slow
- Both `desktop` (Chrome 1280×900) and `mobile` (iPhone 14) projects run in parallel
