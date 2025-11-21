/**
 * Chart Module
 * Chart rendering using Chart.js with keyboard accessibility
 */

import { formatCurrency } from './utils.js';

// CFA Brand Colors (WCAG AA verified)
const COLORS = {
  coupon: '#3369FF',      // 4.55:1 contrast
  mint: '#49b2b8',
  purchase: '#f2af81',
  darkText: '#06005a'
};

let chartInstance = null;
let currentFocusIndex = 0;
let isKeyboardMode = false;

/**
 * Create or update bond cash flow chart
 * @param {Array} cashFlows - Array of cash flow objects
 * @param {boolean} showLabels - Whether to show value labels
 * @param {number} ytm - Yield to maturity (for horizontal line)
 * @param {number} periodicCoupon - Periodic coupon payment (for legend)
 */
export function renderChart(cashFlows, showLabels = true, ytm = null, periodicCoupon = null) {
  const canvas = document.getElementById('bond-chart');
  
  if (!canvas) {
    console.error('Chart canvas not found');
    return;
  }
  
  // Make canvas focusable and add keyboard navigation
  canvas.setAttribute('tabindex', '0');
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-roledescription', 'interactive chart');
  canvas.setAttribute(
    'aria-label',
    'Interactive chart. Press Enter to focus, then use arrow keys to explore data points.'
  );

  const ctx = canvas.getContext('2d');
  
  // Prepare data for Chart.js
  const labels = cashFlows.map(cf => cf.yearLabel);

  
  // Separate coupon and principal data
  const couponData = cashFlows.map(cf => cf.couponPayment);
  const principalData = cashFlows.map(cf => cf.principalPayment);
  
  // Calculate total for labels
  const totalData = cashFlows.map(cf => cf.totalCashFlow);
  
  // Destroy existing chart instance
  if (chartInstance) {
    chartInstance.destroy();
  }
  
  // Reset focus index
  currentFocusIndex = 0;
  
  // Create new chart with custom label drawing
  chartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Principal repayment',
          data: principalData,
          backgroundColor: principalData.map(val => 
            val >= 0 ? COLORS.mint : COLORS.purchase
          ),
          borderWidth: 0,
          stack: 'cashflow',
          yAxisID: 'y',
          order: 1  // Higher order = rendered behind
        },
        {
          label: 'Coupon payment',
          data: couponData,
          backgroundColor: COLORS.coupon,
          borderWidth: 0,
          stack: 'cashflow',
          yAxisID: 'y',
          order: 1  // Higher order = rendered behind
        },
        // YTM horizontal line
        ...(ytm !== null ? [{
          label: 'Yield-to-maturity (r)',
          data: labels.map(() => ytm),
          type: 'line',
          borderColor: '#7a46ff',
          borderWidth: 3,
          borderDash: [5, 5],
          pointRadius: 0,
          pointHoverRadius: 0,
          fill: false,
          yAxisID: 'y2',
          order: 0  // Lower order = rendered on top
        }] : [])
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
onHover: (event, activeElements) => {
  // Skip if keyboard focus already active
  if (isKeyboardMode && document.activeElement === canvas) return;

  // Announce hovered data point
  if (activeElements.length > 0) {
    const index = activeElements[0].index;
    announceDataPoint(cashFlows[index], totalData[index]);
  }
}

