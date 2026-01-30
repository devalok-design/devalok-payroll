import ExcelJS from 'exceljs'

export interface NEFTPaymentData {
  debitAccountNumber: string
  beneficiaryAccountNumber: string
  transactionAmount: number
  beneficiaryName: string
  beneficiaryAddress1: string
  beneficiaryAddress2: string
  beneficiaryAddress3: string
  beneficiaryAddress4: string
  beneficiaryAddress5: string
  instructionReference: string
  customerReference: string
  paymentMode: string // 'N' for NEFT
  beneficiaryIfsc: string
  beneficiaryBankName: string
  beneficiaryBankBranch: string
  beneficiaryEmail: string
  beneficiaryMobile: string
  remarks: string
  paymentDate: string // DD/MM/YYYY format

  // Additional fields from template
  enrichment1?: string
  enrichment2?: string
  enrichment3?: string
  enrichment4?: string
  enrichment5?: string
  enrichment6?: string
  enrichment7?: string
  enrichment8?: string
  enrichment9?: string
  enrichment10?: string
}

/**
 * Generate Excel file for NEFT/RTGS bulk payments (non-Axis banks)
 * Template has 29 columns as per Axis Bank NEFT requirements
 */
export async function generateNEFTExcel(
  payments: NEFTPaymentData[],
  debitAccount: string
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Devalok Payroll'
  workbook.created = new Date()

  const worksheet = workbook.addWorksheet('NEFT Payments')

  // Set column headers (29 columns)
  worksheet.columns = [
    { header: 'Debit Account Number', key: 'debitAccountNumber', width: 20 },
    { header: 'Beneficiary Account Number', key: 'beneficiaryAccountNumber', width: 25 },
    { header: 'Transaction Amount', key: 'transactionAmount', width: 18 },
    { header: 'Beneficiary Name', key: 'beneficiaryName', width: 30 },
    { header: 'Beneficiary Address 1', key: 'beneficiaryAddress1', width: 25 },
    { header: 'Beneficiary Address 2', key: 'beneficiaryAddress2', width: 25 },
    { header: 'Beneficiary Address 3', key: 'beneficiaryAddress3', width: 25 },
    { header: 'Beneficiary Address 4', key: 'beneficiaryAddress4', width: 25 },
    { header: 'Beneficiary Address 5', key: 'beneficiaryAddress5', width: 25 },
    { header: 'Instruction Reference', key: 'instructionReference', width: 25 },
    { header: 'Customer Reference', key: 'customerReference', width: 25 },
    { header: 'Payment Mode', key: 'paymentMode', width: 15 },
    { header: 'Beneficiary IFSC', key: 'beneficiaryIfsc', width: 15 },
    { header: 'Beneficiary Bank Name', key: 'beneficiaryBankName', width: 25 },
    { header: 'Beneficiary Bank Branch', key: 'beneficiaryBankBranch', width: 25 },
    { header: 'Beneficiary Email', key: 'beneficiaryEmail', width: 30 },
    { header: 'Beneficiary Mobile', key: 'beneficiaryMobile', width: 15 },
    { header: 'Remarks', key: 'remarks', width: 30 },
    { header: 'Payment Date', key: 'paymentDate', width: 15 },
    { header: 'Enrichment 1', key: 'enrichment1', width: 15 },
    { header: 'Enrichment 2', key: 'enrichment2', width: 15 },
    { header: 'Enrichment 3', key: 'enrichment3', width: 15 },
    { header: 'Enrichment 4', key: 'enrichment4', width: 15 },
    { header: 'Enrichment 5', key: 'enrichment5', width: 15 },
    { header: 'Enrichment 6', key: 'enrichment6', width: 15 },
    { header: 'Enrichment 7', key: 'enrichment7', width: 15 },
    { header: 'Enrichment 8', key: 'enrichment8', width: 15 },
    { header: 'Enrichment 9', key: 'enrichment9', width: 15 },
    { header: 'Enrichment 10', key: 'enrichment10', width: 15 },
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
      beneficiaryAccountNumber: payment.beneficiaryAccountNumber,
      transactionAmount: payment.transactionAmount,
      beneficiaryName: payment.beneficiaryName,
      beneficiaryAddress1: payment.beneficiaryAddress1 || '',
      beneficiaryAddress2: payment.beneficiaryAddress2 || '',
      beneficiaryAddress3: payment.beneficiaryAddress3 || '',
      beneficiaryAddress4: payment.beneficiaryAddress4 || '',
      beneficiaryAddress5: payment.beneficiaryAddress5 || '',
      instructionReference: payment.instructionReference,
      customerReference: payment.customerReference,
      paymentMode: payment.paymentMode,
      beneficiaryIfsc: payment.beneficiaryIfsc,
      beneficiaryBankName: payment.beneficiaryBankName,
      beneficiaryBankBranch: payment.beneficiaryBankBranch || '',
      beneficiaryEmail: payment.beneficiaryEmail || '',
      beneficiaryMobile: payment.beneficiaryMobile || '',
      remarks: payment.remarks,
      paymentDate: payment.paymentDate,
      enrichment1: payment.enrichment1 || '',
      enrichment2: payment.enrichment2 || '',
      enrichment3: payment.enrichment3 || '',
      enrichment4: payment.enrichment4 || '',
      enrichment5: payment.enrichment5 || '',
      enrichment6: payment.enrichment6 || '',
      enrichment7: payment.enrichment7 || '',
      enrichment8: payment.enrichment8 || '',
      enrichment9: payment.enrichment9 || '',
      enrichment10: payment.enrichment10 || '',
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
