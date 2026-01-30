import ExcelJS from 'exceljs'

export interface AxisPaymentData {
  debitAccountNumber: string
  transactionAmount: number
  transactionCurrency: string
  beneficiaryName: string
  beneficiaryAccountNumber: string
  transactionDate: string // DD/MM/YYYY format
  customerReference: string
  beneficiaryCode: string
}

/**
 * Generate Excel file for within-Axis Bank bulk payments
 * Template has 8 columns as per Axis Bank requirements
 */
export async function generateAxisExcel(
  payments: AxisPaymentData[],
  debitAccount: string
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Devalok Payroll'
  workbook.created = new Date()

  const worksheet = workbook.addWorksheet('Payments')

  // Set column headers
  worksheet.columns = [
    { header: 'Debit Account Number', key: 'debitAccountNumber', width: 20 },
    { header: 'Transaction Amount', key: 'transactionAmount', width: 18 },
    { header: 'Transaction Currency', key: 'transactionCurrency', width: 18 },
    { header: 'Beneficiary Name', key: 'beneficiaryName', width: 30 },
    { header: 'Beneficiary Account Number', key: 'beneficiaryAccountNumber', width: 25 },
    { header: 'Transaction Date', key: 'transactionDate', width: 15 },
    { header: 'Customer Reference', key: 'customerReference', width: 25 },
    { header: 'Beneficiary Code', key: 'beneficiaryCode', width: 20 },
  ]

  // Style header row
  const headerRow = worksheet.getRow(1)
  headerRow.font = { bold: true }
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD33163' }, // Devalok primary color
  }
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }

  // Add data rows
  payments.forEach((payment) => {
    worksheet.addRow({
      debitAccountNumber: debitAccount,
      transactionAmount: payment.transactionAmount,
      transactionCurrency: payment.transactionCurrency,
      beneficiaryName: payment.beneficiaryName,
      beneficiaryAccountNumber: payment.beneficiaryAccountNumber,
      transactionDate: payment.transactionDate,
      customerReference: payment.customerReference,
      beneficiaryCode: payment.beneficiaryCode,
    })
  })

  // Format amount column as number with 2 decimal places
  worksheet.getColumn('transactionAmount').numFmt = '#,##0.00'

  // Add borders to all cells
  worksheet.eachRow((row, rowNumber) => {
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
 * Format date as DD/MM/YYYY for Axis Bank template
 */
export function formatAxisDate(date: Date): string {
  const day = date.getDate().toString().padStart(2, '0')
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}
