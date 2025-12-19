/**
 * Results Display Module
 * Renders bond price and analysis results
 */

import { formatCurrency, createElement, setHTML } from './utils.js';

/**
 * Render results and analysis section
 * @param {Object} calculations - Bond calculations
 * @param {Object} params - Input parameters
 */
export function renderResults(calculations, params) {
  const container = document.getElementById('results-content');
  
  if (!container) {
    console.error('Results container not found');
    return;
  }
  
  // Clear existing content
  container.innerHTML = '';
  
  // Create premium/discount analysis box only
  const analysisBox = createAnalysisBox(calculations, params);
  container.appendChild(analysisBox);
}

/**
 * Create bond price display box
 * @param {number} bondPrice - Bond price
 * @returns {Element} Price box element
 */
function createPriceBox(bondPrice) {
  const box = createElement('div', { className: 'result-box price' });
  
  const title = createElement('h5', { className: 'result-title price' }, 
    'PV Bond Price'
  );
  box.appendChild(title);
  
  const valueContainer = createElement('div', { className: 'result-value' });
  
  // Price value with aria-live for screen reader announcements
  const priceValue = createElement('div', {
    'aria-live': 'polite',
    'aria-atomic': 'true'
  }, formatCurrency(bondPrice));
  valueContainer.appendChild(priceValue);
  
  // Per $100 par text
  const parText = createElement('span', { className: 'result-value-small' }, 
    ' per $100 par'
  );
  valueContainer.appendChild(parText);
  
  box.appendChild(valueContainer);
  
  return box;
}

/**
 * Create premium/discount analysis box
 * @param {Object} calculations - Bond calculations
 * @param {Object} params - Input parameters
 * @returns {Element} Analysis box element
 */
function createAnalysisBox(calculations, params) {
  const { bondPrice, bondType, pvCoupons, pvFaceValue } = calculations;
  const { faceValue, couponRate, ytm } = params;
  
  const box = createElement('div', { className: 'result-box analysis' });
  
  // Small uppercase title with dynamic bond type (matching mortgage .result-title)
  const title = createElement('h5', { className: 'result-title analysis' }, 
    bondType.description  // Dynamic: "Premium bond", "Par bond", or "Discount bond"
  );
  box.appendChild(title);
  
  const content = createElement('div', { 
    className: 'analysis-content',
    'aria-live': 'polite',
    'aria-atomic': 'true',
    'role': 'region',
    'aria-labelledby': 'analysis-heading'
  });
  
  // Add ID to title for aria-labelledby
  title.id = 'analysis-heading';
  
  // Supporting details container (matching mortgage .result-detail pattern)
  const detailsContainer = createElement('div', { className: 'result-details' });
  
  // Comparison line
  const comparisonLine = createElement('div', { className: 'result-detail' });
  if (bondType.type === 'par') {
    comparisonLine.innerHTML = `Trading at par: <span style="font-style: italic;">c</span> = <span style="font-style: italic;">r</span> (${ytm.toFixed(2)}%)`;
  } else if (bondType.type === 'premium') {
    comparisonLine.innerHTML = `Trading ${formatCurrency(bondType.difference)} above par<br>` +
      `<span style="font-style: italic;">c</span> (${couponRate.toFixed(2)}%) &gt; <span style="font-style: italic;">r</span> (${ytm.toFixed(2)}%)`;
  } else {
    comparisonLine.innerHTML = `Trading ${formatCurrency(bondType.difference)} below par<br>` +
      `<span style="font-style: italic;">r</span> (${ytm.toFixed(2)}%) &gt; <span style="font-style: italic;">c</span> (${couponRate.toFixed(2)}%)`;
  }
  detailsContainer.appendChild(comparisonLine);
  
  // PV breakdown - separate lines (matching mortgage pattern)
  const pvBreakdown = createElement('div', { className: 'result-detail pv-breakdown' });
  pvBreakdown.innerHTML = 
    `<span style="color: #8b4513;">PV</span> = coupon (${formatCurrency(pvCoupons)}) + face (${formatCurrency(pvFaceValue)})`;
  detailsContainer.appendChild(pvBreakdown);
  
  content.appendChild(detailsContainer);
  box.appendChild(content);
  
  return box;
}