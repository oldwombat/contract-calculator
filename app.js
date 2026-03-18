/**
 * app.js — DOM wiring and rendering for the Contract Rate Calculator.
 * Depends on Calculator object from calculator.js.
 */

(function () {
  'use strict';

  // ── Element references ──────────────────────────────────────────────────

  const $ = id => document.getElementById(id);

  // Mode toggles
  const btnModeSalary = $('btn-mode-salary');
  const btnModeRate   = $('btn-mode-rate');
  const salaryGroup   = $('input-salary-group');
  const rateGroup     = $('input-rate-group');

  // Rate type
  const btnRateDaily  = $('btn-rate-daily');
  const btnRateHourly = $('btn-rate-hourly');
  const dailyRateRow  = $('daily-rate-row');
  const hourlyRateRow = $('hourly-rate-row');

  // Primary inputs
  const inSalary      = $('salary');
  const inDailyRate   = $('daily-rate');
  const inHourlyRate  = $('hourly-rate');

  // Days
  const inAnnualLeave = $('annual-leave');
  const inPublicHols  = $('public-holidays');
  const inSickLeave   = $('sick-leave');
  const inGapDays     = $('gap-days');
  const inHoursPerDay = $('hours-per-day');
  const daysSummary   = $('days-summary');

  // Rates & offsets
  const inSuperRate     = $('super-rate');
  const inPrivateHealth = $('private-health');

  // PAYG
  const inPaygSuper = $('payg-super');

  // ABN
  const inAbnExpenses = $('abn-expenses');

  // Pty Ltd
  const inPtyRunning  = $('pty-running-costs');
  const inPtyPsi      = $('pty-psi');
  const inPtyRetain   = $('pty-retain');
  const ptyRetainRow  = $('pty-retain-row');
  const ptyRetainHint = $('pty-retain-hint');
  const inPtyEv       = $('pty-ev');
  const inPtyEvCost   = $('pty-ev-cost');
  const ptyEvCostRow  = $('pty-ev-cost-row');
  const psiExplainer  = $('psi-explainer');

  // Output
  const breakevenBox    = $('breakeven-box');
  const cardSalaryBody  = $('card-salary-body');
  const cardPaygBody    = $('card-payg-body');
  const cardAbnBody     = $('card-abn-body');
  const cardPtyBody     = $('card-pty-body');
  const ptyBadge        = $('pty-badge');
  const pcPaygSuper     = $('pc-payg-super');
  const pcPtyRetain     = $('pc-pty-retain');

  // ── State ───────────────────────────────────────────────────────────────

  let inputMode  = 'salary';  // 'salary' | 'rate'
  let rateType   = 'daily';   // 'daily'  | 'hourly'

  // ── Helpers ─────────────────────────────────────────────────────────────

  function num(el) {
    const v = parseFloat(el.value);
    return isNaN(v) ? 0 : v;
  }

  function fmtCurrency(n) {
    return '$' + Math.round(n).toLocaleString('en-AU');
  }

  function fmtCurrencyDecimal(n, decimals = 2) {
    return '$' + n.toLocaleString('en-AU', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  }

  function fmtRate(n) {
    return '$' + Math.round(n).toLocaleString('en-AU');
  }

  // ── Input reading ────────────────────────────────────────────────────────

  function getDaysConfig() {
    return {
      annualLeaveDays:   num(inAnnualLeave),
      publicHolidayDays: num(inPublicHols),
      sickLeaveDays:     num(inSickLeave),
      contractorGapDays: num(inGapDays),
      hoursPerDay:       num(inHoursPerDay) || 8,
    };
  }

  function getDailyRate() {
    const days = getDaysConfig();
    if (inputMode === 'salary') {
      // derive daily rate from salary using break-even formula
      const be = Calculator.breakEvenFromSalary({
        salary:    num(inSalary),
        superRate: num(inSuperRate) / 100,
        days,
      });
      return be.dailyRate;
    }
    if (rateType === 'daily') return num(inDailyRate);
    return num(inHourlyRate) * (num(inHoursPerDay) || 8);
  }

  function getSalary() {
    if (inputMode === 'salary') return num(inSalary);
    // derive salary from daily rate
    const days = getDaysConfig();
    const eq = Calculator.equivalentSalaryFromRate({
      contractDailyRate: getDailyRate(),
      superRate:         num(inSuperRate) / 100,
      days,
    });
    return eq.equivalentSalary;
  }

  function getInputs() {
    const days = getDaysConfig();
    return {
      salary:               getSalary(),
      contractDailyRate:    getDailyRate(),
      superRate:            num(inSuperRate) / 100,
      hasPrivateHealth:     inPrivateHealth.checked,
      days,
      paygSuperPaid:        inPaygSuper.checked,
      abnBusinessExpenses:  num(inAbnExpenses),
      ptyCompanyRunningCosts: num(inPtyRunning),
      ptyPsiApplies:        inPtyPsi.checked,
      ptyRetainProfit:      inPtyRetain.checked && !inPtyPsi.checked,
      ptyEvEnabled:         inPtyEv.checked,
      ptyEvAnnualCost:      num(inPtyEvCost),
    };
  }

  // ── Render helpers ───────────────────────────────────────────────────────

  function row(label, value, classes = '') {
    return `<div class="result-row ${classes}">
      <span class="result-label">${label}</span>
      <span class="result-value">${value}</span>
    </div>`;
  }

  function divider() {
    return '<div class="card-divider"></div>';
  }

  function notesList(notes) {
    if (!notes || !notes.length) return '';
    return '<div class="card-notes">' +
      notes.map(n => `<div class="card-note">${n}</div>`).join('') +
      '</div>';
  }

  // ── Card renderers ───────────────────────────────────────────────────────

  function renderSalary(r) {
    let html = '';
    html += row('Annual salary',        fmtCurrency(r.grossIncome));
    html += row('Employer super',        fmtCurrency(r.superEmployer),  'positive');
    html += row('Total package',         fmtCurrency(r.totalPackage),   'muted');
    html += divider();
    html += row('Taxable income',        fmtCurrency(r.taxableIncome));
    html += row('Income tax',            '−' + fmtCurrency(r.incomeTax),     'deduction');
    html += row('Medicare levy',         '−' + fmtCurrency(r.medicare),      'deduction');
    if (r.mls > 0)
      html += row('Medicare Levy Surcharge', '−' + fmtCurrency(r.mls),   'deduction warn');
    html += divider();
    html += row('Net take-home',         fmtCurrency(r.netIncome),      'highlight');
    html += `<div class="card-rates">
      <div class="card-rate-item">
        <span class="rate-label">Effective daily</span>
        <span class="rate-value">${fmtRate(r.effectiveDailyRate)}</span>
      </div>
      <div class="card-rate-item">
        <span class="rate-label">Effective hourly</span>
        <span class="rate-value">${fmtRate(r.effectiveHourlyRate)}</span>
      </div>
      <div class="card-rate-item">
        <span class="rate-label">Working days</span>
        <span class="rate-value">${Math.round(r.billableDays)}</span>
      </div>
    </div>`;
    if (r.notes && r.notes.length) html += notesList(r.notes);
    cardSalaryBody.innerHTML = html;
  }

  function renderPayg(r) {
    let html = '';
    html += row('Days billed / year',   r.billableDays);
    html += row('Gross income',          fmtCurrency(r.grossIncome));
    if (r.superEmployer > 0)
      html += row('Agency super',        fmtCurrency(r.superEmployer), 'positive');
    html += divider();
    html += row('Taxable income',        fmtCurrency(r.taxableIncome));
    html += row('Income tax',            '−' + fmtCurrency(r.incomeTax),  'deduction');
    html += row('Medicare levy',         '−' + fmtCurrency(r.medicare),   'deduction');
    if (r.mls > 0)
      html += row('Medicare Levy Surcharge', '−' + fmtCurrency(r.mls),   'deduction');
    html += divider();
    html += row('Net take-home',         fmtCurrency(r.netIncome),    'highlight');
    html += `<div class="card-rates">
      <div class="card-rate-item">
        <span class="rate-label">Daily rate</span>
        <span class="rate-value">${fmtRate(r.effectiveDailyRate)}</span>
      </div>
      <div class="card-rate-item">
        <span class="rate-label">Hourly rate</span>
        <span class="rate-value">${fmtRate(r.effectiveHourlyRate)}</span>
      </div>
    </div>`;
    html += notesList(r.notes);
    cardPaygBody.innerHTML = html;
  }

  function renderAbn(r) {
    let html = '';
    html += row('Days billed / year',   r.billableDays);
    html += row('Gross invoiced',        fmtCurrency(r.grossIncome));
    if (r.businessExpenses > 0)
      html += row('Business expenses',   '−' + fmtCurrency(r.businessExpenses), 'deduction');
    html += divider();
    html += row('Taxable income',        fmtCurrency(r.taxableIncome));
    html += row('Income tax',            '−' + fmtCurrency(r.incomeTax),  'deduction');
    html += row('Medicare levy',         '−' + fmtCurrency(r.medicare),   'deduction');
    if (r.mls > 0)
      html += row('Medicare Levy Surcharge', '−' + fmtCurrency(r.mls),   'deduction');
    html += divider();
    html += row('Net take-home',         fmtCurrency(r.netIncome),    'highlight');
    html += row('Suggested super',        fmtCurrency(r.suggestedSuper), 'muted');
    html += `<div class="card-rates">
      <div class="card-rate-item">
        <span class="rate-label">Daily rate</span>
        <span class="rate-value">${fmtRate(r.effectiveDailyRate)}</span>
      </div>
      <div class="card-rate-item">
        <span class="rate-label">Hourly rate</span>
        <span class="rate-value">${fmtRate(r.effectiveHourlyRate)}</span>
      </div>
    </div>`;
    html += notesList(r.notes);
    cardAbnBody.innerHTML = html;
  }

  function renderPty(r) {
    let html = '';

    // PSI banner
    if (r.psiApplies) {
      html += '<div class="psi-badge">⚠ PSI Applies — profit retention unavailable</div>';
    }

    html += row('Company revenue',       fmtCurrency(r.companyRevenue));
    html += row('Company costs',         '−' + fmtCurrency(r.companyCosts), 'deduction');

    if (r.companyTax > 0)
      html += row('Company tax (25%)',   '−' + fmtCurrency(r.companyTax),   'deduction');

    html += divider();
    html += row('Director salary',       fmtCurrency(r.directorSalary));

    if (r.dividends > 0) {
      html += row('Franked dividend',    fmtCurrency(r.dividends),          'positive');
      html += row('Franking credits',    '+' + fmtCurrency(r.frankingCredits), 'positive muted');
    }

    html += divider();
    html += row('Income tax',            '−' + fmtCurrency(r.incomeTax),    'deduction');
    html += row('Medicare levy',         '−' + fmtCurrency(r.medicare),     'deduction');
    if (r.mls > 0)
      html += row('Medicare Levy Surcharge', '−' + fmtCurrency(r.mls),     'deduction');
    if (r.frankingCredits > 0)
      html += row('Less: franking credits', '−' + fmtCurrency(r.frankingCredits), 'positive muted');

    html += divider();
    html += row('Net take-home',         fmtCurrency(r.netIncome),          'highlight');
    if (r.suggestedSuper > 0)
      html += row('Suggested super',     fmtCurrency(r.suggestedSuper),     'muted');

    html += `<div class="card-rates">
      <div class="card-rate-item">
        <span class="rate-label">Daily rate</span>
        <span class="rate-value">${fmtRate(r.effectiveDailyRate)}</span>
      </div>
      <div class="card-rate-item">
        <span class="rate-label">Hourly rate</span>
        <span class="rate-value">${fmtRate(r.effectiveHourlyRate)}</span>
      </div>
    </div>`;
    html += notesList(r.notes);
    cardPtyBody.innerHTML = html;

    // Update badge text
    ptyBadge.textContent = r.psiApplies ? 'PSI Applies' :
                           r.retainProfit ? 'Retain Profit' : 'Full Salary';
    ptyBadge.style.background = r.psiApplies ? '#b91c1c' :
                                r.retainProfit ? '#0f766e' : '#be123c';
  }

  // ── Break-even renderer ──────────────────────────────────────────────────

  function renderBreakeven(inputs) {
    const be  = Calculator.breakEvenFromSalary(inputs);
    const eq  = Calculator.equivalentSalaryFromRate(inputs);
    const sal = inputs.salary;
    const salPkg = sal * (1 + inputs.superRate);
    const rate = inputs.contractDailyRate;

    const thirdLabel  = inputMode === 'salary'
      ? 'Break-even rate used above'
      : 'Your contract rate = salary of';
    const thirdValue  = inputMode === 'salary'
      ? fmtRate(rate) + '/day'
      : fmtCurrency(eq.equivalentSalary);
    const thirdSub    = inputMode === 'salary'
      ? fmtCurrencyDecimal(rate / inputs.days.hoursPerDay) + '/hr &nbsp;·&nbsp; ' + Calculator.contractorBillableDays(inputs.days) + ' billable days'
      : 'equiv. package ' + fmtCurrency(eq.equivalentPackage);

    breakevenBox.innerHTML = `
      <div class="be-heading">Break-even analysis</div>
      <div class="be-row">
        <div class="be-item">
          <span class="be-label">Salary</span>
          <span class="be-value">${fmtCurrency(sal)}</span>
          <span class="be-sub">+ ${fmtCurrency(sal * inputs.superRate)} super = ${fmtCurrency(salPkg)} pkg</span>
        </div>
        <div class="be-divider"></div>
        <div class="be-item">
          <span class="be-label">Min. contract rate to match</span>
          <span class="be-value">${fmtRate(be.dailyRate)}/day</span>
          <span class="be-sub">${fmtCurrencyDecimal(be.hourlyRate)}/hr &nbsp;·&nbsp; ${Calculator.contractorBillableDays(inputs.days)} billable days</span>
        </div>
        <div class="be-divider"></div>
        <div class="be-item">
          <span class="be-label">${thirdLabel}</span>
          <span class="be-value">${thirdValue}</span>
          <span class="be-sub">${thirdSub}</span>
        </div>
      </div>
    `;
  }

  // ── Days summary renderer ────────────────────────────────────────────────

  function renderDaysSummary(days) {
    const salDays = Calculator.salaryEffectiveDays(days);
    const conDays = Calculator.contractorBillableDays(days);
    daysSummary.innerHTML =
      `<strong>${salDays}</strong> effective salary days &nbsp;|&nbsp; ` +
      `<strong>${conDays}</strong> contractor billable days`;
  }

  // ── PSI toggle side effects ──────────────────────────────────────────────

  function updatePsiUi() {
    const psiOn = inPtyPsi.checked;

    // Show/hide explainer
    psiExplainer.hidden = !psiOn;

    // Disable retain-profit toggle when PSI is on
    inPtyRetain.disabled = psiOn;
    if (psiOn) inPtyRetain.checked = false;

    // Hint text
    ptyRetainHint.textContent = psiOn
      ? 'Not available — PSI rules attribute income to you personally'
      : 'Pay 25% company tax; take salary + franked dividends';

    // Pros/cons table
    if (psiOn) {
      pcPtyRetain.textContent = '✘ PSI blocks this';
      pcPtyRetain.className   = 'no';
    } else {
      pcPtyRetain.textContent = inPtyRetain.checked ? '✔ Yes (retained)' : '✔ Available';
      pcPtyRetain.className   = 'yes';
    }
  }

  // ── Main recalculate ─────────────────────────────────────────────────────

  function recalculate() {
    const inputs = getInputs();

    try {
      const salary  = Calculator.salaryScenario(inputs);
      const payg    = Calculator.paygScenario(inputs);
      const abn     = Calculator.abnScenario(inputs);
      const pty     = Calculator.ptyLtdScenario(inputs);

      renderSalary(salary);
      renderPayg(payg);
      renderAbn(abn);
      renderPty(pty);
      renderBreakeven(inputs);
      renderDaysSummary(inputs.days);

      // Pros/cons PAYG super row
      pcPaygSuper.textContent = inputs.paygSuperPaid ? '✔ Yes (agency pays)' : '~ Unlikely';
      pcPaygSuper.className   = inputs.paygSuperPaid ? 'yes' : 'no';

    } catch (e) {
      console.error('Calculation error:', e);
    }
  }

  // ── Input synchronisation ────────────────────────────────────────────────

  // Keep hourly ↔ daily in sync when user edits one
  inDailyRate.addEventListener('input', () => {
    inHourlyRate.value = (num(inDailyRate) / (num(inHoursPerDay) || 8)).toFixed(2);
    recalculate();
  });

  inHourlyRate.addEventListener('input', () => {
    inDailyRate.value = (num(inHourlyRate) * (num(inHoursPerDay) || 8)).toFixed(0);
    recalculate();
  });

  inHoursPerDay.addEventListener('input', () => {
    // Recalculate the non-active rate field
    if (rateType === 'daily') {
      inHourlyRate.value = (num(inDailyRate) / (num(inHoursPerDay) || 8)).toFixed(2);
    } else {
      inDailyRate.value = (num(inHourlyRate) * (num(inHoursPerDay) || 8)).toFixed(0);
    }
    recalculate();
  });

  // When in salary mode, keep displayed daily/hourly in sync
  inSalary.addEventListener('input', recalculate);

  // All other inputs
  [
    inAnnualLeave, inPublicHols, inSickLeave, inGapDays,
    inSuperRate, inAbnExpenses, inPtyRunning, inPtyEvCost,
  ].forEach(el => el.addEventListener('input', recalculate));

  [inPrivateHealth, inPaygSuper, inPtyRetain].forEach(el =>
    el.addEventListener('change', recalculate)
  );

  // PSI toggle
  inPtyPsi.addEventListener('change', () => {
    updatePsiUi();
    recalculate();
  });

  // EV toggle
  inPtyEv.addEventListener('change', () => {
    ptyEvCostRow.hidden = !inPtyEv.checked;
    recalculate();
  });

  // ── Mode switches ────────────────────────────────────────────────────────

  btnModeSalary.addEventListener('click', () => {
    inputMode = 'salary';
    btnModeSalary.classList.add('active');
    btnModeRate.classList.remove('active');
    salaryGroup.hidden = false;
    rateGroup.hidden   = true;
    recalculate();
  });

  btnModeRate.addEventListener('click', () => {
    inputMode = 'rate';
    btnModeRate.classList.add('active');
    btnModeSalary.classList.remove('active');
    salaryGroup.hidden = true;
    rateGroup.hidden   = false;
    recalculate();
  });

  btnRateDaily.addEventListener('click', () => {
    rateType = 'daily';
    btnRateDaily.classList.add('active');
    btnRateHourly.classList.remove('active');
    dailyRateRow.hidden  = false;
    hourlyRateRow.hidden = true;
    recalculate();
  });

  btnRateHourly.addEventListener('click', () => {
    rateType = 'hourly';
    btnRateHourly.classList.add('active');
    btnRateDaily.classList.remove('active');
    dailyRateRow.hidden  = true;
    hourlyRateRow.hidden = false;
    recalculate();
  });

  // ── Init ─────────────────────────────────────────────────────────────────

  updatePsiUi();
  recalculate();

})();
