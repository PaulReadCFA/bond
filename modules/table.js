/**
 * Table Rendering Module
 * Renders accessible data table for bond cash flows
 */

import { $, formatCurrency, announceToScreenReader, applyTableRoles } from './utils.js';

/**
 * Strip USD prefix from formatted currency (for tables with USD in header)
 */
function formatCurrencyNoPrefix(value) {
  return formatCurrency(value).replace('USD ', '');
}

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
      Bond cash flow schedule showing year, yield to maturity, coupon payments,
      principal repayment, and total cash flows. Negative values indicate cash outflows.
    </caption>

    <thead>
      <tr>
        <th scope="col" class="text-left">Year</th>
        <th scope="col" class="text-right table-var-3">Yield to maturity (𝑟)</th>
        <th scope="col" class="text-right table-var-2">Coupon payment (PMT) (USD)</th>
        <th scope="col" class="text-right table-var-4">Principal repayment (FV) (USD)</th>
        <th scope="col" class="text-right">Total cash flow (PMT + FV) (USD)</th>
      </tr>
    </thead>

    <tbody>`;

  // --------------------------------------------------------------
  // 2. Add a row for every cash-flow
  // --------------------------------------------------------------
  // data-label mirrors the column header: it becomes the visible label when the
  // shared base reflows each row into a card below 768px. cell-value keeps the
  // value as a single element so it stays on the right of that label.
  cashFlows.forEach((cf) => {
    html += `
      <tr>
        <th scope="row" class="text-left" data-label="Year">${cf.yearLabel.toFixed(1)}</th>
        <td class="text-right" data-label="Yield to maturity (𝑟)"><span class="cell-value table-var-3">${ytm.toFixed(2)}%</span></td>
        <td class="text-right" data-label="Coupon payment (PMT) (USD)"><span class="cell-value table-var-2">${formatCurrencyNoPrefix(cf.couponPayment)}</span></td>
        <td class="text-right" data-label="Principal repayment (FV) (USD)"><span class="cell-value table-var-4">${formatCurrencyNoPrefix(cf.principalPayment)}</span></td>
        <td class="text-right" data-label="Total cash flow (PMT + FV) (USD)"><span class="cell-value"><strong>${formatCurrencyNoPrefix(cf.totalCashFlow)}</strong></span></td>
      </tr>`;
  });

  // --------------------------------------------------------------
  // 3. Footer with the total bond price
  // --------------------------------------------------------------
  html += `
    </tbody>

    <tfoot>
      <tr>
        <th scope="row" colspan="4" class="text-right">
          Present value of bond (PV) (USD):
        </th>
        <td class="text-right" data-label="Total cash flow (PMT + FV) (USD)"><span class="cell-value"><strong>${formatCurrencyNoPrefix(bondPrice)}</strong></span></td>
      </tr>
    </tfoot>
  `;

  // --------------------------------------------------------------
  // 4. Inject the HTML **once** (no stray attributes)
  // --------------------------------------------------------------
  table.innerHTML = html;
  applyTableRoles(table);

  // Optional: announce the switch to screen-reader users
  announceToScreenReader('Table view loaded with bond cash flows.');
}