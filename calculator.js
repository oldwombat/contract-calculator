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
 * Total personal tax: income tax only (LITO applied).
 * Medicare Levy and Medicare Levy Surcharge are excluded for simplicity.
 * @param {number} income
 * @returns {number}
 */
function totalPersonalTax(income) {
  return incomeTax(income);
}

// ---------------------------------------------------------------------------
// Days / billable days helpers
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} DaysConfig
 * @property {number} annualLeaveDays     - default 20
 * @property {number} publicHolidayDays   - default 10
 * @property {number} sickLeaveDays       - default 10
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
  return WORKING_DAYS_PER_YEAR - cfg.publicHolidayDays;
}

// ---------------------------------------------------------------------------
// Scenario: Salaried Employee
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} ScenarioInputs
 * @property {number}  salary             - Annual salary excl. super
 * @property {number}  contractDailyRate  - Daily contract rate
 * @property {number}  superRate          - Super rate e.g. 0.115

 * @property {DaysConfig} days
 * // Sole trader
 * @property {number}  abnBusinessExpenses
 * // Pty Ltd
 * @property {number}  ptyCompanyRunningCosts
 * @property {boolean} ptyPsiApplies
 * @property {boolean} ptyRetainProfit       - only relevant when !ptyPsiApplies
 * @property {boolean} ptyEvEnabled
 * @property {number}  ptyEvAnnualCost
 * @property {boolean} superOnTop  - salary/rate is quoted excl. super (super paid on top); false = total package/rate incl. super
 * @property {boolean} gstOnTop   - ABN/Pty rate is quoted excl. GST; show 10% GST as pass-through row
 * @property {number}  paygAgencyFeeRate - agency payroll/admin fee as decimal (e.g. 0.01 = 1%)
 */

/**
 * @typedef {Object} ScenarioResult
 * @property {number} grossIncome
 * @property {number} superEmployer
 * @property {number} taxableIncome
 * @property {number} incomeTax
 * @property {number} totalTax
 * @property {number} netIncome
 * @property {number} effectiveDailyRate
 * @property {number} effectiveHourlyRate
 * @property {number} billableDays
 */

function salaryScenario(inputs) {
  const { salary: rawSalary, superRate, days, superOnTop } = inputs;
  // When superOnTop is false, the entered figure is a total package (incl. super)
  const salary      = (superOnTop === false) ? rawSalary / (1 + superRate) : rawSalary;
  const superAmount = salary * superRate;
  const taxableIncome = salary;
  const taxes         = totalPersonalTax(taxableIncome);
  const netIncome     = salary - taxes;
  const effDays       = salaryEffectiveDays(days);

  return {
    grossIncome:       salary,
    superEmployer:     superAmount,
    totalPackage:      salary + superAmount,
    taxableIncome,
    incomeTax:         taxes,
    totalTax:          taxes,
    netIncome,
    effectiveDailyRate:  salary / effDays,
    effectiveHourlyRate: salary / effDays / days.hoursPerDay,
    billableDays:      effDays,
  };
}

// ---------------------------------------------------------------------------
// Scenario: PAYG Contractor
// ---------------------------------------------------------------------------

function paygScenario(inputs) {
  const { contractDailyRate, superRate, days, superOnTop, paygAgencyFeeRate } = inputs;
  const billable      = contractorBillableDays(days);
  // When superOnTop is false, the rate is quoted inclusive of super — back-calculate base
  const grossIncome   = (superOnTop === false)
    ? contractDailyRate * billable / (1 + superRate)
    : contractDailyRate * billable;
  const superEmployer = grossIncome * superRate;
  const agencyFee     = grossIncome * (paygAgencyFeeRate || 0);
  const taxableIncome = grossIncome - agencyFee;
  const taxes         = totalPersonalTax(taxableIncome);
  const netIncome     = taxableIncome - taxes;

  return {
    grossIncome,
    superEmployer,
    agencyFee,
    totalPackage:    grossIncome + superEmployer,
    taxableIncome,
    incomeTax:       taxes,
    totalTax:        taxes,
    netIncome,
    effectiveDailyRate:  contractDailyRate,
    effectiveHourlyRate: contractDailyRate / days.hoursPerDay,
    billableDays:    billable,
  };
}

// ---------------------------------------------------------------------------
// Scenario: ABN Sole Trader
// ---------------------------------------------------------------------------

