# Contract Rate Calculator

> **Australian salary vs contracting — what are you actually worth?**

A client-side web calculator that helps Australians compare permanent employment with contracting across all common contractor structures. Understand what contract rate matches your salary, and what your contract rate equates to as a salary — accounting for leave, super, PSI rules, and more.

🌐 **Live:** [oldwombat.github.io/contract-calculator](https://oldwombat.github.io/contract-calculator)

---

## What It Does

Enter your salary or contract rate and instantly see a side-by-side breakdown across four scenarios:

| Scenario | Structure |
|---|---|
| **Salaried Employee** | Permanent role, employer-paid super + leave |
| **PAYG Contractor** | Via labour-hire agency, no leave entitlements |
| **ABN Sole Trader** | Direct client invoicing, individual tax rates |
| **Pty Ltd Company** | Single-director company, 25% company tax |

### Key calculations
- **Break-even rate** — the minimum contract rate needed to match a given salary (and reverse)
- **Days worked** — accounts for leave, public holidays, sick leave, and gaps between contracts
- **Superannuation** — employer-paid vs self-funded, with suggested voluntary amounts
- **PSI rules** — Personal Services Income rules that block profit retention for most single-client contractors
- **FBT-exempt EV** — company electric vehicle benefit available to Pty Ltd directors
- **Franking credits** — modelled for Pty Ltd profit retention scenario
- **Medicare Levy Surcharge** — applied when no private hospital cover and income > $93k

### 2024-25 Australian tax rates
| Income | Rate |
|---|---|
| $0 – $18,200 | 0% |
| $18,201 – $45,000 | 16% |
| $45,001 – $135,000 | 30% |
| $135,001 – $190,000 | 37% |
| $190,001+ | 45% |

Includes LITO (up to $700), Medicare Levy (2%), Medicare Levy Surcharge (1–1.5%), Super Guarantee (11.5%).

---

## Features

- ⚡ **Real-time** — all inputs recalculate instantly, no submit button
- 📱 **Mobile-friendly** — responsive CSS grid, works on all screen sizes
- 🌙 **Dark mode** — respects system preference
- 🧮 **PSI-aware** — defaults to PSI applying (the common case), with toggle to unlock profit retention
- ⚙️ **Fully configurable** — adjust leave days, gap days, super rate, business expenses, company costs
- 📊 **Pros & cons table** — visual comparison of all four structures
- 📖 **PSI explainer** — plain-English explanation of the Results Test and 80% Rule built into the page
- 🚫 **No dependencies** — zero npm packages, no build step, no frameworks

---

## Understanding PSI Rules

**Personal Services Income (PSI)** rules apply when a company earns income mainly from an individual's personal skills — which covers most IT, consulting, engineering, legal, and finance contractors.

When PSI applies to a Pty Ltd:
- ❌ Cannot retain profit at the 25% company tax rate (income attributed to individual at marginal rates)
- ❌ Cannot split income with family members
- ✅ Director salary, super, and business deductions still apply
- ✅ **FBT-exempt EV benefit is unaffected by PSI**

Most time-rate contractors (paid per day or hour, working for one client) will have PSI apply. The calculator defaults to this and shows the impact clearly.

See the [ATO's PSI guidance](https://www.ato.gov.au/individuals-and-families/income-deductions-offsets-and-records/income-you-must-declare/income-from-working/personal-services-income) for authoritative detail.

---

## Tech Stack

| | |
|---|---|
| HTML | Semantic, accessible markup |
| CSS | Custom properties, CSS grid, dark mode via `prefers-color-scheme` |
| JavaScript | Vanilla ES5-compatible, no frameworks, no build tools |
| Hosting | GitHub Pages (free, static) |

**File structure:**
```
index.html       — layout and markup
style.css        — all styling
calculator.js    — pure calculation functions (no DOM access)
app.js           — DOM wiring and rendering
plan.md          — feature spec and PSI rules reference
autopilot.md     — deployment and GitHub Pages setup guide
```

`calculator.js` exports a single `Calculator` object with pure functions that can be tested independently of the UI.

---

## Running Locally

No build step needed — just open the file:

```bash
git clone https://github.com/oldwombat/contract-calculator.git
cd contract-calculator
open index.html        # macOS
# or: xdg-open index.html  (Linux)
# or: start index.html     (Windows)
```

Or serve it with any static server:

```bash
python3 -m http.server 8080
# then open http://localhost:8080
```

---

## Deploying to GitHub Pages

1. Push to `main` branch
2. Go to **Settings → Pages**
3. Source: **Deploy from a branch** → `main` → `/ (root)` → Save
4. Live at `https://oldwombat.github.io/contract-calculator`

### Custom domain

Add your domain in **Settings → Pages → Custom domain**, then point your DNS:

```
A     @   185.199.108.153
A     @   185.199.109.153
A     @   185.199.110.153
A     @   185.199.111.153
CNAME www  oldwombat.github.io
```

GitHub auto-provisions a free TLS certificate via Let's Encrypt.

---

## Contributing

Improvements welcome — particularly:
- Updated tax brackets when ATO releases new rates
- Additional scenarios (e.g. income protection insurance, HECS/HELP debt)
- State-based public holiday counts
- PAYG instalment modelling for ABN/Pty Ltd

Please keep `calculator.js` free of DOM dependencies so the logic stays independently testable.

---

## Disclaimer

> This calculator provides **general information only** and does not constitute financial, tax, or legal advice. Tax rules are complex and change frequently. Consult a registered tax agent or accountant for advice specific to your circumstances. PSI rules in particular require professional assessment.
>
> Figures are based on 2024–25 Australian tax rates.

---

*Inspired by [paycalculator.com.au](https://paycalculator.com.au)*
