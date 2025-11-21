/**
 * Accessible Tooltip Module - CFA Standard
 * Auto-creates tooltips from data-tooltip-id attributes
 * Supports mouse + keyboard + screen readers
 */

import { $, listen } from './utils.js';
import { validateField } from './validation.js';

export function initTooltips() {
  document.querySelectorAll('.input-label-inline').forEach(label => {
    const id = label.dataset.tooltipId;
    const tooltip = $(`#${id}`);
    if (!tooltip) return;

    const input = document.getElementById(id.split('-')[1] || id.replace('tooltip-', ''));
    if (input) {
      ['focus', 'mouseover'].forEach(ev => listen(input, ev, () => showTooltip(label, tooltip)));
      ['blur', 'mouseout'].forEach(ev => listen(input, ev, () => hideTooltip(tooltip)));

      listen(input, 'blur', () => {
        const field = input.id === 'coupon-rate' ? 'couponRate' : input.id;
        const msg = validateField(field, Number(input.value));
        if (msg) tooltip.innerHTML += `<span class="tooltip-error">Warning: ${msg}</span>`;
      });
    }
  });
}

function showTooltip(label, tooltip) {
  const rect = label.getBoundingClientRect();
  tooltip.style.left = `${rect.left}px`;
  tooltip.style.top = `${rect.bottom + 5}px`;
  tooltip.classList.remove('hidden');
}

function hideTooltip(tooltip) {
  tooltip.classList.add('hidden');
}