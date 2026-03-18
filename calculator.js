/**
 * calculator.js — Pure calculation functions for the Australian Contract Calculator.
 * No DOM access. All figures are annual unless otherwise noted.
 * Tax year: 2024-25
 */

// ---------------------------------------------------------------------------
// Tax constants (2024-25)
// ---------------------------------------------------------------------------

// 2024-25 individual tax rates (Treasury Laws Amendment — Cost of Living Tax Cuts Act 2024)
// 16c/30c/37c/45c brackets; top threshold raised to $190,001
const TAX_BRACKETS = [
  { threshold: 190001, base: 51638, rate: 0.45 },
  { threshold: 135001, base: 31288, rate: 0.37 },
  { threshold:  45001, base:  4288, rate: 0.30 },
  { threshold:  18201, base:     0, rate: 0.16 },
  { threshold:      0, base:     0, rate: 0.00 },
];

const COMPANY_TAX_RATE = 0.25;
const SUPER_GUARANTEE  = 0.115; // 2024-25
const MEDICARE_RATE    = 0.02;
const MEDICARE_SHADE_IN_THRESHOLD  = 26000;
const MEDICARE_FULL_THRESHOLD      = 32500;  // approx — shade-in complete
const MLS_THRESHOLD                = 93000;
const GST_REGISTRATION_THRESHOLD   = 75000;
const WORKING_DAYS_PER_YEAR        = 260;

// ---------------------------------------------------------------------------
// Core tax functions
// ---------------------------------------------------------------------------

/**
 * Calculate Australian income tax for 2024-25.
 * @param {number} income - Taxable income in AUD
 * @returns {number} Tax payable (before offsets)
 */
function incomeTaxGross(income) {
  if (income <= 0) return 0;
  for (const bracket of TAX_BRACKETS) {
    if (income >= bracket.threshold) {
      return bracket.base + (income - bracket.threshold + 1) * bracket.rate;
    }
  }
  return 0;
}

/**
 * Low Income Tax Offset (LITO) for 2024-25.
 * - Full $700 offset up to $37,500
 * - Reduces by 5c per $1 between $37,500 and $45,000
 * - Reduces by 1.5c per $1 between $45,000 and $66,667
 * @param {number} income
 * @returns {number} LITO amount
 */
function lito(income) {
  if (income <= 37500) return 700;
  if (income <= 45000) return 700 - (income - 37500) * 0.05;
  if (income <= 66667) return 325 - (income - 45000) * 0.015;
  return 0;
}

/**
 * Net income tax after LITO.
 * @param {number} income
 * @returns {number} Net tax payable (floored at 0)
 */
function incomeTax(income) {
  return Math.max(0, incomeTaxGross(income) - lito(income));
}

/**
 * Medicare Levy.
 * - Nil below shade-in threshold
 * - Shades in at 10c per $1 from $26,000 until full 2% kicks in
 * @param {number} income
 * @returns {number} Medicare levy
 */
function medicareLevy(income) {
  if (income <= MEDICARE_SHADE_IN_THRESHOLD) return 0;
  if (income <= MEDICARE_FULL_THRESHOLD) {
    // 10% shade-in rate applies to excess over threshold
    return Math.min((income - MEDICARE_SHADE_IN_THRESHOLD) * 0.10, income * MEDICARE_RATE);
  }
  return income * MEDICARE_RATE;
}

/**
 * Medicare Levy Surcharge (MLS).
 * Only applies if no private hospital cover and income > $93,000.
 * @param {number} income
 * @param {boolean} hasPrivateHealth
 * @returns {number} MLS amount
 */
function medicareLevySurcharge(income, hasPrivateHealth) {
  if (hasPrivateHealth || income <= MLS_THRESHOLD) return 0;
  if (income <= 108000) return income * 0.01;
  if (income <= 144000) return income * 0.0125;
  return income * 0.015;
}

/**
 * Total tax burden: income tax + medicare levy + MLS.
 * @param {number} income
 * @param {boolean} hasPrivateHealth
 * @returns {{ incomeTax: number, medicare: number, mls: number, total: number }}
 */
function totalPersonalTax(income, hasPrivateHealth) {
  const tax      = incomeTax(income);
  const medicare = medicareLevy(income);
  const mls      = medicareLevySurcharge(income, hasPrivateHealth);
  return { incomeTax: tax, medicare, mls, total: tax + medicare + mls };
}

