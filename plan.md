# Contract Calculator — Plan

## Status
✅ **Built and deployed** — https://oldwombat.github.io/contract-calculator/
🐙 **Repo** — https://github.com/oldwombat/contract-calculator

GitHub Pages is live on `main`. Push to `main` → Actions auto-deploys.

### Completed features
- Four scenario comparison (Salary / PAYG Agency / ABN Sole Trader / Pty Ltd)
- 2024-25 tax brackets, LITO, Medicare, MLS, super, PSI rules
- Results comparison table (replaced 4 cards) + CSV download
- Break-even callout (salary↔rate both directions)
- Pros & Cons table
- localStorage persistence (key `contractCalc_v2`) + Reset button
- Dark mode, responsive / mobile layout
- Playwright tests: 26/26 passing (desktop + mobile)

## Problem
People moving between salaried employment and contracting in Australia struggle to understand what contract rate is equivalent to their salary (or vice versa). This tool makes that comparison clear across all common contractor structures.

## Approach
Client-side-only web app. Plain HTML + CSS + vanilla JS. No frameworks. Four files: `index.html`, `style.css`, `calculator.js`, `app.js`. All calculation logic isolated in `calculator.js` as pure functions.

---

## Architecture

### Files
- `index.html` — layout and markup
- `style.css` — styling, responsive, clean
- `calculator.js` — all calculation logic (pure functions, no DOM)
- `app.js` — DOM wiring, event listeners, rendering results

### Layout
```
┌─────────────────────────────────────────┐
│  Header + tagline                       │
├─────────────────────────────────────────┤
│  INPUT PANEL                            │
│  - Salary OR contract rate entry        │
│  - Working days assumptions             │
│  - Super rate                           │
│  - Optional toggles (health cover, EV) │
├─────────────────────────────────────────┤
│  RESULTS: 4 comparison cards            │
│  [Salary] [PAYG] [ABN Sole] [Pty Ltd]   │
│                                         │
│  ★ Break-even callout box               │
├─────────────────────────────────────────┤
│  PROS / CONS comparison table           │
└─────────────────────────────────────────┘
```

---

## Four Scenarios Compared

### 1. Salaried Employee
- Input: annual salary (exclusive of super)
- Employer pays super on top (11.5% SG for 2024-25)
- Full annual leave (default 20 days), public holidays (10), sick leave (10) all paid
- Income tax on salary, Medicare levy, LITO
- Shows: gross, super, taxable, tax, medicare, net take-home, effective hourly/daily

### 2. PAYG Contractor (via labour hire / agency)
- Same tax withheld as salary
- No leave (paid per day/hour worked only)
- Super may or may not be paid by the agency (toggle: yes/no)
- Must earn equivalent over fewer paid days (no leave)
- Shows same breakdown, but also billable days calculation

### 3. ABN Sole Trader
- Invoices client directly (rate × billable days)
- Pays tax at individual marginal rates (same brackets as salary)
- GST-registered if > $75k turnover (GST is pass-through, not shown)
- No employer super — shows what they *should* set aside
- Can claim some business deductions (input: annual business costs)
- Shows gross invoiced, deductions, taxable, tax, net, effective rate

### 4. Pty Ltd Company (Single Person)
- Company invoices client, pays 25% company tax on profit
- Sub-toggle A: **Pay full salary to director** — company profit = 0, director pays personal tax on salary
- Sub-toggle B: **Retain profit in company** — company pays 25% tax, director takes minimal salary + dividends (franked), personal tax reduced by franking credits
- Optional toggle: **FBT-exempt EV** — input annual EV cost (lease + running); company pays pre-tax, saving director marginal rate on that amount
- Additional costs: company running costs (ASIC fees, accountant, insurance — default ~$3,500/yr configurable)
- Shows: company revenue, company costs, company tax, director salary, personal tax, franking credits, net take-home
- **PSI rules critically affect this scenario — see PSI section below**

---

## Personal Services Income (PSI) Rules

PSI rules apply when a company or trust earns income that is **mainly a reward for an individual's personal skills or efforts** — which describes the vast majority of IT, consulting, engineering, legal, and finance contractors.

### PSI Tests (applied in order)

**Step 1 — Results Test** (best outcome if passed; PSI rules do NOT apply):
All three must be true:
1. You are engaged to produce a **specific result** (not paid by the hour/day for time)
2. You provide your **own tools and equipment**
3. You are **liable to fix defects** at your own cost

> Most time-rate contractors (paid per day or hour) **fail** the Results Test because they are paid for time, not a result.

**Step 2 — 80% Rule**: If 80%+ of the company's income comes from one client (or related clients), you must pass one of:
- **Unrelated clients test**: Services provided to 2+ unrelated clients resulting from genuine advertising to the general public
- **Employment test**: Has at least one other worker (not an associate) doing 20%+ of the principal work
- **Business premises test**: Uses business premises genuinely separate from home *and* client's premises

> Single-person contractors working for one client at a time almost always **fail all of Step 2**.

### Effect When PSI Rules Apply to a Pty Ltd

