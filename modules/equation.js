/**
 * Dynamic Equation Module
 * Renders equation with actual calculated values
 */

import { formatCurrency } from './utils.js';

/**
 * Render dynamic equation with user's values
 * @param {Object} calculations - Bond calculations
 * @param {Object} params - Input parameters
 */
export function renderDynamicEquation(calculations, params) {
  const container = document.getElementById('dynamic-mathml-equation');
  
  if (!container) {
    console.error('Dynamic equation container not found');
    return;
  }
  
  const { bondPrice, periodicCoupon, periodicYield, periods } = calculations;
  const { faceValue } = params;
  
  // Convert periodic yield to percentage for display
  const rPercent = (periodicYield * 100).toFixed(2);
  
  // Format values for display
  const pvFormatted = formatCurrency(bondPrice);
  const pmtFormatted = formatCurrency(periodicCoupon);
  const fvFormatted = formatCurrency(faceValue);
  
  // Build MathML equation with actual values
  const mathML = `
    <math xmlns="http://www.w3.org/1998/Math/MathML" display="block">
      <mrow>
        <msub>
          <mi mathcolor="#b95b1d">PV</mi>
          <mtext mathcolor="#b95b1d">coupon bond</mtext>
        </msub>
        <mo>=</mo>
        <mfrac linethickness="1.2px">
          <mtext mathvariant="bold" mathcolor="#3c6ae5">${pmtFormatted}</mtext>
          <mrow class="denominator-r">
            <mtext mathcolor="#7a46ff">${rPercent}%</mtext>
          </mrow>
        </mfrac>
        <mo>×</mo>
        <mo fence="true" stretchy="true" symmetric="true">[</mo>
        <mrow>
          <mn>1</mn>
          <mo>-</mo>
          <mfrac>
            <mn>1</mn>
            <msup>
              <mrow><mo>(</mo><mn>1</mn><mo>+</mo><mtext mathcolor="#7a46ff">${rPercent}%</mtext><mo>)</mo></mrow>
              <mn mathcolor="#15803d">${periods}</mn>
            </msup>
          </mfrac>
        </mrow>
        <mo fence="true" stretchy="true" symmetric="true">]</mo>
        <mo>+</mo>
        <mfrac>
          <mtext mathcolor="#0079a6" mathvariant="bold">${fvFormatted}</mtext>
          <msup>
            <mrow><mo>(</mo><mn>1</mn><mo>+</mo><mtext mathcolor="#7a46ff">${rPercent}%</mtext><mo>)</mo></mrow>
            <mn mathcolor="#15803d">${periods}</mn>
          </msup>
        </mfrac>
        <mo>=</mo>
        <mtext mathcolor="#b95b1d" mathvariant="bold">${pvFormatted}</mtext>
      </mrow>
    </math>
  `;
  
  container.innerHTML = mathML;
  
  // Create screen-reader friendly announcement
  const announcement = `Bond price equals ${pvFormatted}. ` +
    `Calculated as: coupon payment ${pmtFormatted} divided by yield ${rPercent} percent, ` +
    `times 1 minus 1 over quantity 1 plus ${rPercent} percent to the power ${periods}, ` +
    `plus face value ${fvFormatted} divided by quantity 1 plus ${rPercent} percent to the power ${periods}.`;
  
  // Update aria-live region for screen readers
  let liveRegion = document.getElementById('equation-live-region');
  if (!liveRegion) {
    liveRegion = document.createElement('div');
    liveRegion.id = 'equation-live-region';
    liveRegion.className = 'sr-only';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    document.body.appendChild(liveRegion);
  }
  liveRegion.textContent = announcement;
}