// ---------------------------------------------------------------------------
// Days / billable days helpers
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} DaysConfig
 * @property {number} annualLeaveDays     - default 20
 * @property {number} publicHolidayDays   - default 10
 * @property {number} sickLeaveDays       - default 10
 * @property {number} contractorGapDays   - default 15
 * @property {number} hoursPerDay         - default 8
 */

/**
 * Working days available to a salary employee (all leave is paid).
 * Used only for effective-rate display, not for income calculation.
 */
function salaryEffectiveDays(cfg) {
  return WORKING_DAYS_PER_YEAR - cfg.annualLeaveDays - cfg.publicHolidayDays;
}

/**
 * Billable days for a contractor per year.
 * Contractors are not paid for leave or public holidays; gaps between
 * contracts are also unbillable.
 */
function contractorBillableDays(cfg) {
  return WORKING_DAYS_PER_YEAR - cfg.publicHolidayDays - cfg.contractorGapDays;
}

// ---------------------------------------------------------------------------
// Scenario: Salaried Employee
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} ScenarioInputs
 * @property {number}  salary             - Annual salary excl. super
 * @property {number}  contractDailyRate  - Daily contract rate
 * @property {number}  superRate          - Super rate e.g. 0.115
 * @property {boolean} hasPrivateHealth
 * @property {DaysConfig} days
 * // Sole trader
 * @property {number}  abnBusinessExpenses
 * // Pty Ltd
 * @property {number}  ptyCompanyRunningCosts
 * @property {boolean} ptyPsiApplies
 * @property {boolean} ptyRetainProfit       - only relevant when !ptyPsiApplies
 * @property {boolean} ptyEvEnabled
 * @property {number}  ptyEvAnnualCost
 * @property {boolean} paygSuperPaid         - agency pays super
 */

/**
 * @typedef {Object} ScenarioResult
 * @property {number} grossIncome
 * @property {number} superEmployer
 * @property {number} taxableIncome
 * @property {number} incomeTax
 * @property {number} medicare
 * @property {number} mls
 * @property {number} totalTax
 * @property {number} netIncome
 * @property {number} effectiveDailyRate
 * @property {number} effectiveHourlyRate
 * @property {number} billableDays
 * @property {string[]} notes
 */

function salaryScenario(inputs) {
  const { salary, superRate, hasPrivateHealth, days } = inputs;
  const superAmount   = salary * superRate;
  const taxableIncome = salary;
  const taxes         = totalPersonalTax(taxableIncome, hasPrivateHealth);
  const netIncome     = salary - taxes.total;
  const effDays       = salaryEffectiveDays(days);
  const notes         = [];

  if (salary > GST_REGISTRATION_THRESHOLD) {
    // not relevant for salary, just informational
  }

  return {
    grossIncome:       salary,
    superEmployer:     superAmount,
    totalPackage:      salary + superAmount,
    taxableIncome,
    incomeTax:         taxes.incomeTax,
    medicare:          taxes.medicare,
    mls:               taxes.mls,
    totalTax:          taxes.total,
    netIncome,
    effectiveDailyRate:  salary / effDays,
    effectiveHourlyRate: salary / effDays / days.hoursPerDay,
    billableDays:      effDays,
    notes,
  };
}

// ---------------------------------------------------------------------------
// Scenario: PAYG Contractor
// ---------------------------------------------------------------------------

function paygScenario(inputs) {
  const { contractDailyRate, superRate, hasPrivateHealth, days, paygSuperPaid } = inputs;
  const billable      = contractorBillableDays(days);
  const grossIncome   = contractDailyRate * billable;
  const superEmployer = paygSuperPaid ? grossIncome * superRate : 0;
  const taxableIncome = grossIncome;
  const taxes         = totalPersonalTax(taxableIncome, hasPrivateHealth);
  const netIncome     = grossIncome - taxes.total;
  const notes         = [];

  if (!paygSuperPaid) {
    notes.push('No employer super. Consider setting aside ' +
      fmt(grossIncome * superRate) + '/yr (' + pct(superRate) + ') yourself.');
  }
  if (grossIncome > GST_REGISTRATION_THRESHOLD) {
    notes.push('Income may exceed $75k GST threshold — check with your agency.');
  }

  return {
    grossIncome,
    superEmployer,
    totalPackage:    grossIncome + superEmployer,
    taxableIncome,
    incomeTax:       taxes.incomeTax,
    medicare:        taxes.medicare,
    mls:             taxes.mls,
    totalTax:        taxes.total,
    netIncome,
    effectiveDailyRate:  contractDailyRate,
    effectiveHourlyRate: contractDailyRate / days.hoursPerDay,
    billableDays:    billable,
    notes,
  };
}

