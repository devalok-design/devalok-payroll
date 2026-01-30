import ExcelJS from 'exceljs'

export interface TDSReportData {
  employeeCode: string
  name: string
  pan: string
  aadhaar: string
  natureOfWork: string
  totalGross: number
  totalTds: number
  totalNet: number
  paymentCount: number
}

export interface TDSMonthlyReport {
  year: number
  month: number
  employees: TDSReportData[]
  totals: {
    totalGross: number
    totalTds: number
    totalNet: number
  }
}

/**
 * Generate TDS report Excel for CA
 * Includes employee-wise breakdown and monthly summary
 */
export async function generateTDSReportExcel(
  report: TDSMonthlyReport
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Devalok Payroll'
  workbook.created = new Date()

  const monthName = new Date(report.year, report.month - 1).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  })

  const worksheet = workbook.addWorksheet(`TDS ${monthName}`)

  // Title row
  worksheet.mergeCells('A1:I1')
  const titleCell = worksheet.getCell('A1')
  titleCell.value = `TDS Report - ${monthName}`
  titleCell.font = { bold: true, size: 14, color: { argb: 'FFD33163' } }
  titleCell.alignment = { horizontal: 'center' }

  // Company info
  worksheet.mergeCells('A2:I2')
  worksheet.getCell('A2').value = 'Devalok Design Private Limited'
  worksheet.getCell('A2').alignment = { horizontal: 'center' }

  // Empty row
  worksheet.addRow([])

  // Headers
  const headerRow = worksheet.addRow([
    'S.No.',
    'Employee Code',
    'Name',
    'PAN',
    'Aadhaar',
    'Nature of Work',
    'Gross Amount (₹)',
    'TDS Deducted (₹)',
    'Net Amount (₹)',
  ])
  headerRow.font = { bold: true }
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD33163' },
  }
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }

  // Data rows
  report.employees.forEach((employee, index) => {
    worksheet.addRow([
      index + 1,
      employee.employeeCode,
      employee.name,
      employee.pan,
      employee.aadhaar,
      employee.natureOfWork,
      employee.totalGross,
      employee.totalTds,
      employee.totalNet,
    ])
  })

  // Empty row before totals
  worksheet.addRow([])

  // Totals row
  const totalsRow = worksheet.addRow([
    '',
    '',
    '',
    '',
    '',
    'TOTAL',
    report.totals.totalGross,
    report.totals.totalTds,
    report.totals.totalNet,
  ])
  totalsRow.font = { bold: true }
  totalsRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF2F1F1' },
  }

  // Set column widths
  worksheet.columns = [
    { width: 8 },   // S.No.
    { width: 15 },  // Employee Code
    { width: 25 },  // Name
    { width: 15 },  // PAN
    { width: 15 },  // Aadhaar
    { width: 25 },  // Nature of Work
    { width: 18 },  // Gross Amount
    { width: 18 },  // TDS
    { width: 18 },  // Net Amount
  ]

  // Format currency columns
  worksheet.getColumn(7).numFmt = '₹#,##0.00'
  worksheet.getColumn(8).numFmt = '₹#,##0.00'
  worksheet.getColumn(9).numFmt = '₹#,##0.00'

  // Add borders to data area
  const dataStartRow = 4
  const dataEndRow = worksheet.rowCount
  for (let row = dataStartRow; row <= dataEndRow; row++) {
    for (let col = 1; col <= 9; col++) {
      const cell = worksheet.getCell(row, col)
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      }
    }
  }

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}

/**
 * Generate annual TDS summary for Form 26Q
 */
export async function generateAnnualTDSSummary(
  year: number,
  quarterData: TDSMonthlyReport[]
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Devalok Payroll'
  workbook.created = new Date()

  const worksheet = workbook.addWorksheet(`TDS FY ${year}-${year + 1}`)

  // Title
  worksheet.mergeCells('A1:H1')
  const titleCell = worksheet.getCell('A1')
  titleCell.value = `Annual TDS Summary - FY ${year}-${year + 1}`
  titleCell.font = { bold: true, size: 14, color: { argb: 'FFD33163' } }
  titleCell.alignment = { horizontal: 'center' }

  worksheet.mergeCells('A2:H2')
  worksheet.getCell('A2').value = 'Devalok Design Private Limited'
  worksheet.getCell('A2').alignment = { horizontal: 'center' }

  worksheet.addRow([])

  // Summary by quarter
  const headerRow = worksheet.addRow([
    'Quarter',
    'Period',
    'Total Gross (₹)',
    'Total TDS (₹)',
    'Employee Count',
    'Filing Status',
    'Challan No.',
    'Payment Date',
  ])
  headerRow.font = { bold: true }
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD33163' },
  }
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }

  // Quarter definitions for Indian FY
  const quarters = [
    { name: 'Q1', months: [4, 5, 6], period: 'Apr-Jun' },
    { name: 'Q2', months: [7, 8, 9], period: 'Jul-Sep' },
    { name: 'Q3', months: [10, 11, 12], period: 'Oct-Dec' },
    { name: 'Q4', months: [1, 2, 3], period: 'Jan-Mar' },
  ]

  quarters.forEach((quarter) => {
    const quarterMonths = quarterData.filter((m) => quarter.months.includes(m.month))
    const totalGross = quarterMonths.reduce((sum, m) => sum + m.totals.totalGross, 0)
    const totalTds = quarterMonths.reduce((sum, m) => sum + m.totals.totalTds, 0)
    const employeeCount = new Set(quarterMonths.flatMap((m) => m.employees.map((e) => e.pan))).size

    worksheet.addRow([
      quarter.name,
      quarter.period,
      totalGross,
      totalTds,
      employeeCount,
      'Pending', // Filing status would come from DB
      '', // Challan number
      '', // Payment date
    ])
  })

  // Set column widths
  worksheet.columns = [
    { width: 10 },  // Quarter
    { width: 12 },  // Period
    { width: 18 },  // Total Gross
    { width: 18 },  // Total TDS
    { width: 15 },  // Employee Count
    { width: 15 },  // Filing Status
    { width: 15 },  // Challan No.
    { width: 15 },  // Payment Date
  ]

  // Format currency columns
  worksheet.getColumn(3).numFmt = '₹#,##0.00'
  worksheet.getColumn(4).numFmt = '₹#,##0.00'

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}
