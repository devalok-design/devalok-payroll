/**
 * List of Indian banks from RBI
 * Source: https://www.rbi.org.in/commonman/English/scripts/chequecollectionpolicy.aspx
 */

export const INDIAN_BANKS = [
  // Public Sector Banks
  'Bank of Baroda',
  'Bank of India',
  'Bank of Maharashtra',
  'Canara Bank',
  'Central Bank of India',
  'Indian Bank',
  'Indian Overseas Bank',
  'Punjab National Bank',
  'Punjab & Sind Bank',
  'State Bank of India',
  'UCO Bank',
  'Union Bank of India',
  // Private Sector Banks
  'Axis Bank',
  'Bandhan Bank',
  'Catholic Syrian Bank',
  'City Union Bank',
  'Dhanlaxmi Bank',
  'DCB Bank',
  'Federal Bank',
  'HDFC Bank',
  'ICICI Bank',
  'IDBI Bank',
  'IDFC First Bank',
  'IndusInd Bank',
  'Karnataka Bank',
  'Karur Vysya Bank',
  'Kotak Mahindra Bank',
  'Tamilnad Mercantile Bank',
  'Jammu & Kashmir Bank',
  'Nainital Bank',
  'RBL Bank',
  'South Indian Bank',
  'Yes Bank',
  // Foreign Banks
  'BNP Paribas',
  'Citi Bank',
  'DBS Bank',
  'Deutsche Bank',
  'HSBC',
  'Standard Chartered Bank',
  // Small Finance Banks
  'AU Small Finance Bank',
  'Equitas Small Finance Bank',
  'Ujjivan Small Finance Bank',
  'Jana Small Finance Bank',
  // Payment Banks
  'Airtel Payments Bank',
  'India Post Payments Bank',
  'Paytm Payments Bank',
  'Fino Payments Bank',
  // Other
  'Other',
] as const

export type BankName = (typeof INDIAN_BANKS)[number]

/**
 * Check if IFSC code belongs to Axis Bank
 * Axis Bank IFSC codes start with "UTIB"
 */
export function isAxisBankIFSC(ifscCode: string): boolean {
  return ifscCode.toUpperCase().startsWith('UTIB')
}

/**
 * Get bank name from IFSC code prefix (common ones)
 */
export function getBankFromIFSC(ifscCode: string): string | null {
  const prefix = ifscCode.toUpperCase().substring(0, 4)

  const ifscPrefixes: Record<string, string> = {
    'UTIB': 'Axis Bank',
    'SBIN': 'State Bank of India',
    'HDFC': 'HDFC Bank',
    'ICIC': 'ICICI Bank',
    'PUNB': 'Punjab National Bank',
    'KKBK': 'Kotak Mahindra Bank',
    'BARB': 'Bank of Baroda',
    'CNRB': 'Canara Bank',
    'UBIN': 'Union Bank of India',
    'BKID': 'Bank of India',
    'IDIB': 'IDBI Bank',
    'IDFB': 'IDFC First Bank',
    'INDB': 'IndusInd Bank',
    'YESB': 'Yes Bank',
    'FDRL': 'Federal Bank',
    'RATN': 'RBL Bank',
    'CBIN': 'Central Bank of India',
    'IOBA': 'Indian Overseas Bank',
    'UCBA': 'UCO Bank',
    'MAHB': 'Bank of Maharashtra',
    'PSIB': 'Punjab & Sind Bank',
    'SIBL': 'South Indian Bank',
    'KARB': 'Karnataka Bank',
    'KVBL': 'Karur Vysya Bank',
    'CITI': 'Citi Bank',
    'HSBC': 'HSBC',
    'SCBL': 'Standard Chartered Bank',
    'DBSS': 'DBS Bank',
    'DEUT': 'Deutsche Bank',
    'BDBL': 'Bandhan Bank',
    'AUBL': 'AU Small Finance Bank',
    'ESFB': 'Equitas Small Finance Bank',
    'UJVN': 'Ujjivan Small Finance Bank',
  }

  return ifscPrefixes[prefix] || null
}