| | PSI does NOT apply | PSI DOES apply |
|---|---|---|
| Profit retained at 25% company tax | ✅ Allowed | ❌ Income attributed to individual at marginal rates |
| Income splitting to spouse/family | ✅ Possible | ❌ Prohibited |
| Director salary deduction | ✅ | ✅ |
| Super deduction for director | ✅ | ✅ |
| Legitimate business deductions | ✅ | ✅ (but home office rent, mortgage interest, associate super are excluded) |
| FBT-exempt EV benefit | ✅ | ✅ (unaffected by PSI) |

### How the Calculator Handles PSI

- A **PSI status toggle** lets the user declare whether PSI applies:
  - `"PSI likely applies"` (default for single-client contractors) — disables profit retention benefit, shows attributed income taxed at marginal rate
  - `"Passed Results Test — PSI does not apply"` — enables full Pty Ltd tax advantages
- When PSI applies, the Pty Ltd "retain profit" sub-toggle is **disabled with an explanation**
- A persistent **PSI info callout** on the Pty Ltd card explains the impact in plain English
- The pros/cons table gains a row: "Profit retention benefit" — showing ❌ for PSI-subject companies

### PSI and ABN Sole Traders
PSI rules can technically apply to sole traders too, but the practical effect is minimal since sole traders already pay tax at personal marginal rates. The main restriction is on deductions (e.g. cannot deduct rent paid to yourself). This is noted informatively but doesn't change the sole trader calculation significantly.

---

## Inputs / Assumptions Panel

| Input | Default | Notes |
|---|---|---|
| Annual salary | $120,000 | Exclusive of super |
| Hourly rate | — | Auto-calculated |
| Daily rate | — | Auto-calculated |
| Annual leave days | 20 | Standard Australian |
| Public holidays | 10 | National average |
| Sick leave days | 10 | Standard entitlement |
| Hours per day | 8 | |
| Contractor gap days | 15 | Days between contracts / unbillable |
| Super rate | 11.5% | 2024-25 SG rate |
| Business expenses (sole trader) | $2,000 | Accountant, insurance, etc. |
| Company running costs (Pty Ltd) | $3,500 | ASIC, accountant, insurance |
| Private health insurance | No | Affects Medicare Levy Surcharge |
| FBT-exempt EV | Off | Annual cost input when on |
| PSI applies (Pty Ltd) | Yes | Toggle to unlock profit retention |

---

## Australian Tax (2024-25)

### Income Tax Brackets (2024-25, post Stage 3 cuts)
| Income | Rate |
|---|---|
| $0 – $18,200 | 0% |
| $18,201 – $45,000 | 16% |
| $45,001 – $135,000 | 30% |
| $135,001 – $190,000 | 37% |
| $190,001+ | 45% |

### Other
- Medicare Levy: 2% (threshold ~$26,000)
- Medicare Levy Surcharge: 1–1.5% if no private health + income > $93,000
- Low Income Tax Offset (LITO): up to $700 (tapers off above $37,500, gone at $66,667)
- Super Guarantee: 11.5%
- Company tax rate (base rate entity): 25%
- Franking credits: company tax paid is a credit against personal tax on dividends

---

## Days Worked Calculation

```
Total weekdays:         260
  - Annual leave:       -20   (paid for salary, unpaid for contractors)
  - Public holidays:    -10   (paid for salary, unpaid for contractors)
  - Sick leave:         -10   (paid for salary, contractors wear this risk)
  - Contractor gaps:    -15   (between contracts, only applies to contractors)
                        ────
Salary effective days:  220   (230 if ignoring sick leave cost)
PAYG/ABN billable days: 225   (260 - PH - gaps; leave unpaid)
```

Salary effective daily rate = Salary / 220 (default)
Contractor break-even daily rate = (Salary + Super) / (contractor billable days)

---

## Break-even Callout
Prominently display:
> "To match a **$120,000** salary (incl. super: **$133,800**), you need to earn at least **$595/day** or **$74/hr** as a contractor."

And in reverse:
> "Earning **$800/day** as a contractor is equivalent to a **$164,000** salary package."

---

## Pros & Cons Section

| Topic | Salary | PAYG | ABN | Pty Ltd |
|---|---|---|---|---|
| Paid annual leave | ✅ | ❌ | ❌ | ❌ |
| Paid sick leave | ✅ | ❌ | ❌ | ❌ |
| Employer pays super | ✅ | Sometimes | ❌ | Self-funded |
| Job security | High | Medium | Low | Low |
| Tax minimisation options | Low | Low | Medium | High* |
| Profit retention benefit | ❌ | ❌ | ❌ | ✅ (if PSI doesn't apply) |
| FBT-exempt EV | ❌ | ❌ | ❌ | ✅ |
| Setup / admin overhead | None | None | Low | High |
| Workers comp / insurance | Employer | Employer | Self | Self |
| Redundancy entitlements | ✅ | ❌ | ❌ | ❌ |
| Rate negotiation flexibility | Low | Medium | High | High |

*Pty Ltd tax minimisation is significantly reduced when PSI rules apply.
