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
  
  // Setup sticky observer
  setupStickyObserver();
  
  console.log('Bond Calculator ready');
}

/**
 * Set up skip link handlers for accessibility
 */
function setupSkipLinks() {
  const skipToVisualizer = document.querySelector('a[href="#visualizer"]');
  const skipToCalculator = document.querySelector('a[href="#calculator"]');
  
 // Skip to data table
 if (skipToVisualizer) {
  listen(skipToVisualizer, 'click', (e) => {
    e.preventDefault();
    
    // Switch to table view first
    setState({ viewMode: 'table' });
    updateButtonStates(false);
    
    // Focus the table button - it will scroll itself into view
    setTimeout(() => {
      const tableBtn = $('#table-view-btn');
      if (tableBtn) {
        tableBtn.focus();  // .focus() automatically scrolls element into view
        announceToScreenReader('Jumped to data table');
      }
    }, 100);
  });
}
  
  // Skip to calculator - just use default behavior
  // The browser will scroll to #calculator and focus it (it has tabindex="-1")
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
    
    // Announce to screen readers that calculations are paused
    const errorCount = Object.keys(errors).length;
    const errorWord = errorCount === 1 ? 'error' : 'errors';
    announceToScreenReader(`Calculations paused. ${errorCount} input ${errorWord} detected.`);
    
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
/**
 * Set up chart/table view toggle
 */
function setupViewToggle() {
  const chartBtn = $('#chart-view-btn');
  const tableBtn = $('#table-view-btn');

  // Initialize button states without auto-focusing (page load)
  updateButtonStates(false);

  // Chart button - use addEventListener directly with capture phase
  if (chartBtn) {
    chartBtn.addEventListener('click', (e) => {
      // FIRST: Check if narrow screen before anything else
      const isForced = document.body.classList.contains('force-table');
      
      if (isForced || chartBtn.disabled) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        console.log('Chart button blocked - narrow screen detected');
        
        // Visual feedback: briefly highlight table button
        if (tableBtn) {
          tableBtn.style.transition = 'transform 0.2s ease';
          tableBtn.style.transform = 'scale(1.05)';
          setTimeout(() => {
            tableBtn.style.transform = 'scale(1)';
          }, 200);
        }
        
        // Force table view
        setState({ viewMode: 'table' });
        updateButtonStates();
        
        return false;
      }
      
      // Normal behavior - allow chart view
      setState({ viewMode: 'chart' });
      updateButtonStates();
    }, true); // Use capture phase
  }

  listen(tableBtn, 'click', () => {
    setState({ viewMode: 'table' });
    updateButtonStates();
  });

  // Keyboard navigation between toggle buttons
  [chartBtn, tableBtn].forEach(btn => {
    if (!btn) return;
    btn.tabIndex = 0;
    
    // Remove old listener if exists
    if (btn._keydownListener) {
      btn.removeEventListener('keydown', btn._keydownListener);
    }
    
    // Create new listener
    const keydownListener = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        const next = btn === chartBtn ? tableBtn : chartBtn;
        
        // Don't allow switching to chart if it's disabled
        if (next.disabled) {
          return;
        }
        
        next.focus();
        setState({ viewMode: next.id === 'chart-view-btn' ? 'chart' : 'table' });
        updateButtonStates(false);  // Don't auto-focus - keep focus on button
      }
    };
    
    // Store and add listener
    btn._keydownListener = keydownListener;
    btn.addEventListener('keydown', keydownListener);
  });
}

/**
 * Update button states based on current view and screen width
 * @param {boolean} autoFocus - Whether to automatically focus the container
 */
