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
          <mtext mathcolor="#b95b1d">Coupon bond</mtext>
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
          <mo>−</mo>
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
  
  // Tell MathJax to re-render the updated equation
  if (window.MathJax && window.MathJax.typesetPromise) {
    window.MathJax.typesetPromise([container]).then(() => {
      // After MathJax renders, set up responsive scaling
      setupResponsiveScaling(container);
      
      // Fix accessibility: ensure aria-hidden assistive MathML is not focusable
      fixAriaHiddenFocusability(container);
    }).catch((err) => {
      console.error('MathJax typesetting failed:', err);
    });
  }
  
  // Note: MathML is already accessible to screen readers, no need for aria-live announcement
}

/**
 * Set up responsive scaling for equation to fit container
 * @param {HTMLElement} container - Equation container element
 */
function setupResponsiveScaling(container) {
  const mjxContainer = container.querySelector('mjx-container');
  if (!mjxContainer) return;
  
  let resizeTimeout;
  
  /**
   * Calculate and apply scale to fit equation in container
   */
  function adjustScale() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      // Detect browser zoom level
      // When zoomed in significantly, disable scaling to let equation grow naturally
      const baseWidth = window.innerWidth;
      const zoomLevel = Math.round((window.outerWidth / baseWidth) * 100) / 100;
      
      // At 150% zoom or higher, disable auto-scaling
      // This respects user's preference to make text larger
      if (zoomLevel >= 1.5 || window.devicePixelRatio >= 1.5) {
        mjxContainer.style.transform = 'none';
        mjxContainer.style.transformOrigin = 'left center';
        return;
      }
      
      // Get dimensions
      const containerWidth = container.clientWidth;
      const equationWidth = mjxContainer.scrollWidth;
      
      // If equation is wider than container, scale it down
      if (equationWidth > containerWidth) {
        // Calculate scale needed (with 2% margin for safety)
        const scale = (containerWidth / equationWidth) * 0.98;
        
        // Apply transform
        mjxContainer.style.transform = `scale(${scale})`;
        mjxContainer.style.transformOrigin = 'left center';
      } else {
        // Equation fits naturally, no scaling needed
        mjxContainer.style.transform = 'none';
      }
    }, 100); // Debounce: wait 100ms after last resize
  }
  
  // Clean up any existing observer
  if (container._resizeObserver) {
    container._resizeObserver.disconnect();
  }
  
  // Set up ResizeObserver to watch for container size changes
  const resizeObserver = new ResizeObserver(adjustScale);
  resizeObserver.observe(container);
  
  // Store observer reference for cleanup
  container._resizeObserver = resizeObserver;
  
  // Also listen for window resize (catches zoom changes)
  window.addEventListener('resize', adjustScale);
  
  // Listen for zoom changes via matchMedia
  const zoomQuery = window.matchMedia('screen and (min-resolution: 1.5dppx)');
  if (zoomQuery.addEventListener) {
    zoomQuery.addEventListener('change', adjustScale);
  }
  
  // Initial adjustment
  adjustScale();
}

/**
 * Fix WCAG issue: aria-hidden elements should not be focusable
 * MathJax creates mjx-assistive-mml elements with aria-hidden="true"
 * that contain focusable MathML - we need to prevent focus
 * @param {HTMLElement} container - Equation container element
 */
function fixAriaHiddenFocusability(container) {
  // Find ALL elements with aria-hidden="true" that have tabindex or are focusable
  const ariaHiddenElements = container.querySelectorAll('[aria-hidden="true"]');
  
  ariaHiddenElements.forEach(element => {
    // Remove from tab order
    element.setAttribute('tabindex', '-1');
    
    // Also fix any focusable children
    const focusableChildren = element.querySelectorAll('[tabindex="0"], [tabindex], a, button, input, select, textarea');
    focusableChildren.forEach(child => {
      child.setAttribute('tabindex', '-1');
    });
  });
}