/**
 * Chart Module - Bond Cash Flow Chart
 * Chart rendering using Chart.js with keyboard accessibility
 */

import { formatCurrency } from './utils.js';
import { getChartTypography, fillTightParenVar } from '../chart-typography.js';

/** Curriculum chart label convention: 13px / 600 / Lato at the 18px design root. */
const CHART_FONT = { family: '', size: 13, weight: '600' };
let CHART_FONT_CSS = '';

/** Variables are italicised by the Unicode math-italic glyph, not by font-style. */
const ITALIC_r = '\u{1D45F}'; // 𝑟

/** In pill labels only the variable carries colour; the operator and value stay neutral. */
const LABEL_TEXT_COLOR = '#374151';

/** Shared pill geometry so every label box has the same breathing space. */
let LABEL_PAD_X = 8;
let LABEL_PAD_Y = 5;
let LABEL_BOX_HEIGHT = 23;

function syncChartTypography() {
  const t = getChartTypography('curriculum');
  CHART_FONT.family = t.font.family;
  CHART_FONT.size = t.font.size;
  CHART_FONT.weight = t.font.weight;
  CHART_FONT_CSS = t.fontCss;
  LABEL_PAD_X = t.pill.padX;
  LABEL_PAD_Y = t.pill.padY;
  LABEL_BOX_HEIGHT = t.pill.boxHeight;
}


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
  syncChartTypography();
  const canvas = document.getElementById('bond-chart');
  
  if (!canvas) {
    console.error('Chart canvas not found');
    return;
  }
  
  // Update YTM value display in legend
  const ytmDisplay = document.getElementById('ytm-value-display');
  if (ytmDisplay && ytm !== null) {
    ytmDisplay.textContent = `${ytm.toFixed(2)}%`;
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
        ...(ytm !== null && ytm !== undefined ? [{
          label: 'Yield to maturity (r)',
          data: labels.map(() => ytm),
          type: 'line',
          borderColor: '#7a46ff',
          borderWidth: ytm === 0 ? 4 : 3,
          borderDash: ytm === 0 ? [2, 3] : [5, 5],
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
      animation: {
        duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 400
      },
      interaction: {
        mode: 'index',
        intersect: false
      },
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
              
              // YTM line - use italic r
              if (context.dataset.label === 'Yield to maturity (r)') {
                return `Yield to maturity (r): ${value.toFixed(2)}%`;
              }
              
              // For period 0, use italic PV
              if (isInitialPeriod && context.dataset.label === 'Principal repayment') {
                return `Present value of bond (PV): ${formatCurrency(value, true)}`;
              }
              
              // Regular labels with italic abbreviations
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
              if (context[0].dataset.label !== 'Yield to maturity (r)') {
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
            text: 'Time (years)',
            font: {
              size: CHART_FONT.size,
              weight: '600',
              family: CHART_FONT.family
            },
            color: '#1f2937'  // gray-800 - darker for better readability
          },
          ticks: {
            font: {
              size: CHART_FONT.size,
              weight: '600',
              family: CHART_FONT.family
            },
            color: '#1f2937'  // gray-800 - darker
          },
          grid: {
            display: false
          },
          border: {
            display: true,
            color: '#374151',  // gray-700 - darker axis line
            width: 2
          }
        },
        y: {
          title: {
            display: true,
            text: 'Cash flows (USD)',
            font: {
              size: CHART_FONT.size,
              weight: '600',
              family: CHART_FONT.family
            },
            color: '#1f2937'  // gray-800 - darker for better readability
          },
          position: 'left',
          ticks: {
            callback: function(value) {
              // Remove USD prefix, just show number with 2 decimals
              return value.toFixed(2);
            },
            font: {
              size: CHART_FONT.size,
              weight: '600',
              family: CHART_FONT.family
            },
            color: '#1f2937',  // gray-800 - darker
            autoSkip: true,
            maxRotation: 0,
            minRotation: 0
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.05)'
          },
          border: {
            display: true,
            color: '#374151',  // gray-700 - darker axis line
            width: 2
          }
        },
        y2: {
          title: {
            display: false  // We'll draw this manually with italic 'r'
          },
          position: 'right',
          min: ytm === 0 ? -0.5 : 0,
          max: (ytm !== null && ytm !== undefined)
            ? Math.max(12, ytm * 1.2)
            : 12,
          ticks: {
            callback: function(value) {
              return value.toFixed(1);
            },
            font: {
              size: CHART_FONT.size,
              weight: '600',
              family: CHART_FONT.family
            },
            color: '#7a46ff',  // Keep purple for YTM axis
            autoSkip: true,
            maxRotation: 0,
            minRotation: 0
          },
          grid: {
            display: false
          },
          border: {
            display: true,
            color: '#7a46ff',  // Purple to match YTM theme
            width: 2
          }
        }
      },
      layout: {
        padding: {
          left: 10,
          right: 80,  // Increased for y2 axis title with italic 'r'
          top: showLabels ? 35 : 15,
          bottom: 95  // Increased for note position
        }
      }
    },
    plugins: [{
      id: 'canvasBackground',
      beforeDraw: (chart) => {
        const ctx = chart.ctx;
        ctx.save();
        ctx.globalCompositeOperation = 'destination-over';
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, chart.width, chart.height);
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
        // Use consistent font size and system font for better readability
        ctx.font = CHART_FONT_CSS;
        ctx.fillStyle = '#111827';  // gray-900 - very dark for maximum readability
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
          
          // Format number without USD prefix
          const formattedValue = Math.abs(total).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          });
          const displayValue = total < 0 ? `−${formattedValue}` : formattedValue;
          
          // All labels at the same Y position
          ctx.fillText(displayValue, x, labelY);
        });
        
        ctx.restore();
      }
    },
    {
      // Plugin to add variable labels (PV, PMT, FV) on bars for accessibility
      id: 'variableLabels',
      afterDatasetsDraw: (chart) => {
        if (!showLabels) return;
        
        const ctx = chart.ctx;
        const meta0 = chart.getDatasetMeta(0); // Principal
        const meta1 = chart.getDatasetMeta(1); // Coupon
        
        ctx.save();
        ctx.font = CHART_FONT_CSS;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        chart.data.labels.forEach((label, index) => {
          const cf = cashFlows[index];
          if (!meta0.data[index] || !meta1.data[index]) return;
          
          const bar0 = meta0.data[index]; // Principal bar
          const bar1 = meta1.data[index]; // Coupon bar
          const x = bar1.x;
          
          // Label coupon section (PMT) if visible
          if (Math.abs(cf.couponPayment) > 0.5) {
            const couponHeight = Math.abs(bar1.y - bar1.base);
            if (couponHeight > 20) { // Only show if bar is tall enough
              const couponY = (bar1.y + bar1.base) / 2;
              ctx.fillStyle = 'white';
              ctx.fillText('PMT', x, couponY);
            }
          }
          
          // Label principal section (FV or PV)
          if (Math.abs(cf.principalPayment) > 0.5) {
            const principalHeight = Math.abs(bar0.y - bar0.base);
            if (principalHeight > 20) { // Only show if bar is tall enough
              const principalY = (bar0.y + bar0.base) / 2;
              ctx.fillStyle = 'white';
              if (index === 0) {
                ctx.fillText('PV', x, principalY);
              } else {
                ctx.fillText('FV', x, principalY);
              }
            }
          }
        });
        
        ctx.restore();
      }
    },
    {
      // YTM line label plugin - shows "r = XX%" with purple border
      id: 'ytmLabel',
      afterDatasetsDraw: (chart) => {
        if (ytm === null || ytm === undefined) return;
        
        const ctx = chart.ctx;
        const chartArea = chart.chartArea;
        const y2Scale = chart.scales.y2;
        
        if (!y2Scale) return;
        
        ctx.save();
        
        // Get the y-position of the YTM line
        const ytmY = y2Scale.getPixelForValue(ytm);
        
        // Prepare text parts: italic "r" glyph + " = " + "6.50%"
        const rText = ITALIC_r;
        const equalsText = ' = ';
        const valueText = `${ytm.toFixed(2)}%`;
        
        ctx.font = CHART_FONT_CSS;
        const rWidth = ctx.measureText(rText).width;
        const equalsWidth = ctx.measureText(equalsText).width;
        const valueWidth = ctx.measureText(valueText).width;
        
        const totalWidth = rWidth + equalsWidth + valueWidth;
        
        // Box dimensions with padding
        const boxWidth = totalWidth + (LABEL_PAD_X * 2);
        const boxHeight = LABEL_BOX_HEIGHT;
        
        // Position: Center of chart, aligned with YTM line
        const boxX = chartArea.left + (chartArea.width / 2) - (boxWidth / 2);
        let boxY = ytmY - (boxHeight / 2);
        const minBoxTop = chartArea.top + 2;
        const maxBoxTop = chartArea.bottom - boxHeight - 2;
        boxY = Math.min(Math.max(boxY, minBoxTop), maxBoxTop);
        
        // Draw white background
        ctx.fillStyle = 'white';
        ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
        
        // Draw purple border
        ctx.strokeStyle = '#7a46ff';
        ctx.lineWidth = 2;
        ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);
        
        // Draw text in parts
        const textY = boxY + (boxHeight / 2);
        let currentX = boxX + LABEL_PAD_X;
        
        // Draw italic "r" in the YTM purple
        ctx.fillStyle = '#7a46ff';
        ctx.font = CHART_FONT_CSS;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(rText, currentX, textY);
        currentX += rWidth;
        
        // Draw neutral " = XX%"
        ctx.fillStyle = LABEL_TEXT_COLOR;
        ctx.fillText(equalsText + valueText, currentX, textY);
        
        ctx.restore();
      }
    },
    {
      // Custom y2 axis title with italic 'r'
      id: 'y2AxisTitle',
      afterDraw: (chart) => {
        const ctx = chart.ctx;
        const chartArea = chart.chartArea;
        const y2Scale = chart.scales.y2;
        
        if (!y2Scale) return;
        
        ctx.save();
        
        ctx.font = CHART_FONT_CSS;
        ctx.fillStyle = '#7a46ff';
        ctx.textBaseline = 'middle';
        
        const titleX = chartArea.right + 50;
        const titleY = chartArea.top + (chartArea.height / 2);
        
        ctx.translate(titleX, titleY);
        ctx.rotate(Math.PI / 2);
        fillTightParenVar(ctx, 'Yield to maturity (', ITALIC_r, ') %', 0, 0, 'center');
        
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
        
        // Match table note styling with curriculum chart font
        const noteText = 'Note: Negative values indicate cash outflows (money paid out).';
        ctx.font = CHART_FONT_CSS;
        
        // Position below x-axis title (55px gap to clear "Time (years)" label)
        const noteHeight = 30;
        const noteY = chartArea.bottom + 55;
        const boxX = 0;
        const boxWidth = canvas.width;
        
        // Only draw if there's enough space
        if (noteY + noteHeight <= canvas.height) {
          // No background - transparent to match card
          
          // Draw text (darker gray-700 for better readability)
          ctx.fillStyle = '#374151';
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
  setupKeyboardNavigation(canvas, cashFlows, totalData, ytm);
}

/**
 * Setup keyboard navigation for the chart
 * @param {HTMLCanvasElement} canvas - The chart canvas
 * @param {Array} cashFlows - Array of cash flow objects
 * @param {Array} totalData - Array of total values
 * @param {number} ytm - Yield to maturity
 */
function setupKeyboardNavigation(canvas, cashFlows, totalData, ytm) {
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
 * @param {number} ytm - Yield to maturity
 */
function announceDataPoint(cashFlow, total, ytm) {
  const liveRegion = document.getElementById('chart-point-announcement');
  if (!liveRegion || liveRegion.getAttribute('aria-hidden') === 'true') return;
  
  const isInitialPeriod = cashFlow.period === 0;
  const principalLabel = isInitialPeriod ? 'Present value bond price (PV)' : 'Principal repayment (FV)';
  
  const announcement = `Period ${cashFlow.yearLabel} years. ` +
    `Yield to maturity (r): ${ytm ? ytm.toFixed(2) : '0'}%. ` +
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