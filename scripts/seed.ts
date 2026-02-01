/**
 * Seed script for Devalok Payroll
 *
 * Run with: npx tsx scripts/seed.ts
 *
 * This script:
 * 1. Creates an admin user
 * 2. Imports lokwasis with their debt balances and leave balances
 * 3. Sets up the payroll schedule
 * 4. Generates 3 pending payroll runs (Jan 1, 15, 29 2026)
 */

import { PrismaClient, LokwasiStatus } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// Current team members at Devalok Design and Strategy Studio Private Limited
// Data with CORRECTED debt balances (Leaves + Transition + Current Payroll combined)
const lokwasisData: Array<{
  name: string
  employeeCode: string
  pan: string
  aadhaar: string
  bankAccount: string
  ifscCode: string
  bankName: string
  beneficiaryNickname: string
  isAxisBank: boolean
  tdsRate: number
  grossSalary: number
  leaveBalance: number
  salaryDebtBalance: number
  natureOfWork: string
  joinedDate: Date
  status: LokwasiStatus
}> = [
  {
    name: 'Mudit Lal',
    employeeCode: 'LW001',
    pan: '',
    aadhaar: '',
    bankAccount: '',
    ifscCode: '',
    bankName: '',
    beneficiaryNickname: 'MUDITLAL',
    isAxisBank: false,
    tdsRate: 10,
    grossSalary: 20000,
    leaveBalance: 0,
    salaryDebtBalance: 60000, // Current Payroll only (Jan 1 + Jan 15 + Jan 29)
    natureOfWork: 'Consultation',
    joinedDate: new Date('2024-01-01'),
    status: 'ACTIVE',
  },
  {
    name: 'Shalini Srivastava',
    employeeCode: 'LW002',
    pan: '',
    aadhaar: '',
    bankAccount: '',
    ifscCode: '',
    bankName: '',
    beneficiaryNickname: 'SHALINISRIVASTAVA',
    isAxisBank: false,
    tdsRate: 10,
    grossSalary: 10000,
    leaveBalance: 0,
    salaryDebtBalance: 30000, // Current Payroll only (NOT in Transition)
    natureOfWork: 'Consultation',
    joinedDate: new Date('2024-01-01'),
    status: 'ACTIVE',
  },
  {
    name: 'Yogin Naidu',
    employeeCode: 'LW003',
    pan: 'GGZPS6419C',
    aadhaar: '846625470798',
    bankAccount: '9613225695',
    ifscCode: 'KKBK0008072',
    bankName: 'Kotak Mahindra Bank',
    beneficiaryNickname: 'YOGINNAIDU',
    isAxisBank: false,
    tdsRate: 10,
    grossSalary: 37500,
    leaveBalance: 29,
    salaryDebtBalance: 283929, // Leaves: ₹77,679 + Transition: ₹93,750 + Current: ₹1,12,500
    natureOfWork: 'Consultation',
    joinedDate: new Date('2024-01-01'),
    status: 'ACTIVE',
  },
  {
    name: 'Chhavi Priya Gaur',
    employeeCode: 'LW004',
    pan: 'CDIPG7525D',
    aadhaar: '346353616274',
    bankAccount: '41136709483',
    ifscCode: 'SBIN0015994',
    bankName: 'State Bank of India',
    beneficiaryNickname: 'CHHAVIGAUR',
    isAxisBank: false,
    tdsRate: 10,
    grossSalary: 50000,
    leaveBalance: 30,
    salaryDebtBalance: 532143, // Leaves: ₹1,07,143 + Transition: ₹2,75,000 + Current: ₹1,50,000
    natureOfWork: 'Consultation',
    joinedDate: new Date('2024-01-01'),
    status: 'ACTIVE',
  },
  {
    name: 'Goutham H M',
    employeeCode: 'LW005',
    pan: 'DHWPG4724D',
    aadhaar: '512647238923',
    bankAccount: '64176621170',
    ifscCode: 'SBIN0040139',
    bankName: 'State Bank of India',
    beneficiaryNickname: 'GOUTHAMHM',
    isAxisBank: false,
    tdsRate: 10,
    grossSalary: 32500,
    leaveBalance: 0,
    salaryDebtBalance: 262500, // Transition: ₹1,65,000 + Current: ₹97,500
    natureOfWork: 'Consultation',
    joinedDate: new Date('2024-01-01'),
    status: 'ACTIVE',
  },
  {
    name: 'Ayursha Nimse',
    employeeCode: 'LW006',
    pan: 'BSPPN3471E',
    aadhaar: '371652920957',
    bankAccount: '0632100100000771',
    ifscCode: 'PUNB0063210',
    bankName: 'Punjab National Bank',
    beneficiaryNickname: 'AYURSHNIMSE',
    isAxisBank: false,
    tdsRate: 10,
    grossSalary: 32500,
    leaveBalance: 15,
    salaryDebtBalance: 294643, // Leaves: ₹32,143 + Transition: ₹1,65,000 + Current: ₹97,500
    natureOfWork: 'Consultation',
    joinedDate: new Date('2024-01-01'),
    status: 'ACTIVE',
  },
  {
    name: 'Parth Dake',
    employeeCode: 'LW007',
    pan: 'FCQPD0249K',
    aadhaar: '418882678623',
    bankAccount: '30140100020302',
    ifscCode: 'BARB0MIRARO',
    bankName: 'Bank of Baroda',
    beneficiaryNickname: 'PARTHDAKE',
    isAxisBank: false,
    tdsRate: 10,
    grossSalary: 45000,
    leaveBalance: 16,
    salaryDebtBalance: 425357, // Leaves: ₹42,857 + Transition: ₹2,47,500 + Current: ₹1,35,000
    natureOfWork: 'Consultation',
    joinedDate: new Date('2024-01-01'),
    status: 'ACTIVE',
  },
  {
    name: 'Arundhati Thakur',
    employeeCode: 'LW008',
    pan: 'BMHPT6524J',
    aadhaar: '692258882107',
    bankAccount: '50100118223453',
    ifscCode: 'HDFC0000805',
    bankName: 'HDFC Bank',
    beneficiaryNickname: 'ARUNDHATI',
    isAxisBank: false,
    tdsRate: 10,
    grossSalary: 50000,
    leaveBalance: 0,
    salaryDebtBalance: 425000, // Transition: ₹2,75,000 + Current: ₹1,50,000
    natureOfWork: 'Consultation',
    joinedDate: new Date('2024-01-01'),
    status: 'ACTIVE',
  },
  {
    name: 'Vidit Lal',
    employeeCode: 'LW009',
    pan: '',
    aadhaar: '',
    bankAccount: '51792191018202',
    ifscCode: 'PUNB0517910',
    bankName: 'Punjab National Bank',
    beneficiaryNickname: 'VIDITLAL',
    isAxisBank: false,
    tdsRate: 10,
    grossSalary: 5000,
    leaveBalance: 0,
    salaryDebtBalance: 27500, // Transition: ₹12,500 + Current: ₹15,000
    natureOfWork: 'Consultation',
    joinedDate: new Date('2024-01-01'),
    status: 'ACTIVE',
  },
  {
    name: 'Bhavika Jain',
    employeeCode: 'LW010',
    pan: '',
    aadhaar: '',
    bankAccount: '',
    ifscCode: '',
    bankName: '',
    beneficiaryNickname: 'BHAVIKAJAIN',
    isAxisBank: false,
    tdsRate: 10,
    grossSalary: 10000,
    leaveBalance: 0,
    salaryDebtBalance: 45000, // Transition: ₹15,000 + Current: ₹30,000
    natureOfWork: 'Consultation',
    joinedDate: new Date('2024-01-01'),
    status: 'ACTIVE',
  },
  {
    name: 'Shriman Visahan',
    employeeCode: 'LW011',
    pan: '',
    aadhaar: '',
    bankAccount: '',
    ifscCode: '',
    bankName: '',
    beneficiaryNickname: 'SHRIMANVISAHAN',
    isAxisBank: false,
    tdsRate: 10,
    grossSalary: 45000,
    leaveBalance: 0,
    salaryDebtBalance: 157500, // Current Payroll only: ₹67,500 + ₹45,000 + ₹45,000
    natureOfWork: 'Consultation',
    joinedDate: new Date('2025-12-18'), // Joined recently
    status: 'ACTIVE',
  },
  {
    name: 'Amal Krishna A',
    employeeCode: 'LW012',
    pan: '',
    aadhaar: '',
    bankAccount: '',
    ifscCode: '',
    bankName: '',
    beneficiaryNickname: 'AMALKRISHNA',
    isAxisBank: false,
    tdsRate: 10,
    grossSalary: 45000,
    leaveBalance: 0,
    salaryDebtBalance: 45000, // Current Payroll only (Jan 29)
    natureOfWork: 'Consultation',
    joinedDate: new Date('2026-01-15'), // Joined Jan 15, first payroll Jan 29
    status: 'ACTIVE',
  },
  // TERMINATED EMPLOYEES (still have pending debt)
  {
    name: 'Aparna Sinha',
    employeeCode: 'LW013',
    pan: '',
    aadhaar: '',
    bankAccount: '',
    ifscCode: '',
    bankName: '',
    beneficiaryNickname: 'APARNASINHA',
    isAxisBank: false,
    tdsRate: 10,
    grossSalary: 0,
    leaveBalance: 0,
    salaryDebtBalance: 35000, // Transition debt only
    natureOfWork: 'Consultation',
    joinedDate: new Date('2024-01-01'),
    status: 'TERMINATED',
  },
  {
    name: 'Suyash Pingale',
    employeeCode: 'LW014',
    pan: '',
    aadhaar: '',
    bankAccount: '',
    ifscCode: '',
    bankName: '',
    beneficiaryNickname: 'SUYASHPINGALE',
    isAxisBank: false,
    tdsRate: 10,
    grossSalary: 0,
    leaveBalance: 0,
    salaryDebtBalance: 63393, // Transition: ₹43,750 + Current: ₹12,500 + ₹7,143
    natureOfWork: 'Consultation',
    joinedDate: new Date('2024-01-01'),
    status: 'TERMINATED',
  },
  {
    name: 'Ritika Sharma',
    employeeCode: 'LW015',
    pan: '',
    aadhaar: '',
    bankAccount: '',
    ifscCode: '',
    bankName: '',
    beneficiaryNickname: 'RITIKASHARMA',
    isAxisBank: false,
    tdsRate: 10,
    grossSalary: 0,
    leaveBalance: 0,
    salaryDebtBalance: 0, // NO debt
    natureOfWork: 'Consultation',
    joinedDate: new Date('2024-01-01'),
    status: 'TERMINATED',
  },
]

