/**
 * Bond Valuation Calculator - Main Entry Point
 * CFA Institute - Vanilla JavaScript Implementation
 * 
 * This calculator demonstrates bond valuation using present value calculations.
 * Built with accessibility (WCAG 2.1 AA) and maintainability in mind.
 */

import { state, setState, subscribe } from './modules/state.js';
import { calculateBondMetrics } from './modules/calculations.js';
import { 
  validateAllInputs, 
  validateField, 
  updateFieldError, 
  updateValidationSummary,
  hasErrors 
} from './modules/validation.js';
import { 
  $, 
  listen, 
  focusElement, 
  announceToScreenReader,
  debounce,
  formatCurrency
} from './modules/utils.js';
import { renderChart, shouldShowLabels, destroyChart } from './modules/chart.js';
import { renderTable } from './modules/table.js';
import { renderResults } from './modules/results.js';
import { renderDynamicEquation } from './modules/equation.js';

// =============================================================================
// INITIALIZATION
// =============================================================================

/**
 * Initialize the calculator when DOM is ready
 */
function init() {
  console.log('Bond Calculator initializing...');
  
  // Set up input event listeners
  setupInputListeners();
  
  // Set up view toggle listeners
  setupViewToggle();
  
  // Set up skip link handlers
  setupSkipLinks();
  
  // Set up window resize listener for chart labels
  setupResizeListener();
  
  // Subscribe to state changes
  subscribe(handleStateChange);
  
  // Initial calculation
  updateCalculations();
  
  // Run self-tests
  runSelfTests();
  
  console.log('Bond Calculator ready');
}

/**
 * Set up skip link handlers for accessibility
 */
function setupSkipLinks() {
  const skipToVisualizer = document.querySelector('a[href="#visualizer"]');
  
  if (skipToVisualizer) {
    listen(skipToVisualizer, 'click', (e) => {
      // Prevent default to handle it ourselves
      e.preventDefault();
      
      // Switch to table view
      switchView('table');
      
      // Scroll the section into view
      const section = $('#visualizer');
      if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      
      // Focus the table after switching
      setTimeout(() => {
        const table = $('#cash-flow-table');
        if (table) {
          table.focus();
        }
      }, 400);
    });
  }
}

// =============================================================================
// INPUT HANDLING
// =============================================================================

/**
 * Set up event listeners for input fields
 */
function setupInputListeners() {
  const inputs = [
    { id: 'coupon-rate', field: 'couponRate' },
    { id: 'ytm', field: 'ytm' },
    { id: 'years', field: 'years' }
  ];
  
  inputs.forEach(({ id, field }) => {
    const input = $(`#${id}`);
    if (!input) return;
    
    // Update state on input change (debounced)
    const debouncedUpdate = debounce(() => {
      const value = parseFloat(input.value);
      
      // Validate field
      const error = validateField(field, value);
      updateFieldError(id, error);
      
      // Update state
      const errors = { ...state.errors };
      if (error) {
        errors[field] = error;
      } else {
        delete errors[field];
      }
      
      setState({
        [field]: value,
        errors
      });
      
      // Update validation summary
      updateValidationSummary(errors);
      
      // Recalculate if no errors
      if (!hasErrors(errors)) {
        updateCalculations();
      }
    }, 300);
    
    listen(input, 'input', debouncedUpdate);
    listen(input, 'change', debouncedUpdate);
  });
}

/**
 * Update bond calculations based on current state
 */
function updateCalculations() {
  const { couponRate, ytm, years, faceValue, frequency, errors } = state;
  
  // Don't calculate if there are validation errors
  if (hasErrors(errors)) {
    setState({ bondCalculations: null });
    return;
  }
  
  try {
    // Calculate bond metrics
    const calculations = calculateBondMetrics({
      faceValue,
      couponRate,
      ytm,
      years,
      frequency
    });
    
    // Update state with calculations
    setState({ bondCalculations: calculations });
    
  } catch (error) {
    console.error('Calculation error:', error);
    setState({ bondCalculations: null });
  }
}

// =============================================================================
// VIEW TOGGLE (CHART/TABLE)
// =============================================================================

/**
 * Set up chart/table view toggle
 */
function setupViewToggle() {
  const chartBtn = $('#chart-view-btn');
  const tableBtn = $('#table-view-btn');
  
  if (!chartBtn || !tableBtn) {
    console.error('Toggle buttons not found');
    return;
  }
  
  listen(chartBtn, 'click', () => switchView('chart'));
  listen(tableBtn, 'click', () => switchView('table'));
}

/**
 * Switch between chart and table views
 * @param {string} view - 'chart' or 'table'
 */
function switchView(view) {
  const chartBtn = $('#chart-view-btn');
  const tableBtn = $('#table-view-btn');
  const chartContainer = $('#chart-container');
  const tableContainer = $('#table-container');
  const legend = $('#chart-legend');
  
  // Update state
  setState({ viewMode: view });
  
  // Update button states
  if (view === 'chart') {
    chartBtn.classList.add('active');
    chartBtn.setAttribute('aria-pressed', 'true');
    tableBtn.classList.remove('active');
    tableBtn.setAttribute('aria-pressed', 'false');
    
    // Show chart, hide table
    chartContainer.style.display = 'block';
    tableContainer.style.display = 'none';
    legend.style.display = 'flex';
    
    // Announce change
    announceToScreenReader('Chart view active');
    
    // Focus chart container
    focusElement(chartContainer, 100);
    
  } else {
    tableBtn.classList.add('active');
    tableBtn.setAttribute('aria-pressed', 'true');
    chartBtn.classList.remove('active');
    chartBtn.setAttribute('aria-pressed', 'false');
    
    // Show table, hide chart
    tableContainer.style.display = 'block';
    chartContainer.style.display = 'none';
    legend.style.display = 'none';
    
    // Announce change
    announceToScreenReader('Table view active');
    
    // Focus table
    focusElement($('#cash-flow-table'), 100);
  }
}

