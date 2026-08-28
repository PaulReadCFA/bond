/**
 * Dynamic Equation Module
 * Renders equation with actual calculated values
 */

import { formatCurrency, formatCurrencySpeech } from './utils.js';
import { renderEquation } from '../equation-render.js';

/**
 * Render dynamic equation with user's values
 * @param {Object} calculations - Bond calculations
 * @param {Object} params - Input parameters
 */
export function renderDynamicEquation(calculations, params) {
  const innerContainer = document.getElementById('dynamic-mathml-equation');
  
  if (!innerContainer) {
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
              <mn mathcolor="#07514F">${periods}</mn>
            </msup>
          </mfrac>
        </mrow>
        <mo fence="true" stretchy="true" symmetric="true">]</mo>
        <mo>+</mo>
        <mfrac>
          <mtext mathcolor="#0079a6" mathvariant="bold">${fvFormatted}</mtext>
          <msup>
            <mrow><mo>(</mo><mn>1</mn><mo>+</mo><mtext mathcolor="#7a46ff">${rPercent}%</mtext><mo>)</mo></mrow>
            <mn mathcolor="#07514F">${periods}</mn>
          </msup>
        </mfrac>
        <mo>=</mo>
        <mtext mathcolor="#b95b1d" mathvariant="bold">${pvFormatted}</mtext>
      </mrow>
    </math>
  `;
  
  const outerContainer = document.getElementById('dynamic-equation-container');

  // The shared mount holds the card's height and hides the raw MathML while
  // MathJax typesets, so the cards below stay put.
  renderEquation(innerContainer, mathML, {
    onTypeset: function() {
      // Suppress transition before adjustScale runs to avoid flash of intermediate sizes
      const mjxContainer = innerContainer.querySelector('.MathJax_Display, .MathJax');
      if (mjxContainer) {
        mjxContainer.style.transition = 'none';
      }

      // After MathJax renders, set up responsive scaling
      setupResponsiveScaling(innerContainer);

      // Fix accessibility: ensure aria-hidden assistive MathML is not focusable
      fixAriaHiddenFocusability(innerContainer);

      // Keep the region label in step with the current values so SR users hear
      // the headline result without waiting for a live-region announcement
      if (outerContainer) {
        outerContainer.setAttribute(
          'aria-label',
          `Bond valuation equation. Coupon ${formatCurrencySpeech(periodicCoupon)} per period, ` +
          `${periods} periods at ${rPercent}% per period, face value ${formatCurrencySpeech(faceValue)}. ` +
          `Price: ${formatCurrencySpeech(bondPrice)}.`
        );
      }

      // Restore smooth transition now that the final scale is set
      if (mjxContainer) {
        setTimeout(function() {
          mjxContainer.style.transition = 'transform 0.2s ease-out';
        }, 200);
      }
    },
  });
  
  // Note: MathML is already accessible to screen readers, no need for aria-live announcement
}

/**
 * Set up responsive scaling for equation to fit container
 * @param {HTMLElement} container - Equation container element
 */
function setupResponsiveScaling(container) {
  // MathJax 2.7.7 uses .MathJax_Display or .MathJax for rendered output
  const mjxContainer = container.querySelector('.MathJax_Display, .MathJax, .MathJax_CHTML');
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
 * MathJax 2.7.7 creates elements with aria-hidden="true" that need fixing
 * Also handles role="presentation" spans that are focusable
 * @param {HTMLElement} container - Equation container element
 */
function fixAriaHiddenFocusability(container) {
  // Fix 1: MathJax visual spans with role="presentation" need proper role for focusability
  const presentationSpans = container.querySelectorAll('span.mjx-chtml[role="presentation"][tabindex="0"]');
  presentationSpans.forEach(span => {
    // Add role="application" for Math Explorer functionality
    span.setAttribute('role', 'application');
    span.setAttribute('aria-label', 'Interactive math equation. Press Enter to explore.');
  });
  
  // Fix 2: Remove aria-label from aria-hidden elements (not allowed by WCAG)
  const ariaHiddenWithLabel = container.querySelectorAll('[aria-hidden="true"][aria-label]');
  ariaHiddenWithLabel.forEach(element => {
    element.removeAttribute('aria-label');
  });
  
  // Fix 3: All aria-hidden elements should not be focusable
  const ariaHiddenElements = container.querySelectorAll('[aria-hidden="true"]');
  ariaHiddenElements.forEach(element => {
    // Only set tabindex if not already set to -1
    if (element.getAttribute('tabindex') !== '-1') {
      element.setAttribute('tabindex', '-1');
    }
    
    // Also fix any focusable children
    const focusableChildren = element.querySelectorAll('[tabindex="0"], a, button, input, select, textarea');
    focusableChildren.forEach(child => {
      child.setAttribute('tabindex', '-1');
    });
  });
}