/**
 * Table Rendering Module
 * Renders accessible data table for bond cash flows
 */

import { $, formatCurrency, announceToScreenReader } from './utils.js';

/**
 * Render cash flow table
 * @param {Array} cashFlows - Array of cash flow objects
 * @param {number} bondPrice - Bond price
 * @param {number} periods - Number of periods
 * @param {number} periodicCoupon - Periodic coupon payment
 * @param {number} ytm - Yield to maturity percentage
 */
export function renderTable(cashFlows, bondPrice, periods, periodicCoupon, ytm) {
  const table = $('#cash-flow-table');

  if (!table) {
    console.error('Table element not found');
    return;
  }

  // --------------------------------------------------------------
  // 1. Build the HTML string (template literals are safe here)
  // --------------------------------------------------------------
  let html = `
    <caption class="sr-only">
      Bond cash flow schedule showing period, year, yield to maturity, coupon payments,
      principal repayment, and total cash flows. Note: Values in parentheses indicate negative cash flows.
    </caption>

    <thead>
      <tr>
        <th scope="col" class="text-left">Period</th>
        <th scope="col" class="text-left">Year</th>
        <th scope="col" class="text-right">Yield-to-maturity <span style="color: #7a46ff;">(r)</span></th>
        <th scope="col" class="text-right">Coupon payment <span style="color: #3c6ae5;">(PMT)</span></th>
        <th scope="col" class="text-right">Principal repayment <span style="color: #0079a6;">(FV)</span></th>
        <th scope="col" class="text-right">Total Cash Flow <span style="color: #3c6ae5;">(PMT)</span> + <span style="color: #0079a6;">(FV)</span></th>
      </tr>
    </thead>

    <tbody>`;

  // --------------------------------------------------------------
  // 2. Add a row for every cash-flow
  // --------------------------------------------------------------
  cashFlows.forEach((cf, index) => {
    const isInitial = index === 0;
    const isFinal   = index === cashFlows.length - 1;

    html += `
      <tr>
        <td class="text-left" data-label="${cf.period}">${cf.period}</td>
        <td class="text-left" data-label="Year">${cf.yearLabel.toFixed(1)}</td>
        <td class="text-right" style="color: #7a46ff;" data-label="Yield-to-maturity (r)" data-tooltip="Annual yield-to-maturity rate">${ytm.toFixed(2)}%</td>
        <td class="text-right" style="color: #3c6ae5;" data-label="Coupon Payment (PMT)" data-tooltip="Annual coupon payment = Face Value × (Coupon Rate / Payment Frequency)">${formatCurrency(cf.couponPayment)}</td>
        <td class="text-right" style="color: #0079a6;" data-label="Principal Repayment (FV)" data-tooltip="${isInitial ? 'Initial bond purchase price (negative cash flow)' : (isFinal ? 'Face value returned at maturity = $100.00' : 'No principal payment until maturity')}">${formatCurrency(cf.principalPayment)}</td>
        <td class="text-right" data-label="Total Cash Flow" data-tooltip="${isInitial ? 'Amount paid to purchase bond' : 'Coupon payment' + (isFinal ? ' + Face value' : '') + ' = ' + formatCurrency(cf.totalCashFlow)}"><strong>${formatCurrency(cf.totalCashFlow)}</strong></td>
      </tr>`;
  });

  // --------------------------------------------------------------
  // 3. Footer with the total bond price
  // --------------------------------------------------------------
  html += `
    </tbody>

    <tfoot>
      <tr style="background-color: #ffffff;">
        <td colspan="5" class="text-right" style="color: #b95b1d;">
          <strong>Bond Price <span style="color: #b95b1d;">(PV</span> of all cash flows):</strong>
        </td>
        <td class="text-right" style="color: #b95b1d;" data-tooltip="Sum of present values of all future cash flows, discounted at the yield-to-maturity rate"><strong>${formatCurrency(bondPrice)}</strong></td>
      </tr>
    </tfoot>
  `;

  // --------------------------------------------------------------
  // 4. Inject the HTML **once** (no stray attributes)
  // --------------------------------------------------------------
  table.innerHTML = html;

  // --------------------------------------------------------------
  // 5. Add accessibility attributes **programmatically**
  // --------------------------------------------------------------
  // Note: The table itself is NOT focusable (no tabindex).
  // Individual cells with tooltips are focusable (role="button").
  // This provides better keyboard navigation and avoids ARIA conflicts.
  table.setAttribute('aria-label', 'Bond cash flow table');
  // Note: Don't add role="table" - native <table> semantics are better
  // and avoid ARIA conflicts with <caption>, <thead>, etc.

  // Optional: announce the switch to screen-reader users
  announceToScreenReader('Table view loaded with bond cash flows.');
  
  // Note: Escape key functionality removed since table cells are not focusable
  // Tooltips work on hover only, maintaining table semantics
}

/**
 * Set up Escape key to exit table and move to next section
 */
function setupTableKeyboardEscape() {
  const table = document.getElementById('cash-flow-table');
  
  if (!table) return;
  
  // Remove old listener if exists
  if (table._escapeListener) {
    table.removeEventListener('keydown', table._escapeListener);
  }
  
  const escapeListener = (e) => {
    // Press Escape to jump out of table to calculator section
    if (e.key === 'Escape') {
      e.preventDefault();
      const calculator = document.getElementById('calculator');
      if (calculator) {
        calculator.focus();
        announceToScreenReader('Exited table, moved to calculator section');
      }
    }
  };
  
  table._escapeListener = escapeListener;
  table.addEventListener('keydown', escapeListener);
}