function updateButtonStates(autoFocus = true) {
  const chartBtn = $('#chart-view-btn');
  const tableBtn = $('#table-view-btn');
  const chartContainer = $('#chart-container');
  const tableContainer = $('#table-container');
  const legend = $('#chart-legend');
  const isForced = document.body.classList.contains('force-table');
  const currentView = isForced ? 'table' : state.viewMode;

  if (!chartBtn || !tableBtn) return;

  // Update active states
  chartBtn.classList.toggle('active', currentView === 'chart');
  tableBtn.classList.toggle('active', currentView === 'table');
  
  // Update aria-pressed
  chartBtn.setAttribute('aria-pressed', currentView === 'chart');
  tableBtn.setAttribute('aria-pressed', currentView === 'table');
  
  // Disable chart button when forced to table
  chartBtn.disabled = isForced;
  
  // Show/hide containers based on view
  if (currentView === 'chart') {
    if (chartContainer) chartContainer.style.display = 'block';
    if (tableContainer) tableContainer.style.display = 'none';
    if (legend) legend.style.display = 'flex';
    
    // Announce change
    announceToScreenReader('Chart view active');
    
    // Only auto-focus if requested (not for keyboard navigation)
    if (autoFocus) {
      focusElement(chartContainer, 100);
    }
    
  } else {
    if (tableContainer) tableContainer.style.display = 'block';
    if (chartContainer) chartContainer.style.display = 'none';
    if (legend) legend.style.display = 'none';
    
    // Announce change
    announceToScreenReader('Table view active');
    
    // Only auto-focus if requested (not for keyboard navigation)
    if (autoFocus) {
      focusElement($('#cash-flow-table'), 100);
    }
  }
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
  const { bondCalculations, viewMode, errors } = newState;
  
  // Update visual state based on validation errors
  const resultsCard = $('#results-card');
  const visualizerSection = $('#visualizer');
  const equationCard = $('#equation-card');
  
  if (hasErrors(errors)) {
    // Add dimmed state class
    if (resultsCard) resultsCard.classList.add('has-validation-errors');
    if (visualizerSection) visualizerSection.classList.add('has-validation-errors');
    if (equationCard) equationCard.classList.add('has-validation-errors');
  } else {
    // Remove dimmed state class
    if (resultsCard) resultsCard.classList.remove('has-validation-errors');
    if (visualizerSection) visualizerSection.classList.remove('has-validation-errors');
    if (equationCard) equationCard.classList.remove('has-validation-errors');
  }
  
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
      detectNarrowScreen();
      
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
  detectNarrowScreen();
}

/**
 * Handle responsive view switching based on viewport width
 */
/**
 * Detect narrow screen and force table view
 */
function detectNarrowScreen() {
  const narrow = window.innerWidth <= 600;
  
  if (narrow) {
    document.body.classList.add('force-table');
    if (state.viewMode !== 'table') {
      setState({ viewMode: 'table' });
    }
  } else {
    document.body.classList.remove('force-table');
  }
  
  updateButtonStates(false);  // Don't auto-focus on resize
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
          console.log(`Ã¢Å“â€œ ${test.name} passed`);
        } else {
          console.warn(`Ã¢Å“â€” ${test.name} failed: expected ${test.expected.price}, got ${result.bondPrice}`);
        }
      } else if (test.expected.priceShouldBe === 'greater than 100') {
        if (result.bondPrice > 100) {
          console.log(`Ã¢Å“â€œ ${test.name} passed`);
        } else {
          console.warn(`Ã¢Å“â€” ${test.name} failed: price should be > 100, got ${result.bondPrice}`);
        }
      } else if (test.expected.priceShouldBe === 'less than 100') {
        if (result.bondPrice < 100) {
          console.log(`Ã¢Å“â€œ ${test.name} passed`);
        } else {
          console.warn(`Ã¢Å“â€” ${test.name} failed: price should be < 100, got ${result.bondPrice}`);
        }
      }
    } catch (error) {
      console.error(`Ã¢Å“â€” ${test.name} threw error:`, error);
    }
  });
  
  console.log('Self-tests complete');
}


// =============================================================================
// STICKY CALCULATOR OBSERVER
// =============================================================================

/**
 * Detect when calculator becomes stuck and add visual feedback
 */
function setupStickyObserver() {
  const wrapper = document.querySelector('.sticky-calculator-wrapper');
  if (!wrapper) return;
  
  // Create a sentinel element at the top
  const sentinel = document.createElement('div');
  sentinel.style.position = 'absolute';
  sentinel.style.top = '-1px';
  sentinel.style.height = '1px';
  sentinel.style.width = '100%';
  sentinel.style.pointerEvents = 'none';
  wrapper.insertBefore(sentinel, wrapper.firstChild);
  
  // Observe the sentinel
  const observer = new IntersectionObserver(
    ([entry]) => {
      // When sentinel is not visible, calculator is stuck
      if (entry.intersectionRatio < 1) {
        wrapper.classList.add('is-stuck');
      } else {
        wrapper.classList.remove('is-stuck');
      }
    },
    { threshold: [1], rootMargin: '0px' }
  );
  
  observer.observe(sentinel);
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