import ExcelJS from 'exceljs'

export interface NEFTPaymentData {
  debitAccountNumber: string
  transactionAmount: number
  transactionCurrency: string // INR
  beneficiaryName: string
  beneficiaryAccountNumber: string
  beneficiaryIfsc: string
  transactionDate: string // DD/MM/YYYY format
  paymentMode: string // 'N' for NEFT, 'R' for RTGS
  customerReference: string
  beneficiaryNickname: string
  // Optional fields
  bankAccountType?: string
  beneficiaryType?: string
  lei?: string
  debitNarration?: string
  creditNarration?: string
  invoiceNumber?: string
  beneficiaryAddress1?: string
  beneficiaryAddress2?: string
  beneficiaryAddress3?: string
  beneficiaryCity?: string
  beneficiaryState?: string
  beneficiaryPinCode?: string
  beneficiaryEmail1?: string
  beneficiaryEmail2?: string
  beneficiaryMobile?: string
  addInfo1?: string
  addInfo2?: string
  addInfo3?: string
  addInfo4?: string
  addInfo5?: string
  addInfo6?: string
}

/**
 * Generate Excel file for NEFT/RTGS bulk payments (non-Axis banks)
 * Template has 31 columns as per Axis Bank NEFT requirements
 */
export async function generateNEFTExcel(
  payments: NEFTPaymentData[],
  debitAccount: string
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Devalok Payroll'
  workbook.created = new Date()

  const worksheet = workbook.addWorksheet('NEFT Payments')

  // Set column headers (31 columns in exact bank order)
  worksheet.columns = [
    { header: 'Debit Account Number', key: 'debitAccountNumber', width: 20 },
    { header: 'Transaction Amount', key: 'transactionAmount', width: 18 },
    { header: 'Transaction Currency', key: 'transactionCurrency', width: 18 },
    { header: 'Beneficiary Name', key: 'beneficiaryName', width: 30 },
    { header: 'Beneficiary Account Number', key: 'beneficiaryAccountNumber', width: 25 },
    { header: 'Beneficiary IFSC Code', key: 'beneficiaryIfsc', width: 15 },
    { header: 'Transaction Date', key: 'transactionDate', width: 15 },
    { header: 'Payment Mode', key: 'paymentMode', width: 15 },
    { header: 'Customer Reference Number', key: 'customerReference', width: 25 },
    { header: 'Beneficiary Nickname/Code', key: 'beneficiaryNickname', width: 25 },
    { header: 'Bank Account Type', key: 'bankAccountType', width: 18 },
    { header: 'Beneficiary Type', key: 'beneficiaryType', width: 18 },
    { header: 'LEI', key: 'lei', width: 25 },
    { header: 'Debit Narration', key: 'debitNarration', width: 30 },
    { header: 'Credit Narration', key: 'creditNarration', width: 30 },
    { header: 'Invoice Number', key: 'invoiceNumber', width: 20 },
    { header: 'Beneficiary Address 1', key: 'beneficiaryAddress1', width: 25 },
    { header: 'Beneficiary Address 2', key: 'beneficiaryAddress2', width: 25 },
    { header: 'Beneficiary Address 3', key: 'beneficiaryAddress3', width: 25 },
    { header: 'Beneficiary City', key: 'beneficiaryCity', width: 20 },
    { header: 'Beneficiary State', key: 'beneficiaryState', width: 20 },
    { header: 'Beneficiary Pin Code', key: 'beneficiaryPinCode', width: 15 },
    { header: 'Beneficiary Email address 1', key: 'beneficiaryEmail1', width: 30 },
    { header: 'Beneficiary Email address 2', key: 'beneficiaryEmail2', width: 30 },
    { header: 'Beneficiary Mobile Number', key: 'beneficiaryMobile', width: 18 },
    { header: 'Add Info1', key: 'addInfo1', width: 20 },
    { header: 'Add Info2', key: 'addInfo2', width: 20 },
    { header: 'Add Info3', key: 'addInfo3', width: 20 },
    { header: 'Add Info4', key: 'addInfo4', width: 20 },
    { header: 'Add Info5', key: 'addInfo5', width: 20 },
    { header: 'Add Info6', key: 'addInfo6', width: 20 },
  ]

  // Style header row
  const headerRow = worksheet.getRow(1)
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF932044' }, // Devalok secondary color (darker)
  }
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }

  // Add data rows
  payments.forEach((payment) => {
    worksheet.addRow({
      debitAccountNumber: debitAccount,
      transactionAmount: payment.transactionAmount,
      transactionCurrency: payment.transactionCurrency || 'INR',
      beneficiaryName: payment.beneficiaryName,
      beneficiaryAccountNumber: payment.beneficiaryAccountNumber,
      beneficiaryIfsc: payment.beneficiaryIfsc,
      transactionDate: payment.transactionDate,
      paymentMode: payment.paymentMode,
      customerReference: payment.customerReference,
      beneficiaryNickname: payment.beneficiaryNickname || '',
      bankAccountType: payment.bankAccountType || '',
      beneficiaryType: payment.beneficiaryType || '',
      lei: payment.lei || '',
      debitNarration: payment.debitNarration || '',
      creditNarration: payment.creditNarration || '',
      invoiceNumber: payment.invoiceNumber || '',
      beneficiaryAddress1: payment.beneficiaryAddress1 || '',
      beneficiaryAddress2: payment.beneficiaryAddress2 || '',
      beneficiaryAddress3: payment.beneficiaryAddress3 || '',
      beneficiaryCity: payment.beneficiaryCity || '',
      beneficiaryState: payment.beneficiaryState || '',
      beneficiaryPinCode: payment.beneficiaryPinCode || '',
      beneficiaryEmail1: payment.beneficiaryEmail1 || '',
      beneficiaryEmail2: payment.beneficiaryEmail2 || '',
      beneficiaryMobile: payment.beneficiaryMobile || '',
      addInfo1: payment.addInfo1 || '',
      addInfo2: payment.addInfo2 || '',
      addInfo3: payment.addInfo3 || '',
      addInfo4: payment.addInfo4 || '',
      addInfo5: payment.addInfo5 || '',
      addInfo6: payment.addInfo6 || '',
    })
  })

  // Format amount column as number with 2 decimal places
  worksheet.getColumn('transactionAmount').numFmt = '#,##0.00'

  // Add borders to all cells
  worksheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      }
    })
  })

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}

/**
 * Format date as DD/MM/YYYY for NEFT template
 */
export function formatNEFTDate(date: Date): string {
  const day = date.getDate().toString().padStart(2, '0')
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}