,
      plugins: {
        title: {
          display: false
        },
        legend: {
          display: false // Using custom legend in HTML
        },
        tooltip: {
          callbacks: {
            title: (context) => {
              const index = context[0].dataIndex;
              return `Period: ${cashFlows[index].yearLabel} years`;
            },
            label: (context) => {
              const value = context.parsed.y;
              // Check if this is the YTM line
              if (context.dataset.label === 'Yield-to-maturity (r)') {
                return `${context.dataset.label}: ${value.toFixed(2)}%`;
              }
              return `${context.dataset.label}: ${formatCurrency(value, true)}`;
            },
            footer: (context) => {
              const index = context[0].dataIndex;
              const total = totalData[index];
              // Only show total for cash flow bars, not YTM line
              if (context[0].dataset.label !== 'Yield-to-maturity (r)') {
                return `Total: ${formatCurrency(total, true)}`;
              }
              return '';
            }
          }
        }
      },
      scales: {
        x: {
          title: {
            display: true,
            text: 'Years'
          },
          grid: {
            display: false
          }
        },
        y: {
          title: {
            display: false
          },
          position: 'left',
          ticks: {
            callback: function(value) {
              return formatCurrency(value);
            }
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.05)'
          }
        },
        y2: {
          title: {
            display: true,
            text: 'Rate (%)',
            color: '#7a46ff'
          },
          position: 'right',
          min: 0,
          max: ytm ? Math.max(12, ytm * 1.2) : 12,
          ticks: {
            callback: function(value) {
              return value.toFixed(1) + '%';
            },
            color: '#7a46ff'
          },
          grid: {
            display: false
          }
        }
      },
      layout: {
        padding: {
          left: 20, // Important for zoom support (not 50)
          right: 30,
          top: showLabels ? 40 : 20, // More top padding for labels
          bottom: 60
        }
      }
    },
    plugins: [{
      // Custom plugin to draw labels on top of stacked bars
      id: 'stackedBarLabels',
      afterDatasetsDraw: (chart) => {
        if (!showLabels) return;
        
        const ctx = chart.ctx;
        ctx.save();
        ctx.font = 'bold 11px sans-serif';
        ctx.fillStyle = COLORS.darkText;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        
        // Find the highest positive bar to align negative labels
        const meta0 = chart.getDatasetMeta(0);
        const meta1 = chart.getDatasetMeta(1);
        
        let maxPositiveY = chart.scales.y.top;
        chart.data.labels.forEach((label, index) => {
          const total = totalData[index];
          if (total > 0 && meta0.data[index] && meta1.data[index]) {
            const topY = Math.min(meta0.data[index].y, meta1.data[index].y);
            maxPositiveY = Math.max(maxPositiveY, topY);
          }
        });
        
        chart.data.labels.forEach((label, index) => {
          const total = totalData[index];
          if (Math.abs(total) < 0.01) return;
          
          if (!meta0.data[index] || !meta1.data[index]) return;
          
          const bar0 = meta0.data[index];
          const bar1 = meta1.data[index];
          
          const x = bar1.x;
          let y;
          
          if (total < 0) {
            // For negative bars, align with the positive labels
            y = maxPositiveY - 5;
          } else {
            // For positive bars, place above the bar as before
            y = Math.min(bar0.y, bar1.y) - 5;
          }
          
          // Draw the label (use parentheses for negative values)
          ctx.fillText(formatCurrency(total, false), x, y);
        });
        
        ctx.restore();
      }
    },
    {
      // Keyboard focus highlight plugin
      id: 'keyboardFocus',
      afterDatasetsDraw: (chart) => {
        if (document.activeElement !== canvas) return;
        
        const ctx = chart.ctx;
        const meta0 = chart.getDatasetMeta(0);
        const meta1 = chart.getDatasetMeta(1);
        
        if (!meta0.data[currentFocusIndex] || !meta1.data[currentFocusIndex]) return;
        
        const bar0 = meta0.data[currentFocusIndex];
        const bar1 = meta1.data[currentFocusIndex];
        
        // Find the actual top and bottom of the stacked bars
        const allYValues = [bar0.y, bar0.base, bar1.y, bar1.base];
        const topY = Math.min(...allYValues);
        const bottomY = Math.max(...allYValues);
        
        // Draw focus indicator
        ctx.save();
        ctx.strokeStyle = COLORS.darkText;
        ctx.lineWidth = 3;
        ctx.setLineDash([5, 5]);
        
        const x = bar1.x - bar1.width / 2 - 4;
        const y = topY - 4;
        const width = bar1.width + 8;
        const height = bottomY - topY + 8;
        
        ctx.strokeRect(x, y, width, height);
        ctx.restore();
      }
    }
  ]
  });
  
  // Add keyboard navigation
  setupKeyboardNavigation(canvas, cashFlows, totalData);
}

/**
 * Setup keyboard navigation for the chart
 * @param {HTMLCanvasElement} canvas - The chart canvas
 * @param {Array} cashFlows - Array of cash flow objects
 * @param {Array} totalData - Array of total values
 */
