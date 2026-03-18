# Autopilot Instructions

## Task
Build the contract-calculator web app as described in `plan.md`. This is a client-side-only static web app — no build tools, no frameworks, no dependencies.

## Files to Create
- `index.html` — layout and markup
- `style.css` — styling, responsive
- `calculator.js` — all calculation logic as pure functions (no DOM access)
- `app.js` — DOM wiring, event listeners, rendering

## Build Order
1. `calculator.js` first — get the maths right before touching the UI
2. `index.html` — structure and semantic markup
3. `style.css` — clean, readable, mobile-friendly
4. `app.js` — wire inputs to calculations, render results reactively

## Hosting Plan
- GitHub Pages (free)
- Custom domain supported — point DNS A records to GitHub's IPs, add CNAME for www
- GitHub auto-provisions TLS via Let's Encrypt
- Multiple project repos can each have their own custom domain — no conflict
- Deploy: push to `main`, enable Pages in repo settings → source: main branch, root folder

## GitHub Pages DNS (for reference when setting up custom domain)
```
A     @   185.199.108.153
A     @   185.199.109.153
A     @   185.199.110.153
A     @   185.199.111.153
CNAME www  <username>.github.io
```

## Definition of Done
- All four scenarios calculate correctly (Salary, PAYG, ABN Sole Trader, Pty Ltd)
- PSI toggle works and disables profit retention when active
- FBT-exempt EV toggle works on Pty Ltd card
- Break-even callout updates in real time
- Pros/cons table renders with PSI-aware Pty Ltd row
- Works on mobile
- Repo is initialised with git, all files committed
- `plan.md` and this file (`autopilot.md`) are committed but clearly marked as project docs
