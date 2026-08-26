/**
 * Validation Module
 * Input validation and error handling
 */

import {
  updateFieldError,
  updateValidationSummary,
  hasErrors,
  requiredMessage,
  minMessage,
  maxMessage,
} from '../validation-ui.js';

export { updateFieldError, updateValidationSummary, hasErrors };

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
    label: 'Yield to maturity',
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
    return requiredMessage(rules.label);
  }
  
  if (rules.min !== undefined && value < rules.min) {
    return minMessage(rules.label, `${rules.min}${rules.unit || ''}`);
  }
  
  if (rules.max !== undefined && value > rules.max) {
    return maxMessage(rules.label, `${rules.max}${rules.unit || ''}`);
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