// ---------------------------------------------------------------------------
// Scenario: ABN Sole Trader
// ---------------------------------------------------------------------------

function abnScenario(inputs) {
  const { contractDailyRate, superRate, hasPrivateHealth, days, abnBusinessExpenses } = inputs;
  const billable      = contractorBillableDays(days);
  const grossInvoiced = contractDailyRate * billable;
  const taxableIncome = Math.max(0, grossInvoiced - abnBusinessExpenses);
  const taxes         = totalPersonalTax(taxableIncome, hasPrivateHealth);
  const suggestedSuper = grossInvoiced * superRate;
  const netIncome     = taxableIncome - taxes.total;
  const notes         = [];

  if (grossInvoiced > GST_REGISTRATION_THRESHOLD) {
    notes.push('Gross invoiced exceeds $75k — GST registration required. ' +
      'Charge +10% GST to clients and remit quarterly. ' +
      'GST is not shown here as it is pass-through.');
  }
  notes.push('No employer super. Suggested voluntary super: ' +
    fmt(suggestedSuper) + '/yr (' + pct(superRate) + ' of gross).');
  notes.push('PSI rules may restrict home-office deductions. ' +
    'Income is already taxed at marginal rates so the financial impact is minor.');

  return {
    grossIncome:         grossInvoiced,
    businessExpenses:    abnBusinessExpenses,
    superEmployer:       0,
    suggestedSuper,
    totalPackage:        grossInvoiced,
    taxableIncome,
    incomeTax:           taxes.incomeTax,
    medicare:            taxes.medicare,
    mls:                 taxes.mls,
    totalTax:            taxes.total,
    netIncome,
    effectiveDailyRate:  contractDailyRate,
    effectiveHourlyRate: contractDailyRate / days.hoursPerDay,
    billableDays:        billable,
    notes,
  };
}

// ---------------------------------------------------------------------------
// Scenario: Pty Ltd Company
// ---------------------------------------------------------------------------

/**
 * Pty Ltd — two sub-modes:
 *
 * A) PSI applies (default):
 *    Income is attributed to the individual at marginal rates regardless of
 *    company structure. Profit retention at 25% is NOT available.
 *    Company still pays director salary; deductions and FBT-EV still apply.
 *
 * B) PSI does NOT apply + retainProfit = false (full salary):
 *    Company takes revenue, deducts costs + director salary, profit = ~0.
 *    Director pays personal tax on their salary.
 *
 * C) PSI does NOT apply + retainProfit = true:
 *    Company retains profit, pays 25% company tax.
 *    Director takes a modest salary; remaining profit paid as franked dividend.
 *    Personal tax on dividend reduced by franking credit (25/75 of dividend).
 */
