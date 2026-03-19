# Release Notes

## [Unreleased] — Code Quality Cleanup (2026-03-19)

### Changed
- Removed duplicate `fmtRate()` function from `app.js`; all usages replaced with `fmtCurrency()`
- Flattened `totalPersonalTax()` in `calculator.js` to return a plain `number` instead of `{ incomeTax, total }` (both fields were always equal); updated all 6 call sites
- Removed dead `notes` arrays from all four scenario functions (`salaryScenario`, `paygScenario`, `abnScenario`, `ptyLtdScenario`) — approximately 40 lines of code that was computed but never read by `app.js`
- Removed dead helper functions `fmt()` and `pct()` from `calculator.js` (only used by the now-deleted notes code)
- Removed `contractorGapDays: 0` dead property from `getDaysConfig()` in `app.js` and its `@property` typedef entry in `calculator.js`

---

## v1.4.0 — Monthly/Weekly/Daily Rows + PAYG Fee (2026-03-19)

### Added
- Monthly, weekly, and daily take-home breakdown rows in the results table
- PAYG agency payroll fee input (0–10%, default 0%) — deducted from gross before tax

### Fixed
- `renderResults` missing `inputs` argument (caused silent JS crash)
- PAYG super default and comparison table accuracy

---

## v1.3.0 — Comparison Table + CSV Download (2026-03-19)

### Changed
- Replaced four separate result cards with a single comparison table (Salary / PAYG / ABN / Pty Ltd side by side)

### Added
- CSV download button for the results table

---

## v1.2.0 — localStorage + Reset (2026-03-18)

### Added
- localStorage persistence for all inputs (key: `contractCalc_v4`)
- Reset button (top-right) to clear saved state

---

## v1.1.0 — UI Fixes + Playwright Tests (2026-03-18)

### Fixed
- Toggle width bug
- Input grid stretch on wide screens
- Mobile overflow issues
- `[hidden]` CSS override bug (`.input-row { display: flex }` overrode HTML `hidden` attribute; fixed with `[hidden] { display: none !important }`)

### Added
- Playwright test suite (desktop + mobile projects)
- README

---

## v1.0.0 — Initial Build (2026-03-18)

### Added
- Four scenario comparison: Salary / PAYG Agency / ABN Sole Trader / Pty Ltd
- 2024-25 Australian tax brackets, LITO, super (11.5% SG)
- PSI rules toggle on Pty Ltd scenario
- FBT-exempt EV toggle on Pty Ltd scenario
- GST on top toggle (ABN + Pty Ltd)
- Super on top toggle (Salary + PAYG)
- Break-even callout (salary ↔ rate, both directions)
- Pros & Cons comparison table
- Dark mode, responsive/mobile layout
- Deployed to GitHub Pages: https://oldwombat.github.io/contract-calculator/
