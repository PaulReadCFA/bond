/**
 * Chart Module
 * Chart rendering using Chart.js with keyboard accessibility
 */

import { formatCurrency } from './utils.js';

// Bond Explorer Colors (matching CSS variables)
const COLORS = {
  coupon: '#3c6ae5',      // Blue - matches --color-bond-coupon
  principal: '#0079a6',   // Teal - matches --color-bond-face
  purchase: '#b95b1d',    // Orange - matches --color-bond-pv
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
    'Interactive bond cash flow chart showing present value, coupon payments, principal repayment, and yield to maturity over time. Press Tab to focus, then use Left and Right arrow keys to navigate between time periods. Home goes to first period, End goes to last period.'
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
            val >= 0 ? COLORS.principal : COLORS.purchase
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
    announceDataPoint(cashFlows[index], totalData[index], ytm);
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
          usePointStyle: true,
          callbacks: {
            title: (context) => {
              const index = context[0].dataIndex;
              return `Period: ${cashFlows[index].yearLabel} years`;
            },
            label: (context) => {
              const value = context.parsed.y;
              const index = context.dataIndex;
              const isInitialPeriod = index === 0;
              
              // YTM line - add (r) with indication it's purple
              if (context.dataset.label === 'Yield-to-maturity (r)') {
                return `Yield-to-maturity (r): ${value.toFixed(2)}%`;
              }
              
              // For period 0, change "Principal repayment" to "Present value bond price"
              if (isInitialPeriod && context.dataset.label === 'Principal repayment') {
                return `Present value bond price (PV): ${formatCurrency(value, true)}`;
              }
              
              // Regular labels with variables highlighted
              if (context.dataset.label === 'Principal repayment') {
                return `Principal repayment (FV): ${formatCurrency(value, true)}`;
              }
              if (context.dataset.label === 'Coupon payment') {
                return `Coupon payment (PMT): ${formatCurrency(value, true)}`;
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
            text: 'Years',
            font: {
              size: 13,
              weight: 'bold'
            },
            color: '#374151'  // Darker gray-700
          },
          ticks: {
            font: {
              size: 12,
              weight: 'bold'
            },
            color: '#374151'  // Darker gray-700
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
            },
            font: {
              size: 12,
              weight: 'bold'
            },
            color: '#374151',  // gray-700 - darker
            autoSkip: true,
            maxRotation: 0,
            minRotation: 0
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.05)'
          }
        },
        y2: {
          title: {
            display: false  // We'll draw it manually
          },
          position: 'right',
          min: 0,
          max: ytm ? Math.max(12, ytm * 1.2) : 12,
          ticks: {
            callback: function(value) {
              return value.toFixed(1) + '%';
            },
            font: {
              size: 12,
              weight: 'bold'
            },
            color: '#7a46ff',
            autoSkip: true,
            maxRotation: 0,
            minRotation: 0
          },
          grid: {
            display: false
          }
        }
      },
      layout: {
        padding: {
          left: 10,
          right: 10,
          top: showLabels ? 35 : 15,
          bottom: 80  // Increased to ensure note clears x-axis title
        }
      }
    },
    plugins: [{
      // Custom plugin to draw horizontal Y2 axis title
      id: 'horizontalY2Title',
      afterDraw: (chart) => {
        const ctx = chart.ctx;
        const chartArea = chart.chartArea;
        
        ctx.save();
        ctx.fillStyle = '#5b21b6';  // Darker purple (purple-800) instead of #7a46ff
        // Use relative font size based on chart area for zoom compatibility
        const fontSize = Math.max(11, Math.min(14, chartArea.width / 50));
        ctx.font = `bold ${fontSize}px 'STIX Two Math', 'Cambria Math', serif`;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';
        
        // Calculate safe Y position - ensure it's visible
        // Use padding.top as reference and ensure minimum distance from top
        const safeY = Math.max(5, chartArea.top - 20);
        
        // Draw title at top right
        ctx.fillText('Yield to Maturity (%)', chartArea.right, safeY);
        
        ctx.restore();
      }
    },
    {
      // Custom plugin to draw labels on top of stacked bars
      id: 'stackedBarLabels',
      afterDatasetsDraw: (chart) => {
        if (!showLabels) return;
        
        const ctx = chart.ctx;
        ctx.save();
        ctx.font = "900 14px 'STIX Two Math', 'Cambria Math', serif";  // 900 weight (black) and 14px
        ctx.fillStyle = '#000000';  // Pure black for maximum contrast
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        
        const meta0 = chart.getDatasetMeta(0);
        const meta1 = chart.getDatasetMeta(1);
        
        // Find the highest point (top of the tallest bar) to align ALL labels
        let highestY = chart.scales.y.bottom; // Start at bottom
        chart.data.labels.forEach((label, index) => {
          const total = totalData[index];
          if (Math.abs(total) < 0.01) return;
          
          if (!meta0.data[index] || !meta1.data[index]) return;
          
          // For positive bars, find the top
          if (total > 0) {
            const topY = Math.min(meta0.data[index].y, meta1.data[index].y);
            highestY = Math.min(highestY, topY); // Lower Y value = higher on screen
          }
        });
        
        // Place all labels at the same height (slightly above the highest bar)
        const labelY = highestY - 5;
        
        chart.data.labels.forEach((label, index) => {
          const total = totalData[index];
          if (Math.abs(total) < 0.01) return;
          
          if (!meta0.data[index] || !meta1.data[index]) return;
          
          const bar1 = meta1.data[index];
          const x = bar1.x;
          
          // All labels at the same Y position
          ctx.fillText(formatCurrency(total, false), x, labelY);
        });
        
        ctx.restore();
      }
    },
    {
      // Chart note plugin - styled like table note, positioned below x-axis
      id: 'chartNote',
      afterDraw: (chart) => {
        const ctx = chart.ctx;
        const chartArea = chart.chartArea;
        const canvas = chart.canvas;
        
        ctx.save();
        
        // Match table note styling
        const noteText = 'Note: Values in parentheses indicate negative cash flows (outflows).';
        const fontSize = 12;
        ctx.font = `${fontSize}px 'STIX Two Math', 'Cambria Math', serif`;
        
        // Position below x-axis title (45px gap to clear "Years" label)
        const noteHeight = 30;
        const noteY = chartArea.bottom + 45;
        const boxX = 0;
        const boxWidth = canvas.width;
        
        // Only draw if there's enough space
        if (noteY + noteHeight <= canvas.height) {
          // Draw white background
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(boxX, noteY, boxWidth, noteHeight);
          
          // Draw text (gray-600)
          ctx.fillStyle = '#4b5563';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText(noteText, 10, noteY + (noteHeight / 2));
        }
        
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
      announceDataPoint(cashFlows[currentFocusIndex], totalData[currentFocusIndex], ytm);
      
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
    announceDataPoint(cashFlows[currentFocusIndex], totalData[currentFocusIndex], ytm);
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
function announceDataPoint(cashFlow, total, ytm) {
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
  
  const isInitialPeriod = cashFlow.period === 0;
  const principalLabel = isInitialPeriod ? 'Present value bond price (PV)' : 'Principal repayment (FV)';
  
  const announcement = `Period ${cashFlow.yearLabel} years. ` +
    `Yield-to-maturity (r): ${ytm ? ytm.toFixed(2) : '0'}%. ` +
    `Coupon payment (PMT): ${formatCurrency(cashFlow.couponPayment, true)}. ` +
    `${principalLabel}: ${formatCurrency(cashFlow.principalPayment, true)}. ` +
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