function ptyLtdScenario(inputs) {
  const {
    contractDailyRate,
    superRate,
    hasPrivateHealth,
    days,
    ptyCompanyRunningCosts,
    ptyPsiApplies,
    ptyRetainProfit,
    ptyEvEnabled,
    ptyEvAnnualCost,
  } = inputs;

  const billable        = contractorBillableDays(days);
  const companyRevenue  = contractDailyRate * billable;
  const evCost          = ptyEvEnabled ? ptyEvAnnualCost : 0;

  // Total deductible company costs (running costs + EV if applicable)
  const companyCosts    = ptyCompanyRunningCosts + evCost;

  const notes = [];

  // ── Mode A: PSI applies ──────────────────────────────────────────────────
  if (ptyPsiApplies) {
    // Income attributed to individual — 25% company retention is unavailable.
    // Company pays director a salary equal to (revenue - costs), director
    // pays personal tax at marginal rates. Super is self-funded.
    const directorSalary  = Math.max(0, companyRevenue - companyCosts);
    const suggestedSuper  = directorSalary * superRate;
    const taxes           = totalPersonalTax(directorSalary, hasPrivateHealth);
    const netIncome       = directorSalary - taxes.total;

    notes.push('PSI rules apply: income is attributed to you personally. ' +
      'Profit cannot be retained at the 25% company tax rate.');
    notes.push('Company still provides legitimate deductions: running costs, accountant fees, insurance.');
    if (ptyEvEnabled) {
      notes.push('FBT-exempt EV: ' + fmt(evCost) + '/yr paid by company pre-tax. ' +
        'This saves approximately ' + fmt(evCost * marginalRate(directorSalary)) +
        ' in personal tax (unaffected by PSI rules).');
    }
    notes.push('Suggested voluntary super: ' + fmt(suggestedSuper) + '/yr.');

    return {
      companyRevenue,
      companyCosts,
      companyTax:          0,
      directorSalary,
      dividends:           0,
      frankingCredits:     0,
      superEmployer:       0,
      suggestedSuper,
      grossIncome:         directorSalary,
      taxableIncome:       directorSalary,
      incomeTax:           taxes.incomeTax,
      medicare:            taxes.medicare,
      mls:                 taxes.mls,
      totalTax:            taxes.total,
      netIncome,
      effectiveDailyRate:  contractDailyRate,
      effectiveHourlyRate: contractDailyRate / days.hoursPerDay,
      billableDays:        billable,
      psiApplies:          true,
      retainProfit:        false,
      notes,
    };
  }

  // ── Mode B/C: PSI does NOT apply ────────────────────────────────────────
  if (!ptyRetainProfit) {
    // B: Pay full salary — company profit = 0, director pays personal tax on salary
    const directorSalary  = Math.max(0, companyRevenue - companyCosts);
    const suggestedSuper  = directorSalary * superRate;
    const taxes           = totalPersonalTax(directorSalary, hasPrivateHealth);
    const netIncome       = directorSalary - taxes.total;

    if (ptyEvEnabled) {
      notes.push('FBT-exempt EV: ' + fmt(evCost) + '/yr paid by company pre-tax, saving ~' +
        fmt(evCost * marginalRate(directorSalary)) + ' in personal tax.');
    }
    notes.push('PSI does not apply. Full salary drawn from company — no profit retained.');
    notes.push('Suggested voluntary super: ' + fmt(suggestedSuper) + '/yr.');

    return {
      companyRevenue,
      companyCosts,
      companyTax:          0,
      directorSalary,
      dividends:           0,
      frankingCredits:     0,
      superEmployer:       0,
      suggestedSuper,
      grossIncome:         directorSalary,
      taxableIncome:       directorSalary,
      incomeTax:           taxes.incomeTax,
      medicare:            taxes.medicare,
      mls:                 taxes.mls,
      totalTax:            taxes.total,
      netIncome,
      effectiveDailyRate:  contractDailyRate,
      effectiveHourlyRate: contractDailyRate / days.hoursPerDay,
      billableDays:        billable,
      psiApplies:          false,
      retainProfit:        false,
      notes,
    };
  }

  // C: Retain profit — company pays 25%, director takes minimal salary + franked dividends
  // Strategy: director takes salary up to the $45,000 threshold (19% bracket top)
  // to use the lower bracket, rest is retained as company profit then paid as dividend.
  const minDirectorSalary = Math.min(45000, Math.max(0, companyRevenue - companyCosts));
  const companyProfit     = Math.max(0, companyRevenue - companyCosts - minDirectorSalary);
  const companyTax        = companyProfit * COMPANY_TAX_RATE;
  const afterTaxProfit    = companyProfit - companyTax;

  // Franked dividend: grossed up by franking credit
  const frankingCredits   = afterTaxProfit * (COMPANY_TAX_RATE / (1 - COMPANY_TAX_RATE));
  const grossedUpDividend = afterTaxProfit + frankingCredits;

  // Personal tax on total personal income (salary + grossed-up dividend)
  const totalPersonalIncome = minDirectorSalary + grossedUpDividend;
  const personalTaxes     = totalPersonalTax(totalPersonalIncome, hasPrivateHealth);
  const personalTaxAfterFC = Math.max(0, personalTaxes.total - frankingCredits);
  const netIncome         = minDirectorSalary + afterTaxProfit - personalTaxAfterFC;

  const suggestedSuper    = (minDirectorSalary + afterTaxProfit) * superRate;

  notes.push('PSI does not apply. Profit retained in company at 25% company tax rate.');
  notes.push('Director takes $' + minDirectorSalary.toLocaleString() +
    ' salary + ' + fmt(afterTaxProfit) + ' as a franked dividend.');
  notes.push('Franking credits of ' + fmt(frankingCredits) +
    ' offset personal tax on dividends.');
  if (ptyEvEnabled) {
    notes.push('FBT-exempt EV: ' + fmt(evCost) + '/yr paid by company pre-tax.');
  }
  notes.push('Note: company profits not distributed remain in the company and are ' +
    'not personally accessible until paid as salary or dividend.');

  return {
    companyRevenue,
    companyCosts,
    companyTax,
    directorSalary:      minDirectorSalary,
    dividends:           afterTaxProfit,
    frankingCredits,
    superEmployer:       0,
    suggestedSuper,
    grossIncome:         minDirectorSalary + afterTaxProfit,
    taxableIncome:       totalPersonalIncome,
    incomeTax:           personalTaxes.incomeTax,
    medicare:            personalTaxes.medicare,
    mls:                 personalTaxes.mls,
    totalTax:            personalTaxAfterFC + companyTax,
    netIncome,
    effectiveDailyRate:  contractDailyRate,
    effectiveHourlyRate: contractDailyRate / days.hoursPerDay,
    billableDays:        billable,
    psiApplies:          false,
    retainProfit:        true,
    notes,
  };
}

