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
  
  // Create bond price result box
  const priceBox = createPriceBox(calculations.bondPrice);
  container.appendChild(priceBox);
  
  // Create premium/discount analysis box
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
  
  const title = createElement('h5', { className: 'result-title analysis' }, 
    'Premium-Discount Analysis'
  );
  box.appendChild(title);
  
  const content = createElement('div', { 
    className: 'analysis-content',
    'aria-live': 'polite',
    'aria-atomic': 'true'
  });
  
  // Bond type (par, premium, or discount)
  const typeDiv = createElement('div', { className: 'analysis-type' }, 
    bondType.description
  );
  content.appendChild(typeDiv);
  
  // Analysis text
  const analysisText = createElement('div');
  
  if (bondType.type === 'par') {
    analysisText.textContent = `Trading at par. Coupon rate = YTM (${ytm.toFixed(2)}%)`;
  } else if (bondType.type === 'premium') {
    analysisText.innerHTML = `Trading ${formatCurrency(bondType.difference)} above par. ` +
      `Coupon (${couponRate.toFixed(2)}%) &gt; YTM (${ytm.toFixed(2)}%)`;
  } else {
    analysisText.innerHTML = `Trading ${formatCurrency(bondType.difference)} below par. ` +
      `YTM (${ytm.toFixed(2)}%) &gt; coupon (${couponRate.toFixed(2)}%)`;
  }
  
  content.appendChild(analysisText);
  
  // Present value breakdown
  const breakdownDiv = createElement('div', { className: 'analysis-details' });
  
  const pvCouponsDiv = createElement('div');
  pvCouponsDiv.textContent = `PV coupons: ${formatCurrency(pvCoupons)}`;
  breakdownDiv.appendChild(pvCouponsDiv);
  
  const pvFaceDiv = createElement('div');
  pvFaceDiv.textContent = `PV face: ${formatCurrency(pvFaceValue)}`;
  breakdownDiv.appendChild(pvFaceDiv);
  
  content.appendChild(breakdownDiv);
  box.appendChild(content);
  
  return box;
}