// =============================================================================
// RENDERING
// =============================================================================

/**
 * Handle state changes and update UI
 * @param {Object} newState - Updated state
 */
function handleStateChange(newState) {
  const { bondCalculations, viewMode } = newState;
  
  if (!bondCalculations) {
    // Clear displays if no calculations
    return;
  }
  
  // Update results section
  renderResults(bondCalculations, {
    faceValue: newState.faceValue,
    couponRate: newState.couponRate,
    ytm: newState.ytm,
    years: newState.years
  });
  
  // Update dynamic equation
  renderDynamicEquation(bondCalculations, {
    faceValue: newState.faceValue,
    couponRate: newState.couponRate,
    ytm: newState.ytm,
    years: newState.years
  });
  
  // Update chart if in chart view
  if (viewMode === 'chart') {
    const showLabels = shouldShowLabels();
    renderChart(
      bondCalculations.cashFlows, 
      showLabels, 
      newState.ytm,
      bondCalculations.periodicCoupon
    );
  }
  
  // Always update table (even if hidden)
  renderTable(
    bondCalculations.cashFlows,
    bondCalculations.bondPrice,
    bondCalculations.periods,
    bondCalculations.periodicCoupon,
    newState.ytm
  );
}

// =============================================================================
// WINDOW RESIZE HANDLING
// =============================================================================

/**
 * Set up window resize listener for responsive chart labels
 */
function setupResizeListener() {
  let resizeTimeout;
  
  listen(window, 'resize', () => {
    // Debounce resize events
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      handleResponsiveView();
      
      if (state.viewMode === 'chart' && state.bondCalculations) {
        const showLabels = shouldShowLabels();
        renderChart(
          state.bondCalculations.cashFlows, 
          showLabels,
          state.ytm,
          state.bondCalculations.periodicCoupon
        );
      }
    }, 250);
  });
  
  // Initial check
  handleResponsiveView();
}

/**
 * Handle responsive view switching based on viewport width
 */
function handleResponsiveView() {
  const chartBtn = $('#chart-view-btn');
  const tableBtn = $('#table-view-btn');
  const viewportWidth = window.innerWidth;
  
  // At very narrow widths (< 600px), force table view and disable chart button
  if (viewportWidth < 600) {
    if (state.viewMode === 'chart') {
      switchView('table');
    }
    
    // Disable chart button
    if (chartBtn) {
      chartBtn.disabled = true;
      chartBtn.setAttribute('aria-disabled', 'true');
      chartBtn.title = 'Chart view not available at this screen size';
    }
    if (tableBtn) {
      tableBtn.disabled = false;
      tableBtn.removeAttribute('aria-disabled');
      tableBtn.title = '';
    }
  } else {
    // Re-enable chart button at wider widths
    if (chartBtn) {
      chartBtn.disabled = false;
      chartBtn.removeAttribute('aria-disabled');
      chartBtn.title = '';
    }
  }
}

// =============================================================================
// SELF-TESTS
// =============================================================================

/**
 * Run self-tests to verify calculations
 */
function runSelfTests() {
  console.log('Running self-tests...');
  
  const tests = [
    {
      name: 'Par bond pricing',
      inputs: { faceValue: 100, couponRate: 6, ytm: 6, years: 5, frequency: 2 },
      expected: { price: 100, tolerance: 0.2 }
    },
    {
      name: 'Premium bond pricing',
      inputs: { faceValue: 100, couponRate: 8, ytm: 6, years: 5, frequency: 2 },
      expected: { priceShouldBe: 'greater than 100' }
    },
    {
      name: 'Discount bond pricing',
      inputs: { faceValue: 100, couponRate: 4, ytm: 6, years: 5, frequency: 2 },
      expected: { priceShouldBe: 'less than 100' }
    }
  ];
  
  tests.forEach(test => {
    try {
      const result = calculateBondMetrics(test.inputs);
      
      if (test.expected.price !== undefined) {
        const diff = Math.abs(result.bondPrice - test.expected.price);
        if (diff <= test.expected.tolerance) {
          console.log(`✓ ${test.name} passed`);
        } else {
          console.warn(`✗ ${test.name} failed: expected ${test.expected.price}, got ${result.bondPrice}`);
        }
      } else if (test.expected.priceShouldBe === 'greater than 100') {
        if (result.bondPrice > 100) {
          console.log(`✓ ${test.name} passed`);
        } else {
          console.warn(`✗ ${test.name} failed: price should be > 100, got ${result.bondPrice}`);
        }
      } else if (test.expected.priceShouldBe === 'less than 100') {
        if (result.bondPrice < 100) {
          console.log(`✓ ${test.name} passed`);
        } else {
          console.warn(`✗ ${test.name} failed: price should be < 100, got ${result.bondPrice}`);
        }
      }
    } catch (error) {
      console.error(`✗ ${test.name} threw error:`, error);
    }
  });
  
  console.log('Self-tests complete');
}

// =============================================================================
// CLEANUP
// =============================================================================

/**
 * Cleanup function (called on page unload)
 */
function cleanup() {
  destroyChart();
  console.log('Calculator cleanup complete');
}

// Register cleanup
window.addEventListener('beforeunload', cleanup);

// =============================================================================
// START THE APPLICATION
// =============================================================================

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  // DOM is already ready
  init();
}

// Export for potential external use
export { state, setState, updateCalculations };