async function main() {
  console.log('🌱 Starting seed...\n')

  // Create admin user
  console.log('Creating admin user...')
  const passwordHash = await bcrypt.hash('admin123', 12)

  const admin = await prisma.user.upsert({
    where: { email: 'mudit@devalok.in' },
    update: {},
    create: {
      email: 'mudit@devalok.in',
      name: 'Mudit Lal',
      passwordHash,
      role: 'ADMIN',
    },
  })
  console.log(`  ✓ Admin user created: ${admin.email}`)

  // Delete existing data to start fresh
  console.log('\nClearing existing data...')
  await prisma.payment.deleteMany({})
  await prisma.payrollRun.deleteMany({})
  await prisma.lokwasi.deleteMany({})

  // Create lokwasis
  console.log('\nCreating lokwasis...')
  for (const data of lokwasisData) {
    const lokwasi = await prisma.lokwasi.create({
      data: {
        name: data.name,
        employeeCode: data.employeeCode,
        pan: data.pan,
        aadhaar: data.aadhaar,
        bankAccount: data.bankAccount,
        ifscCode: data.ifscCode,
        bankName: data.bankName,
        beneficiaryNickname: data.beneficiaryNickname,
        isAxisBank: data.isAxisBank,
        tdsRate: data.tdsRate,
        grossSalary: data.grossSalary,
        leaveBalance: data.leaveBalance,
        initialLeaveBalance: data.leaveBalance,
        salaryDebtBalance: data.salaryDebtBalance,
        natureOfWork: data.natureOfWork,
        joinedDate: data.joinedDate,
        status: data.status,
        createdById: admin.id,
      },
    })
    const statusLabel = data.status === 'TERMINATED' ? ' [TERMINATED]' : ''
    console.log(
      `  ✓ ${lokwasi.name}${statusLabel} - Debt: ₹${data.salaryDebtBalance.toLocaleString('en-IN')}`
    )
  }

  // Create payroll schedule
  console.log('\nCreating payroll schedule...')
  const lastPayrollDate = new Date('2025-12-18') // December 18, 2025 - paid out January 23, 2026
  const nextPayrollDate = new Date('2026-02-12') // Next upcoming payroll after backlog is cleared

  await prisma.payrollSchedule.deleteMany({})
  await prisma.payrollSchedule.create({
    data: {
      lastPayrollDate,
      nextPayrollDate,
      cycleDays: 14,
      generationTime: '09:00',
      isActive: true,
    },
  })
  console.log(
    `  ✓ Schedule created: Last payroll ${lastPayrollDate.toDateString()}, Next: ${nextPayrollDate.toDateString()}`
  )

  // ==========================================
  // GENERATE PENDING PAYROLL RUNS
  // ==========================================
  console.log('\nGenerating pending payroll runs...')

  // Get all lokwasis for reference
  const allLokwasis = await prisma.lokwasi.findMany()
  const getLokwasiByName = (name: string) => allLokwasis.find((l) => l.name.includes(name))

  // Helper to generate customer reference
  const generateRef = (date: Date, index: number) => {
    const yyyy = date.getFullYear()
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    const dd = String(date.getDate()).padStart(2, '0')
    return `DVLK-${yyyy}${mm}${dd}-${String(index).padStart(3, '0')}`
  }

  // Define the 3 pending payrolls with exact amounts from user data
  const pendingPayrolls = [
    {
      runDate: new Date('2026-01-01'),
      payPeriodStart: new Date('2025-12-18'),
      payPeriodEnd: new Date('2026-01-01'),
      payments: [
        { name: 'Mudit', gross: 20000 },
        { name: 'Shalini', gross: 10000 },
        { name: 'Yogin', gross: 37500 },
        { name: 'Chhavi', gross: 50000 },
        { name: 'Suyash', gross: 12500 }, // Still active on Jan 1
        { name: 'Goutham', gross: 32500 },
        { name: 'Ayursha', gross: 32500 },
        { name: 'Parth', gross: 45000 },
        { name: 'Arundhati', gross: 50000 },
        { name: 'Vidit', gross: 5000 },
        { name: 'Bhavika', gross: 10000 },
        { name: 'Shriman', gross: 67500 }, // Higher first period
      ],
    },
    {
      runDate: new Date('2026-01-15'),
      payPeriodStart: new Date('2026-01-01'),
      payPeriodEnd: new Date('2026-01-15'),
      payments: [
        { name: 'Mudit', gross: 20000 },
        { name: 'Shalini', gross: 10000 },
        { name: 'Yogin', gross: 37500 },
        { name: 'Chhavi', gross: 50000 },
        { name: 'Suyash', gross: 7143 }, // Prorated before termination
        { name: 'Goutham', gross: 32500 },
        { name: 'Ayursha', gross: 32500 },
        { name: 'Parth', gross: 45000 },
        { name: 'Arundhati', gross: 50000 },
        { name: 'Vidit', gross: 5000 },
        { name: 'Bhavika', gross: 10000 },
        { name: 'Shriman', gross: 45000 }, // Regular rate
      ],
    },
    {
      runDate: new Date('2026-01-29'),
      payPeriodStart: new Date('2026-01-15'),
      payPeriodEnd: new Date('2026-01-29'),
      payments: [
        { name: 'Mudit', gross: 20000 },
        { name: 'Shalini', gross: 10000 },
        { name: 'Yogin', gross: 37500 },
        { name: 'Chhavi', gross: 50000 },
        // Suyash removed - terminated
        { name: 'Goutham', gross: 32500 },
        { name: 'Ayursha', gross: 32500 },
        { name: 'Parth', gross: 45000 },
        { name: 'Arundhati', gross: 50000 },
        { name: 'Vidit', gross: 5000 },
        { name: 'Bhavika', gross: 10000 },
        { name: 'Amal', gross: 45000 }, // New - joined Jan 15
        { name: 'Shriman', gross: 45000 },
      ],
    },
  ]

  for (const payrollData of pendingPayrolls) {
    // Calculate totals
    let totalGross = 0
    let totalTds = 0
    let totalNet = 0

    const paymentRecords = payrollData.payments.map((p, index) => {
      const lokwasi = getLokwasiByName(p.name)
      if (!lokwasi) {
        throw new Error(`Lokwasi not found: ${p.name}`)
      }

      const gross = p.gross
      const tdsRate = 10
      const tds = Math.ceil((gross * tdsRate) / 100)
      const net = gross - tds

      totalGross += gross
      totalTds += tds
      totalNet += net

      return {
        lokwasiId: lokwasi.id,
        grossAmount: gross,
        tdsRate: tdsRate,
        tdsAmount: tds,
        leaveCashoutDays: 0,
        leaveCashoutAmount: 0,
        debtPayoutAmount: 0,
        netAmount: net,
        customerReference: generateRef(payrollData.runDate, index + 1),
        snapshotPan: lokwasi.pan || '',
        snapshotAadhaar: lokwasi.aadhaar || '',
        snapshotBankAccount: lokwasi.bankAccount || '',
        snapshotIfsc: lokwasi.ifscCode || '',
        snapshotBankName: lokwasi.bankName || '',
        snapshotIsAxisBank: lokwasi.isAxisBank,
      }
    })

    // Create the payroll run with payments
    await prisma.payrollRun.create({
      data: {
        runDate: payrollData.runDate,
        payPeriodStart: payrollData.payPeriodStart,
        payPeriodEnd: payrollData.payPeriodEnd,
        status: 'PENDING',
        totalGross,
        totalTds,
        totalNet,
        totalDebtPayout: 0,
        totalLeaveCashout: 0,
        employeeCount: paymentRecords.length,
        createdById: admin.id,
        payments: {
          create: paymentRecords,
        },
      },
    })

    console.log(
      `  ✓ Payroll ${payrollData.runDate.toLocaleDateString('en-IN')} - ${paymentRecords.length} employees, Net: ₹${totalNet.toLocaleString('en-IN')}`
    )
  }

  console.log('  ✓ All 3 pending payrolls generated!')

  // Summary
  const activeLokwasis = lokwasisData.filter((l) => l.status === 'ACTIVE')
  const terminatedLokwasis = lokwasisData.filter((l) => l.status === 'TERMINATED')
  const totalSalary = activeLokwasis.reduce((sum, l) => sum + l.grossSalary, 0)
  const totalDebt = lokwasisData.reduce((sum, l) => sum + l.salaryDebtBalance, 0)
  const activeDebt = activeLokwasis.reduce((sum, l) => sum + l.salaryDebtBalance, 0)
  const terminatedDebt = terminatedLokwasis.reduce((sum, l) => sum + l.salaryDebtBalance, 0)

  console.log('\n📊 Summary:')
  console.log(`  Active Lokwasis: ${activeLokwasis.length}`)
  console.log(`  Terminated Lokwasis: ${terminatedLokwasis.length}`)
  console.log(`  Total Bi-weekly Salary: ₹${totalSalary.toLocaleString('en-IN')}`)
  console.log(`  Total Debt (All): ₹${totalDebt.toLocaleString('en-IN')}`)
  console.log(`    - Active employees: ₹${activeDebt.toLocaleString('en-IN')}`)
  console.log(`    - Terminated employees: ₹${terminatedDebt.toLocaleString('en-IN')}`)
  console.log(`  Pending Payrolls: 3 (Jan 1, 15, 29 2026)`)
  console.log('\n✅ Seed completed!')
  console.log('\n📝 Login credentials:')
  console.log('  Email: mudit@devalok.in')
  console.log('  Password: admin123')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
