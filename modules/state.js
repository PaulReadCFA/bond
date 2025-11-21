/**
 * State Management Module
 * Observable state pattern for reactive updates
 */

export const state = {
  // Bond parameters
  faceValue: 100,
  couponRate: 8.6,
  ytm: 6.5,
  years: 5,
  frequency: 1, // Annual
  
  // UI state
  viewMode: 'chart', // 'chart' or 'table'
  
  // Validation errors
  errors: {},
  
  // Calculated values
  bondCalculations: null,
  
  // Subscribers
  listeners: []
};

/**
 * Update state and notify all subscribers
 * @param {Object} updates - Partial state updates
 */
export function setState(updates) {
  Object.assign(state, updates);
  state.listeners.forEach(fn => fn(state));
}

/**
 * Subscribe to state changes
 * @param {Function} fn - Callback function
 */
export function subscribe(fn) {
  state.listeners.push(fn);
}