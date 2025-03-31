/**
 * Constants for UPI payments
 */
export const UPI_CONSTANTS = {
  MERCHANT_UPI_ID: 'chetan844722@kotak',
  MERCHANT_NAME: 'Game Platform Admin',
  MIN_DEPOSIT_AMOUNT: 100,
  MAX_DEPOSIT_AMOUNT: 10000,
  CURRENCY: 'INR',
};

/**
 * Generate a UPI payment URL for specified amount
 * 
 * @param amount Amount to pay in rupees
 * @param transactionNote Note to include with the payment
 * @param referenceId Optional reference ID for the transaction
 * @returns UPI payment URL that can be opened in UPI apps
 */
export function generateUpiPaymentUrl(
  amount: number,
  transactionNote: string = 'Wallet Deposit',
  referenceId?: string
): string {
  // Validate amount
  if (amount < UPI_CONSTANTS.MIN_DEPOSIT_AMOUNT || amount > UPI_CONSTANTS.MAX_DEPOSIT_AMOUNT) {
    throw new Error(`Amount must be between ₹${UPI_CONSTANTS.MIN_DEPOSIT_AMOUNT} and ₹${UPI_CONSTANTS.MAX_DEPOSIT_AMOUNT}`);
  }

  // Generate a transaction ID if not provided
  const txnId = referenceId || `TXN${Date.now()}${Math.floor(Math.random() * 1000)}`;
  
  // Create UPI payment URL
  const upiUrl = new URL('upi://pay');
  upiUrl.searchParams.append('pa', UPI_CONSTANTS.MERCHANT_UPI_ID);
  upiUrl.searchParams.append('pn', UPI_CONSTANTS.MERCHANT_NAME);
  upiUrl.searchParams.append('am', amount.toString());
  upiUrl.searchParams.append('cu', UPI_CONSTANTS.CURRENCY);
  upiUrl.searchParams.append('tn', transactionNote);
  upiUrl.searchParams.append('tr', txnId);
  
  return upiUrl.toString();
}

/**
 * Get UPI details for display
 * 
 * @returns UPI ID and name for display
 */
export function getUpiDetails() {
  return {
    upiId: UPI_CONSTANTS.MERCHANT_UPI_ID,
    name: UPI_CONSTANTS.MERCHANT_NAME,
  };
}

/**
 * Generate a QR code data URL for the UPI payment
 * 
 * @param amount Amount to pay
 * @param note Payment note
 * @returns UPI payment URL (to be encoded in QR)
 */
export function getUpiQrData(amount: number, note: string = 'Wallet Deposit'): string {
  return generateUpiPaymentUrl(amount, note);
}