// ---------------------------------------------------------------------------
// Break-even calculations
// ---------------------------------------------------------------------------

/**
 * Given a salary, calculate the minimum contractor daily rate to break even.
 * "Break-even" means: contractor net income >= salary employee net income,
 * accounting for days worked and super.
 *
 * Simple approach: match the total package (salary + super) across billable days.
 * This is the gross break-even. Net break-even requires iterative solving since
 * tax changes with the rate — we use the gross package / billable days as a
 * conservative reference point that users can understand.
 *
 * @returns {{ dailyRate: number, hourlyRate: number, totalPackage: number }}
 */
function breakEvenFromSalary(inputs) {
  const { salary, superRate, days } = inputs;
  const totalPackage = salary * (1 + superRate);
  const billable     = contractorBillableDays(days);
  const dailyRate    = totalPackage / billable;
  const hourlyRate   = dailyRate / days.hoursPerDay;
  return { dailyRate, hourlyRate, totalPackage };
}

/**
 * Given a contractor daily rate, calculate the equivalent salary package.
 * Equivalent salary = daily rate × billable days (no super loaded in, since
 * contractor must fund their own).
 *
 * @returns {{ equivalentSalary: number, equivalentPackage: number }}
 */
function equivalentSalaryFromRate(inputs) {
  const { contractDailyRate, superRate, days } = inputs;
  const billable          = contractorBillableDays(days);
  const equivalentPackage = contractDailyRate * billable;
  const equivalentSalary  = equivalentPackage / (1 + superRate);
  return { equivalentSalary, equivalentPackage };
}

// ---------------------------------------------------------------------------
// Utility helpers (used in notes strings above and exported for app.js)
// ---------------------------------------------------------------------------

function marginalRate(income) {
  for (const bracket of TAX_BRACKETS) {
    if (income >= bracket.threshold) return bracket.rate;
  }
  return 0;
}

function fmt(n) {
  return '$' + Math.round(n).toLocaleString('en-AU');
}

function pct(r) {
  return (r * 100).toFixed(1) + '%';
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

// eslint-disable-next-line no-var
var Calculator = {
  // Tax primitives
  incomeTax,
  medicareLevy,
  medicareLevySurcharge,
  totalPersonalTax,
  lito,
  marginalRate,

  // Days
  salaryEffectiveDays,
  contractorBillableDays,

  // Scenarios
  salaryScenario,
  paygScenario,
  abnScenario,
  ptyLtdScenario,

  // Break-even
  breakEvenFromSalary,
  equivalentSalaryFromRate,

  // Formatting
  fmt,
  pct,

  // Constants (useful for UI labels)
  SUPER_GUARANTEE,
  WORKING_DAYS_PER_YEAR,
  GST_REGISTRATION_THRESHOLD,
};
