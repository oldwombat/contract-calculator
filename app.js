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
  const inHoursPerDay = $('hours-per-day');
  const daysSummary   = $('days-summary');

  // Rates & offsets
  const inSuperRate     = $('super-rate');
  const inSuperOnTop    = $('super-on-top');

  // PAYG
  const inPaygAgencyFee = $('payg-agency-fee');

  // ABN
  const inAbnExpenses = $('abn-expenses');
  const inGstOnTop    = $('gst-on-top');

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
  const breakevenBox  = $('breakeven-box');
  const resultsTbody  = $('results-tbody');
  const ptyBadge      = $('pty-badge');
  const pcPaygSuper   = $('pc-payg-super');
  const pcPtyRetain   = $('pc-pty-retain');

  // Buttons
  const btnReset = $('btn-reset');
  const btnCsv   = $('btn-csv');

  // ── State ───────────────────────────────────────────────────────────────

  let inputMode   = 'salary';  // 'salary' | 'rate'
  let rateType    = 'daily';   // 'daily'  | 'hourly'
  let lastResults = null;      // { salary, payg, abn, pty } — for CSV

  // ── localStorage persistence ─────────────────────────────────────────────

  const STORAGE_KEY = 'contractCalc_v4';

  // All number inputs and checkboxes we want to persist
  const NUMBER_INPUTS = [
    'salary','daily-rate','hourly-rate',
    'annual-leave','public-holidays','sick-leave','hours-per-day',
    'super-rate','payg-agency-fee','abn-expenses','pty-running-costs','pty-ev-cost'
  ];
  const CHECKBOX_INPUTS = [
    'super-on-top','gst-on-top','pty-psi','pty-retain','pty-ev'
  ];

  function saveState() {
    try {
      const state = { inputMode, rateType };
      NUMBER_INPUTS.forEach(id => {
        const el = $(id);
        if (el) state[id] = el.value;
      });
      CHECKBOX_INPUTS.forEach(id => {
        const el = $(id);
        if (el) state[id] = el.checked;
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) { /* storage unavailable — silent fail */ }
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const state = JSON.parse(raw);

      // Restore mode buttons first (they control visibility)
      if (state.inputMode === 'rate') {
        inputMode = 'rate';
        btnModeRate.classList.add('active');
        btnModeSalary.classList.remove('active');
        salaryGroup.hidden = true;
        rateGroup.hidden   = false;
      }
      if (state.rateType === 'hourly') {
        rateType = 'hourly';
        btnRateHourly.classList.add('active');
        btnRateDaily.classList.remove('active');
        dailyRateRow.hidden  = true;
        hourlyRateRow.hidden = false;
      }

      NUMBER_INPUTS.forEach(id => {
        const el = $(id);
        if (el && state[id] !== undefined) el.value = state[id];
      });
      CHECKBOX_INPUTS.forEach(id => {
        const el = $(id);
        if (el && state[id] !== undefined) el.checked = state[id];
      });

      // Re-apply derived UI state from restored checkboxes
      ptyEvCostRow.hidden = !inPtyEv.checked;
    } catch (e) { /* corrupted data — silent fail */ }
  }

  function resetState() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
    location.reload();
  }

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

  // ── Input reading ────────────────────────────────────────────────────────

  function getDaysConfig() {
    return {
      annualLeaveDays:   num(inAnnualLeave),
      publicHolidayDays: num(inPublicHols),
      sickLeaveDays:     num(inSickLeave),
      hoursPerDay:       num(inHoursPerDay) || 8,
    };
  }

  function getDailyRate() {
    const days = getDaysConfig();
    if (inputMode === 'salary') {
      // derive daily rate from salary using break-even formula
      // when superOnTop is false, the entered salary is a total package — use base salary
      const rawSalary = num(inSalary);
      const sr = num(inSuperRate) / 100;
      const baseSalary = inSuperOnTop.checked ? rawSalary : rawSalary / (1 + sr);
      const be = Calculator.breakEvenFromSalary({
        salary:    baseSalary,
        superRate: sr,
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
      superOnTop:           inSuperOnTop.checked,
      days,
      gstOnTop:             inGstOnTop.checked,
      abnBusinessExpenses:  num(inAbnExpenses),
      ptyCompanyRunningCosts: num(inPtyRunning),
      ptyPsiApplies:        inPtyPsi.checked,
      ptyRetainProfit:      inPtyRetain.checked && !inPtyPsi.checked,
      ptyEvEnabled:         inPtyEv.checked,
      ptyEvAnnualCost:      num(inPtyEvCost),
      paygAgencyFeeRate:    num(inPaygAgencyFee) / 100,
    };
  }

  // ── Render helpers ───────────────────────────────────────────────────────

  // ── Results table renderer ───────────────────────────────────────────────

  const D = '—'; // placeholder for n/a cells

  function trow(label, s, p, a, t, rowCls, cellCls) {
    const cc = cellCls || ['', '', '', ''];
    return `<tr class="${rowCls || ''}">
      <th scope="row">${label}</th>
      <td class="${cc[0]}">${s != null ? s : D}</td>
      <td class="${cc[1]}">${p != null ? p : D}</td>
      <td class="${cc[2]}">${a != null ? a : D}</td>
      <td class="${cc[3]}">${t != null ? t : D}</td>
    </tr>`;
  }

  function renderResults(salary, payg, abn, pty, inputs) {
    const deduct = ['deduction', 'deduction', 'deduction', 'deduction'];
    const showPtyCo    = pty.companyTax > 0 || pty.dividends > 0;
    const hasSelfSuper = abn.suggestedSuper > 0 || pty.suggestedSuper > 0;
    const showGst      = inputs.gstOnTop && (abn.gstAmount > 0 || pty.gstAmount > 0);
    const grossLabel   = inputs.gstOnTop ? 'Gross income (ex-GST)' : 'Gross income';

    let rows = '';

    // ── Income section ───────────────────────────────────────────────────
    rows += trow('Days / year',
      salary.billableDays, payg.billableDays, abn.billableDays, pty.billableDays,
      'section-top');

    rows += trow(grossLabel,
      fmtCurrency(salary.grossIncome), fmtCurrency(payg.grossIncome),
      fmtCurrency(abn.grossIncome),    fmtCurrency(pty.companyRevenue));

    if (payg.agencyFee > 0)
      rows += trow('Agency payroll fee',
        D, '−' + fmtCurrency(payg.agencyFee), D, D,
        '', ['', 'deduction', '', '']);

    if (showGst) {
      rows += trow('GST charged to client (10%)',
        D, D,
        abn.gstAmount > 0 ? '+' + fmtCurrency(abn.gstAmount) : D,
        pty.gstAmount > 0 ? '+' + fmtCurrency(pty.gstAmount) : D,
        'row-muted', ['', '', 'muted', 'muted']);
      rows += trow('Invoice total (incl. GST)',
        D, D,
        abn.invoiceTotal > 0 ? fmtCurrency(abn.invoiceTotal) : D,
        pty.invoiceTotal > 0 ? fmtCurrency(pty.invoiceTotal) : D,
        'row-muted', ['', '', 'muted positive', 'muted positive']);
    }

    rows += trow('Employer / agency super',
      fmtCurrency(salary.superEmployer),
      payg.superEmployer > 0 ? fmtCurrency(payg.superEmployer) : D,
      D, D, '', ['positive', payg.superEmployer > 0 ? 'positive' : '', '', '']);

    if (abn.businessExpenses > 0)
      rows += trow('Business expenses',
        D, D, '−' + fmtCurrency(abn.businessExpenses), D,
        '', ['', '', 'deduction', '']);

    rows += trow('Total package',
      fmtCurrency(salary.totalPackage),
      payg.superEmployer > 0 ? fmtCurrency(payg.grossIncome + payg.superEmployer) : D,
      D, D, 'row-muted', ['muted', 'muted', '', '']);

    // ── Company section (Pty Ltd) ────────────────────────────────────────
    if (showPtyCo) {
      rows += trow('Company costs',
        D, D, D, '−' + fmtCurrency(pty.companyCosts),
        'section-top', ['', '', '', 'deduction']);
      rows += trow('Company tax (25%)',
        D, D, D, '−' + fmtCurrency(pty.companyTax),
        '', ['', '', '', 'deduction']);
      rows += trow('Director salary',
        D, D, D, fmtCurrency(pty.directorSalary));
      if (pty.dividends > 0) {
        rows += trow('Franked dividend',
          D, D, D, fmtCurrency(pty.dividends),
          '', ['', '', '', 'positive']);
        rows += trow('Franking credits',
          D, D, D, '+' + fmtCurrency(pty.frankingCredits),
          '', ['', '', '', 'positive muted']);
      }
    }

    // ── Tax section ──────────────────────────────────────────────────────
    rows += trow('Taxable income',
      fmtCurrency(salary.taxableIncome), fmtCurrency(payg.taxableIncome),
      fmtCurrency(abn.taxableIncome),    fmtCurrency(pty.taxableIncome),
      'section-top');

    rows += trow('Income tax', deductFmt(salary.incomeTax), deductFmt(payg.incomeTax),
      deductFmt(abn.incomeTax), deductFmt(pty.incomeTax), '', deduct);

    if (pty.frankingCredits > 0)
      rows += trow('Less: franking credits',
        D, D, D, '−' + fmtCurrency(pty.frankingCredits),
        '', ['', '', '', 'positive muted']);

    // ── Net result ───────────────────────────────────────────────────────
    rows += trow('Net take-home (annual)',
      fmtCurrency(salary.netIncome), fmtCurrency(payg.netIncome),
      fmtCurrency(abn.netIncome),    fmtCurrency(pty.netIncome),
      'section-top highlight-row',
      ['net-salary', 'net-payg', 'net-abn', 'net-pty']);

    rows += trow('Monthly take-home',
      fmtCurrency(salary.netIncome / 12), fmtCurrency(payg.netIncome / 12),
      fmtCurrency(abn.netIncome / 12),    fmtCurrency(pty.netIncome / 12),
      '', ['net-salary', 'net-payg', 'net-abn', 'net-pty']);

    rows += trow('Weekly take-home',
      fmtCurrency(salary.netIncome / 52), fmtCurrency(payg.netIncome / 52),
      fmtCurrency(abn.netIncome / 52),    fmtCurrency(pty.netIncome / 52),
      '', ['net-salary', 'net-payg', 'net-abn', 'net-pty']);

    rows += trow('Daily take-home',
      fmtCurrency(salary.netIncome / salary.billableDays),
      fmtCurrency(payg.netIncome   / payg.billableDays),
      fmtCurrency(abn.netIncome    / abn.billableDays),
      fmtCurrency(pty.netIncome    / pty.billableDays),
      '', ['net-salary', 'net-payg', 'net-abn', 'net-pty']);

    if (hasSelfSuper)
      rows += trow('Suggested super (self-fund)',
        D, D,
        abn.suggestedSuper > 0 ? fmtCurrency(abn.suggestedSuper) : D,
        pty.suggestedSuper > 0 ? fmtCurrency(pty.suggestedSuper) : D,
        '', ['', '', 'muted', 'muted']);

    // ── Effective rates ──────────────────────────────────────────────────
    rows += trow('Effective daily rate',
      fmtCurrency(salary.effectiveDailyRate), fmtCurrency(payg.effectiveDailyRate),
      fmtCurrency(abn.effectiveDailyRate),    fmtCurrency(pty.effectiveDailyRate),
      'section-top');

    rows += trow('Effective hourly rate',
      fmtCurrency(salary.effectiveHourlyRate), fmtCurrency(payg.effectiveHourlyRate),
      fmtCurrency(abn.effectiveHourlyRate),    fmtCurrency(pty.effectiveHourlyRate));

    resultsTbody.innerHTML = rows;

    // Pty Ltd badge in column header
    ptyBadge.textContent  = pty.psiApplies  ? '⚠ PSI Applies'   :
                            pty.retainProfit ? 'Retain Profit'   : 'Full Salary';
    ptyBadge.className    = 'scenario-sub ' + (pty.psiApplies    ? 'badge-warn' :
                            pty.retainProfit                     ? 'badge-ok'   : '');
  }

  function deductFmt(n) {
    return n > 0 ? '−' + fmtCurrency(n) : D;
  }

  // ── CSV export ───────────────────────────────────────────────────────────

  function downloadCSV() {
    if (!lastResults) return;
    const { salary, payg, abn, pty } = lastResults;

    const rows = [
      ['', 'Salaried Employee', 'PAYG Contractor', 'ABN Sole Trader', 'Pty Ltd Company'],
      ['Days / year', salary.billableDays, payg.billableDays, abn.billableDays, pty.billableDays],
      ['Gross income', salary.grossIncome, payg.grossIncome, abn.grossIncome, pty.companyRevenue],
      ['Agency payroll fee', '', -(payg.agencyFee || 0) || '', '', ''],
      ['Employer / agency super', salary.superEmployer, payg.superEmployer || '', '', ''],
      ['Business expenses', '', '', abn.businessExpenses || '', ''],
      ['Total package', salary.totalPackage, '', '', ''],
      ['Company costs', '', '', '', pty.companyCosts || ''],
      ['Company tax (25%)', '', '', '', pty.companyTax || ''],
      ['Director salary', '', '', '', pty.directorSalary || ''],
      ['Franked dividend', '', '', '', pty.dividends || ''],
      ['Taxable income', salary.taxableIncome, payg.taxableIncome, abn.taxableIncome, pty.taxableIncome],
      ['Income tax', -salary.incomeTax, -payg.incomeTax, -abn.incomeTax, -pty.incomeTax],
      ['Net take-home (annual)', salary.netIncome, payg.netIncome, abn.netIncome, pty.netIncome],
      ['Monthly take-home', salary.netIncome/12, payg.netIncome/12, abn.netIncome/12, pty.netIncome/12],
      ['Weekly take-home', salary.netIncome/52, payg.netIncome/52, abn.netIncome/52, pty.netIncome/52],
      ['Daily take-home', salary.netIncome/salary.billableDays, payg.netIncome/payg.billableDays, abn.netIncome/abn.billableDays, pty.netIncome/pty.billableDays],
      ['Suggested super (self-fund)', '', '', abn.suggestedSuper || '', pty.suggestedSuper || ''],
      ['Effective daily rate', salary.effectiveDailyRate, payg.effectiveDailyRate, abn.effectiveDailyRate, pty.effectiveDailyRate],
      ['Effective hourly rate', salary.effectiveHourlyRate, payg.effectiveHourlyRate, abn.effectiveHourlyRate, pty.effectiveHourlyRate],
    ];

    const csv = rows.map(r =>
      r.map(cell => '"' + String(cell).replace(/"/g, '""') + '"').join(',')
    ).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'contract-calculator.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
      ? fmtCurrency(rate) + '/day'
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
          <span class="be-value">${fmtCurrency(be.dailyRate)}/day</span>
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

      lastResults = { salary, payg, abn, pty };

      renderResults(salary, payg, abn, pty, inputs);
      renderBreakeven(inputs);
      renderDaysSummary(inputs.days);

      // Pros/cons super row
      pcPaygSuper.textContent = inputs.superOnTop ? '✔ Yes (legally required)' : '~ Included in rate';
      pcPaygSuper.className   = inputs.superOnTop ? 'yes' : 'partial';

    } catch (e) {
      console.error('Calculation error:', e);
    }
    saveState();
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
    inAnnualLeave, inPublicHols, inSickLeave,
    inSuperRate, inPaygAgencyFee, inAbnExpenses, inPtyRunning, inPtyEvCost,
  ].forEach(el => el.addEventListener('input', recalculate));

  [inSuperOnTop, inGstOnTop, inPtyRetain].forEach(el =>
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

  loadState();       // restore saved inputs before first render
  updatePsiUi();
  recalculate();

  btnReset.addEventListener('click', resetState);
  btnCsv.addEventListener('click', downloadCSV);

})();