function abnScenario(inputs) {
  const { contractDailyRate, superRate, days, abnBusinessExpenses, gstOnTop } = inputs;
  const billable      = contractorBillableDays(days);
  const grossInvoiced = contractDailyRate * billable;
  const gstAmount     = gstOnTop ? grossInvoiced * 0.1 : 0;
  const taxableIncome = Math.max(0, grossInvoiced - abnBusinessExpenses);
  const taxes         = totalPersonalTax(taxableIncome);
  const suggestedSuper = grossInvoiced * superRate;
  const netIncome     = taxableIncome - taxes;

  return {
    grossIncome:         grossInvoiced,
    gstAmount,
    invoiceTotal:        grossInvoiced + gstAmount,
    businessExpenses:    abnBusinessExpenses,
    superEmployer:       0,
    suggestedSuper,
    totalPackage:        grossInvoiced,
    taxableIncome,
    incomeTax:           taxes,
    totalTax:            taxes,
    netIncome,
    effectiveDailyRate:  contractDailyRate,
    effectiveHourlyRate: contractDailyRate / days.hoursPerDay,
    billableDays:        billable,
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
   
    days,
    ptyCompanyRunningCosts,
    ptyPsiApplies,
    ptyRetainProfit,
    ptyEvEnabled,
    ptyEvAnnualCost,
    gstOnTop,
  } = inputs;

  const billable        = contractorBillableDays(days);
  const companyRevenue  = contractDailyRate * billable;
  const gstAmount       = gstOnTop ? companyRevenue * 0.1 : 0;
  const evCost          = ptyEvEnabled ? ptyEvAnnualCost : 0;

  // Total deductible company costs (running costs + EV if applicable)
  const companyCosts    = ptyCompanyRunningCosts + evCost;

  // ── Mode A: PSI applies ──────────────────────────────────────────────────
  if (ptyPsiApplies) {
    // Income attributed to individual — 25% company retention is unavailable.
    // Company pays director a salary equal to (revenue - costs), director
    // pays personal tax at marginal rates. Super is self-funded.
    const directorSalary  = Math.max(0, companyRevenue - companyCosts);
    const suggestedSuper  = directorSalary * superRate;
    const taxes           = totalPersonalTax(directorSalary);
    const netIncome       = directorSalary - taxes;

    return {
      companyRevenue,
      gstAmount,
      invoiceTotal:        companyRevenue + gstAmount,
      companyCosts,
      companyTax:          0,
      directorSalary,
      dividends:           0,
      frankingCredits:     0,
      superEmployer:       0,
      suggestedSuper,
      grossIncome:         directorSalary,
      taxableIncome:       directorSalary,
      incomeTax:           taxes,
      totalTax:            taxes,
      netIncome,
      effectiveDailyRate:  contractDailyRate,
      effectiveHourlyRate: contractDailyRate / days.hoursPerDay,
      billableDays:        billable,
      psiApplies:          true,
      retainProfit:        false,
    };
  }

  // ── Mode B/C: PSI does NOT apply ────────────────────────────────────────
  if (!ptyRetainProfit) {
    // B: Pay full salary — company profit = 0, director pays personal tax on salary
    const directorSalary  = Math.max(0, companyRevenue - companyCosts);
    const suggestedSuper  = directorSalary * superRate;
    const taxes           = totalPersonalTax(directorSalary);
    const netIncome       = directorSalary - taxes;

    return {
      companyRevenue,
      gstAmount,
      invoiceTotal:        companyRevenue + gstAmount,
      companyCosts,
      companyTax:          0,
      directorSalary,
      dividends:           0,
      frankingCredits:     0,
      superEmployer:       0,
      suggestedSuper,
      grossIncome:         directorSalary,
      taxableIncome:       directorSalary,
      incomeTax:           taxes,
      totalTax:            taxes,
      netIncome,
      effectiveDailyRate:  contractDailyRate,
      effectiveHourlyRate: contractDailyRate / days.hoursPerDay,
      billableDays:        billable,
      psiApplies:          false,
      retainProfit:        false,
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
  const personalTaxes     = totalPersonalTax(totalPersonalIncome);
  const personalTaxAfterFC = Math.max(0, personalTaxes - frankingCredits);
  const netIncome         = minDirectorSalary + afterTaxProfit - personalTaxAfterFC;

  const suggestedSuper    = (minDirectorSalary + afterTaxProfit) * superRate;

  return {
    companyRevenue,
    gstAmount,
    invoiceTotal:        companyRevenue + gstAmount,
    companyCosts,
    companyTax,
    directorSalary:      minDirectorSalary,
    dividends:           afterTaxProfit,
    frankingCredits,
    superEmployer:       0,
    suggestedSuper,
    grossIncome:         minDirectorSalary + afterTaxProfit,
    taxableIncome:       totalPersonalIncome,
    incomeTax:           personalTaxes,
    totalTax:            personalTaxAfterFC + companyTax,
    netIncome,
    effectiveDailyRate:  contractDailyRate,
    effectiveHourlyRate: contractDailyRate / days.hoursPerDay,
    billableDays:        billable,
    psiApplies:          false,
    retainProfit:        true,
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

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

// eslint-disable-next-line no-var
var Calculator = {
  // Tax primitives
  incomeTax,
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

  // Constants (useful for UI labels)
  SUPER_GUARANTEE,
  WORKING_DAYS_PER_YEAR,
  GST_REGISTRATION_THRESHOLD,
};
