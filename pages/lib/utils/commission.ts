/**
 * Calculate commission based on transaction amount
 * @param {number} amount The transaction amount
 * @returns {number} The commission amount
 */
export function calculateCommission(amount: number): number {
  if (amount <= 0) return 0;

  // Default commission rate is 2.5%
  let commissionRate = 0.025;

  // Adjust commission rate based on amount
  if (amount > 1000) {
    commissionRate = 0.02; // 2% for larger amounts
  } else if (amount > 500) {
    commissionRate = 0.0225; // 2.25% for medium amounts
  } else if (amount < 100) {
    commissionRate = 0.03; // 3% for small amounts
  }

  // Calculate commission
  return Math.round((amount * commissionRate) * 100) / 100;
}

/**
 * Calculate game commission based on prize pool and commission percentage
 * Used specifically for game winnings
 * @param {number} prizePool The total prize pool
 * @param {number} commissionPercentage The commission percentage
 * @param {boolean} hasSubscription Whether the user has an active subscription
 * @returns {number} The commission amount
 */
export function calculateGameCommission(
  prizePool: number, 
  commissionPercentage: number,
  hasSubscription: boolean = false
): number {
  if (prizePool <= 0 || commissionPercentage <= 0) return 0;
  
  // Apply subscription discount if user has active subscription
  let adjustedCommissionPercentage = commissionPercentage;
  if (hasSubscription) {
    // Reduce commission by 25% for subscribers
    adjustedCommissionPercentage = commissionPercentage * 0.75;
  }
  
  // Calculate commission based on prize pool and percentage
  const commission = (prizePool * adjustedCommissionPercentage) / 100;
  
  // Round to 2 decimal places
  return Math.round(commission * 100) / 100;
}