/**
 * Table Rendering Module
 * Renders accessible data table for bond cash flows
 */

console.log('TABLE.JS VERSION: 2024-12-18-11:30 - NO COLORS IN CELLS');

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
      Bond cash flow schedule showing year, yield to maturity, coupon payments,
      principal repayment, and total cash flows. Note: Values in parentheses indicate negative cash flows.
    </caption>

    <thead>
      <tr>
        <th scope="col" class="text-left">Year</th>
        <th scope="col" class="text-right">Yield-to-maturity (<span style="color: #7a46ff; font-style: italic;">r</span>)</th>
        <th scope="col" class="text-right">Coupon payment (<span style="color: #3c6ae5;">PMT</span>)</th>
        <th scope="col" class="text-right">Principal repayment (<span style="color: #0079a6;">FV</span>)</th>
        <th scope="col" class="text-right">Total cash flow (<span style="color: #3c6ae5;">PMT</span>) + (<span style="color: #0079a6;">FV</span>)</th>
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
        <td class="text-left" data-label="Year">${cf.yearLabel.toFixed(1)}</td>
        <td class="text-right" data-label="Yield-to-maturity (r)">${ytm.toFixed(2)}%</td>
        <td class="text-right" data-label="Coupon payment (PMT)">${formatCurrency(cf.couponPayment)}</td>
        <td class="text-right" data-label="Principal repayment (FV)">${formatCurrency(cf.principalPayment)}</td>
        <td class="text-right" data-label="Total Cash Flow"><strong>${formatCurrency(cf.totalCashFlow)}</strong></td>
      </tr>`;
  });

  // --------------------------------------------------------------
  // 3. Footer with the total bond price
  // --------------------------------------------------------------
  html += `
    </tbody>

    <tfoot>
      <tr style="background-color: #ffffff;">
        <td colspan="4" class="text-right">
          <strong>Present value of bond (<span style="color: #b95b1d;">PV</span>):</strong>
        </td>
        <td class="text-right"><strong style="color: #b95b1d;">${formatCurrency(bondPrice)}</strong></td>
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
  // Make table focusable for skip links
  table.setAttribute('tabindex', '-1');
  table.setAttribute('aria-label', 'Bond cash flow table');

  // For mobile: Restore table semantics when using display:block
  // CSS display:block breaks native table semantics, so we add ARIA roles
  updateTableSemantics(table);
  
  // Update ARIA roles on window resize
  // Store the listener so we can remove it if table is re-rendered
  if (table._resizeListener) {
    window.removeEventListener('resize', table._resizeListener);
  }
  
  const resizeListener = debounce(() => {
    updateTableSemantics(table);
  }, 250);
  
  table._resizeListener = resizeListener;
  window.addEventListener('resize', resizeListener);

  // Optional: announce the switch to screen-reader users
  announceToScreenReader('Table view loaded with bond cash flows.');
}

/**
 * Simple debounce helper
 */
function debounce(fn, wait) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn.apply(this, args), wait);
  };
}

/**
 * Update table semantics based on viewport width
 * @param {HTMLTableElement} table - The table element
 */
function updateTableSemantics(table) {
  const isMobile = window.innerWidth <= 768;
  
  if (isMobile) {
    // Add ARIA roles to restore table semantics
    restoreTableSemantics(table);
  } else {
    // Remove ARIA roles on desktop - native semantics work fine
    removeTableSemantics(table);
  }
}

/**
 * Restore table semantics on mobile when CSS uses display:block
 * @param {HTMLTableElement} table - The table element
 */
function restoreTableSemantics(table) {
  // Main table role
  table.setAttribute('role', 'table');
  
  // Header section
  const thead = table.querySelector('thead');
  if (thead) {
    thead.setAttribute('role', 'rowgroup');
    thead.querySelectorAll('tr').forEach(tr => {
      tr.setAttribute('role', 'row');
      tr.querySelectorAll('th').forEach(th => {
        th.setAttribute('role', 'columnheader');
      });
    });
  }
  
  // Body section
  const tbody = table.querySelector('tbody');
  if (tbody) {
    tbody.setAttribute('role', 'rowgroup');
    tbody.querySelectorAll('tr').forEach(tr => {
      tr.setAttribute('role', 'row');
      tr.querySelectorAll('td').forEach(td => {
        td.setAttribute('role', 'cell');
      });
    });
  }
  
  // Footer section
  const tfoot = table.querySelector('tfoot');
  if (tfoot) {
    tfoot.setAttribute('role', 'rowgroup');
    tfoot.querySelectorAll('tr').forEach(tr => {
      tr.setAttribute('role', 'row');
      tr.querySelectorAll('td').forEach(td => {
        td.setAttribute('role', 'cell');
      });
    });
  }
}

/**
 * Remove ARIA table roles on desktop (native semantics work better)
 * @param {HTMLTableElement} table - The table element
 */
function removeTableSemantics(table) {
  // Remove main table role
  table.removeAttribute('role');
  
  // Remove all ARIA roles from table elements
  const elements = table.querySelectorAll('[role]');
  elements.forEach(el => {
    // Only remove table-related roles, keep aria-label on table
    const role = el.getAttribute('role');
    if (['table', 'rowgroup', 'row', 'columnheader', 'cell'].includes(role)) {
      el.removeAttribute('role');
    }
  });
}