function setupKeyboardNavigation(canvas, cashFlows, totalData) {
  // Remove existing listeners to avoid duplicates
  const oldListener = canvas._keydownListener;
  if (oldListener) {
    canvas.removeEventListener('keydown', oldListener);
  }
  
  // Create new listener
  const keydownListener = (e) => {
    const maxIndex = cashFlows.length - 1;
    let newIndex = currentFocusIndex;
    
    // Enable keyboard mode on any arrow key press
    isKeyboardMode = true;
    
    switch(e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        e.preventDefault();
        newIndex = Math.min(currentFocusIndex + 1, maxIndex);
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault();
        newIndex = Math.max(currentFocusIndex - 1, 0);
        break;
      case 'Home':
        e.preventDefault();
        newIndex = 0;
        break;
      case 'End':
        e.preventDefault();
        newIndex = maxIndex;
        break;
      default:
        return;
    }
    
    if (newIndex !== currentFocusIndex) {
      currentFocusIndex = newIndex;
      chartInstance.update('none'); // Update without animation
      announceDataPoint(cashFlows[currentFocusIndex], totalData[currentFocusIndex]);
      
      // Show tooltip at focused bar
      showTooltipAtIndex(currentFocusIndex);
    }
  };
  
  // Store listener reference for cleanup
  canvas._keydownListener = keydownListener;
  canvas.addEventListener('keydown', keydownListener);
  
  // Focus handler to redraw focus indicator and show initial tooltip
  const focusListener = () => {
    isKeyboardMode = true;
    showTooltipAtIndex(currentFocusIndex);
    announceDataPoint(cashFlows[currentFocusIndex], totalData[currentFocusIndex]);
  };
  
  const blurListener = () => {
    chartInstance.tooltip.setActiveElements([], {x: 0, y: 0});
    chartInstance.update('none');
  };
  
  canvas._focusListener = focusListener;
  canvas._blurListener = blurListener;
  canvas.addEventListener('focus', focusListener);
  canvas.addEventListener('blur', blurListener);
  
  // Disable keyboard mode when mouse moves over chart
  const mouseMoveListener = () => {
    isKeyboardMode = false;
  };
  
  canvas._mouseMoveListener = mouseMoveListener;
  canvas.addEventListener('mousemove', mouseMoveListener);
}

/**
 * Show tooltip at a specific data index
 * @param {number} index - Data point index
 */
function showTooltipAtIndex(index) {
  if (!chartInstance) return;
  
  const meta0 = chartInstance.getDatasetMeta(0);
  const meta1 = chartInstance.getDatasetMeta(1);
  
  if (!meta0.data[index] || !meta1.data[index]) return;
  
  // Set active elements for both datasets at this index
  chartInstance.tooltip.setActiveElements([
    {datasetIndex: 0, index: index},
    {datasetIndex: 1, index: index}
  ], {
    x: meta1.data[index].x,
    y: meta1.data[index].y
  });
  
  chartInstance.update('none');
}

/**
 * Announce data point for screen readers
 * @param {Object} cashFlow - Cash flow object
 * @param {number} total - Total cash flow
 */
function announceDataPoint(cashFlow, total) {
  // Create or update live region for screen reader announcements
  let liveRegion = document.getElementById('chart-live-region');
  if (!liveRegion) {
    liveRegion = document.createElement('div');
    liveRegion.id = 'chart-live-region';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.className = 'sr-only';
    document.body.appendChild(liveRegion);
  }
  
  const announcement = `Period ${cashFlow.yearLabel} years. ` +
    `Coupon payment: ${formatCurrency(cashFlow.couponPayment, true)}. ` +
    `Principal repayment: ${formatCurrency(cashFlow.principalPayment, true)}. ` +
    `Total: ${formatCurrency(total, true)}.`;
  
  liveRegion.textContent = announcement;
}

/**
 * Update chart visibility based on window width
 * @returns {boolean} True if labels should be shown
 */
export function shouldShowLabels() {
  return window.innerWidth > 860;
}

/**
 * Cleanup chart resources
 */
export function destroyChart() {
  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }
}