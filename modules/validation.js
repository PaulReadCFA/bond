/**
 * Validation Module
 * Input validation and error handling
 */

import { $ } from './utils.js';

/**
 * Validation rules for each field
 */
const VALIDATION_RULES = {
  couponRate: {
    min: 0,
    max: 10,
    required: true,
    label: 'Coupon rate',
    unit: '%'
  },
  ytm: {
    min: 0,
    max: 10,
    required: true,
    label: 'Yield-to-maturity',
    unit: '%'
  },
  years: {
    min: 1,
    max: 5,
    required: true,
    label: 'Years-to-maturity'
  }
};

/**
 * Validate a single field
 * @param {string} field - Field name
 * @param {number} value - Field value
 * @returns {string|null} Error message or null
 */
export function validateField(field, value) {
  const rules = VALIDATION_RULES[field];
  if (!rules) return null;
  
  if (rules.required && (value === '' || value == null || isNaN(value))) {
    return `${rules.label} is required`;
  }
  
  if (rules.min !== undefined && value < rules.min) {
    return `${rules.label} must be between ${rules.min}${rules.unit || ''} and ${rules.max}${rules.unit || ''}, inclusive`;
  }
  
  if (rules.max !== undefined && value > rules.max) {
    return `${rules.label} must be between ${rules.min}${rules.unit || ''} and ${rules.max}${rules.unit || ''}, inclusive`;
  }
  
  return null;
}

/**
 * Validate all inputs
 * @param {Object} inputs - Input values
 * @returns {Object} Error object
 */
export function validateAllInputs(inputs) {
  const errors = {};
  
  Object.keys(VALIDATION_RULES).forEach(field => {
    const error = validateField(field, inputs[field]);
    if (error) {
      errors[field] = error;
    }
  });
  
  return errors;
}

/**
 * Update field error display
 * @param {string} fieldId - Field ID
 * @param {string|null} errorMessage - Error message or null
 */
export function updateFieldError(fieldId, errorMessage) {
  const input = $(`#${fieldId}`);
  if (!input) return;
  
  if (errorMessage) {
    input.setAttribute('aria-invalid', 'true');
    input.classList.add('error');
  } else {
    input.removeAttribute('aria-invalid');
    input.classList.remove('error');
  }
}

/**
 * Update validation summary
 * @param {Object} errors - Error object
 */
export function updateValidationSummary(errors) {
  const summary = $('#validation-summary');
  const list = $('#validation-list');

  if (!summary || !list) return;

  if (hasErrors(errors)) {
    const errorCount = Object.keys(errors).length;
    
    list.innerHTML = Object.entries(errors)
      .map(([field, message]) => `<li>${message}</li>`)
      .join('');
    
    summary.style.display = 'block';
    
    // Update the title with count for better context
    const title = summary.querySelector('.validation-title');
    if (title) {
      const errorWord = errorCount === 1 ? 'error' : 'errors';
      title.textContent = `Please correct the following ${errorCount} ${errorWord}:`;
    }
    
    // Focus the validation summary so screen readers announce it
    // and keyboard users can easily navigate to fix errors
    setTimeout(() => {
      summary.focus();
      summary.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
    
  } else {
    summary.style.display = 'none';
  }
}

/**
 * Check if there are any errors
 * @param {Object} errors - Error object
 * @returns {boolean} True if errors exist
 */
export function hasErrors(errors) {
  return Object.keys(errors).length > 0;
}