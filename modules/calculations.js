/**
 * Bond Calculations Module
 * Pure functions for bond valuation mathematics
 */

/**
 * Calculate bond price using present value formula
 * @param {Object} params - Bond parameters
 * @param {number} params.faceValue - Face value of the bond
 * @param {number} params.couponRate - Annual coupon rate (percentage)
 * @param {number} params.ytm - Yield to maturity (percentage)
 * @param {number} params.years - Years to maturity
 * @param {number} params.frequency - Payment frequency per year
 * @returns {Object} Bond price components
 */
export function calculateBondPrice({ faceValue, couponRate, ytm, years, frequency }) {
  const periods = years * frequency;
  const periodicCouponRate = couponRate / 100 / frequency;
  const periodicYield = ytm / 100 / frequency;
  const periodicCoupon = faceValue * periodicCouponRate;
  
  // Calculate present value of coupon payments
  let pvCoupons = 0;
  for (let t = 1; t <= periods; t++) {
    pvCoupons += periodicCoupon / Math.pow(1 + periodicYield, t);
  }
  
  // Calculate present value of face value
  const pvFaceValue = faceValue / Math.pow(1 + periodicYield, periods);
  
  // Total bond price
  const price = pvCoupons + pvFaceValue;
  
  return { 
    price, 
    pvCoupons, 
    pvFaceValue,
    periodicCoupon,
    periodicYield,
    periods
  };
}

/**
 * Generate cash flow schedule for the bond
 * @param {Object} params - Bond parameters and calculated values
 * @returns {Array} Array of cash flow objects
 */
export function generateCashFlows({ faceValue, frequency, years, periodicCoupon, bondPrice }) {
  const periods = years * frequency;
  const cashFlows = [];
  
  // Initial purchase (negative cash flow at t=0)
  cashFlows.push({
    period: 0,
    yearLabel: 0,
    couponPayment: 0,
    principalPayment: -bondPrice,
    totalCashFlow: -bondPrice
  });
  
  // Periodic cash flows
  for (let t = 1; t <= periods; t++) {
    const couponPayment = periodicCoupon;
    const principalPayment = (t === periods) ? faceValue : 0;
    const totalCashFlow = couponPayment + principalPayment;
    
    cashFlows.push({
      period: t,
      yearLabel: t / frequency,
      couponPayment,
      principalPayment,
      totalCashFlow
    });
  }
  
  return cashFlows;
}

/**
 * Determine if bond is trading at premium, discount, or par
 * @param {number} bondPrice - Current bond price
 * @param {number} faceValue - Face value
 * @param {number} tolerance - Tolerance for "par" determination
 * @returns {Object} Bond type and details
 */
export function analyzeBondType(bondPrice, faceValue, tolerance = 0.01) {
  const difference = bondPrice - faceValue;
  
  if (Math.abs(difference) < tolerance) {
    return {
      type: 'par',
      description: 'Par bond',
      difference: 0
    };
  } else if (difference > 0) {
    return {
      type: 'premium',
      description: 'Premium bond',
      difference: difference
    };
  } else {
    return {
      type: 'discount',
      description: 'Discount bond',
      difference: Math.abs(difference)
    };
  }
}

/**
 * Calculate all bond metrics
 * @param {Object} params - Bond parameters from state
 * @returns {Object} Complete bond calculations
 */
export function calculateBondMetrics(params) {
  const { faceValue, couponRate, ytm, years, frequency } = params;
  
  // Calculate bond price components
  const priceData = calculateBondPrice({ faceValue, couponRate, ytm, years, frequency });
  
  // Generate cash flow schedule
  const cashFlows = generateCashFlows({
    faceValue,
    frequency,
    years,
    periodicCoupon: priceData.periodicCoupon,
    bondPrice: priceData.price
  });
  
  // Analyze bond type
  const bondType = analyzeBondType(priceData.price, faceValue);
  
  return {
    bondPrice: priceData.price,
    pvCoupons: priceData.pvCoupons,
    pvFaceValue: priceData.pvFaceValue,
    periodicCoupon: priceData.periodicCoupon,
    periodicYield: priceData.periodicYield,
    periods: priceData.periods,
    cashFlows,
    bondType
  };
}