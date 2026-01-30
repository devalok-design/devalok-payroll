/**
 * Seed script for Devalok Payroll
 *
 * Run with: npx tsx scripts/seed.ts
 *
 * This script:
 * 1. Creates an admin user
 * 2. Imports lokwasis with their debt balances and leave balances
 * 3. Sets up the payroll schedule
 */

import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// Current team members at Devalok Design and Strategy Studio Private Limited
// Data extracted from Payroll - 2025.xlsx
const lokwasisData = [
  {
    name: 'Mudit Lal',
    employeeCode: 'LW001',
    pan: '', // To be filled
    aadhaar: '',
    bankAccount: '',
    ifscCode: '',
    bankName: '',
    beneficiaryNickname: 'MUDITLAL',
    isAxisBank: false,
    tdsRate: 10,
    grossSalary: 20000, // Bi-weekly salary
    leaveBalance: 0,
    salaryDebtBalance: 0,
    natureOfWork: 'Consultation',
    joinedDate: new Date('2024-01-01'),
  },
  {
    name: 'Amal Krishna A',
    employeeCode: 'LW002',
    pan: '', // To be filled
    aadhaar: '',
    bankAccount: '',
    ifscCode: '',
    bankName: '',
    beneficiaryNickname: 'AMALKRISHNA',
    isAxisBank: false,
    tdsRate: 10,
    grossSalary: 0, // To be filled
    leaveBalance: 0,
    salaryDebtBalance: 0,
    natureOfWork: 'Consultation',
    joinedDate: new Date('2024-01-01'),
  },
  {
    name: 'Arundhati Thakur',
    employeeCode: 'LW003',
    pan: 'BMHPT6524J',
    aadhaar: '692258882107',
    bankAccount: '50100118223453',
    ifscCode: 'HDFC0000805',
    bankName: 'HDFC Bank',
    beneficiaryNickname: 'ARUNDHATI',
    isAxisBank: false,
    tdsRate: 10,
    grossSalary: 42500,
    leaveBalance: 0,
    salaryDebtBalance: 275000,
    natureOfWork: 'Consultation',
    joinedDate: new Date('2024-01-01'),
  },
  {
    name: 'Ayursha Nimse',
    employeeCode: 'LW004',
    pan: 'BSPPN3471E',
    aadhaar: '371652920957',
    bankAccount: '0632100100000771',
    ifscCode: 'PUNB0063210',
    bankName: 'Punjab National Bank',
    beneficiaryNickname: 'AYURSHNIMSE',
    isAxisBank: false,
    tdsRate: 10,
    grossSalary: 30000,
    leaveBalance: 0, // Leave balances managed manually
    salaryDebtBalance: 165000,
    natureOfWork: 'Consultation',
    joinedDate: new Date('2024-01-01'),
  },
  {
    name: 'Bhavika Jain',
    employeeCode: 'LW005',
    pan: '', // To be filled
    aadhaar: '',
    bankAccount: '',
    ifscCode: '',
    bankName: '',
    beneficiaryNickname: 'BHAVIKAJAIN',
    isAxisBank: false,
    tdsRate: 10,
    grossSalary: 10000, // To be confirmed
    leaveBalance: 0,
    salaryDebtBalance: 15000,
    natureOfWork: 'Consultation',
    joinedDate: new Date('2024-01-01'),
  },
  {
    name: 'Chhavi Priya Gaur',
    employeeCode: 'LW006',
    pan: 'CDIPG7525D',
    aadhaar: '346353616274',
    bankAccount: '41136709483',
    ifscCode: 'SBIN0015994',
    bankName: 'State Bank of India',
    beneficiaryNickname: 'CHHAVIGAUR',
    isAxisBank: false,
    tdsRate: 10,
    grossSalary: 50000,
    leaveBalance: 0, // Leave balances managed manually
    salaryDebtBalance: 275000,
    natureOfWork: 'Consultation',
    joinedDate: new Date('2024-01-01'),
  },
  {
    name: 'Goutham H M',
    employeeCode: 'LW007',
    pan: 'DHWPG4724D',
    aadhaar: '512647238923',
    bankAccount: '64176621170',
    ifscCode: 'SBIN0040139',
    bankName: 'State Bank of India',
    beneficiaryNickname: 'GOUTHAMHM',
    isAxisBank: false,
    tdsRate: 10,
    grossSalary: 30000,
    leaveBalance: 0,
    salaryDebtBalance: 165000,
    natureOfWork: 'Consultation',
    joinedDate: new Date('2024-01-01'),
  },
  {
    name: 'Parth Dake',
    employeeCode: 'LW008',
    pan: 'FCQPD0249K',
    aadhaar: '418882678623',
    bankAccount: '30140100020302',
    ifscCode: 'BARB0MIRARO',
    bankName: 'Bank of Baroda',
    beneficiaryNickname: 'PARTHDAKE',
    isAxisBank: false,
    tdsRate: 10,
    grossSalary: 45000,
    leaveBalance: 0, // Leave balances managed manually
    salaryDebtBalance: 247500,
    natureOfWork: 'Consultation',
    joinedDate: new Date('2024-01-01'),
  },
  {
    name: 'Shalini Srivastava',
    employeeCode: 'LW009',
    pan: '', // To be filled
    aadhaar: '',
    bankAccount: '',
    ifscCode: '',
    bankName: '',
    beneficiaryNickname: 'SHALINISRIVASTAVA',
    isAxisBank: false,
    tdsRate: 10,
    grossSalary: 0, // To be filled
    leaveBalance: 0,
    salaryDebtBalance: 0,
    natureOfWork: 'Consultation',
    joinedDate: new Date('2024-01-01'),
  },
  {
    name: 'Shriman Visahan',
    employeeCode: 'LW010',
    pan: '', // To be filled
    aadhaar: '',
    bankAccount: '',
    ifscCode: '',
    bankName: '',
    beneficiaryNickname: 'SHRIMANVISAHAN',
    isAxisBank: false,
    tdsRate: 10,
    grossSalary: 45000, // INR 90,000 per 28 days = 45,000 bi-weekly
    leaveBalance: 0,
    salaryDebtBalance: 0, // New hire, no legacy debt
    natureOfWork: 'Consultation',
    joinedDate: new Date('2024-01-01'),
  },
  {
    name: 'Srihitha Jaligama',
    employeeCode: 'LW011',
    pan: '', // To be filled
    aadhaar: '',
    bankAccount: '',
    ifscCode: '',
    bankName: '',
    beneficiaryNickname: 'SRIHITHAJALIGAMA',
    isAxisBank: false,
    tdsRate: 10,
    grossSalary: 0, // To be filled
    leaveBalance: 0,
    salaryDebtBalance: 0,
    natureOfWork: 'Consultation',
    joinedDate: new Date('2024-01-01'),
  },
  {
    name: 'Vidit Lal',
    employeeCode: 'LW012',
    pan: '', // To be filled
    aadhaar: '',
    bankAccount: '51792191018202',
    ifscCode: 'PUNB0517910',
    bankName: 'Punjab National Bank',
    beneficiaryNickname: 'VIDITLAL',
    isAxisBank: false,
    tdsRate: 10,
    grossSalary: 5000, // To be confirmed
    leaveBalance: 0,
    salaryDebtBalance: 12500,
    natureOfWork: 'Consultation',
    joinedDate: new Date('2024-01-01'),
  },
  {
    name: 'Yogin Naidu',
    employeeCode: 'LW013',
    pan: 'GGZPS6419C',
    aadhaar: '846625470798',
    bankAccount: '9613225695',
    ifscCode: 'KKBK0008072',
    bankName: 'Kotak Mahindra Bank',
    beneficiaryNickname: 'YOGINNAIDU',
    isAxisBank: false,
    tdsRate: 10,
    grossSalary: 37500,
    leaveBalance: 0, // Leave balances managed manually
    salaryDebtBalance: 93750,
    natureOfWork: 'Consultation',
    joinedDate: new Date('2024-01-01'),
  },
]

// Total Salary Debt from proprietorship transition: ₹1,327,500
// Note: Some team members have incomplete data - fill via app UI

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

  // Delete existing lokwasis to start fresh
  console.log('\nClearing existing lokwasis...')
  await prisma.lokwasi.deleteMany({})

  // Create lokwasis
  console.log('\nCreating lokwasis...')
  for (const data of lokwasisData) {
    const lokwasi = await prisma.lokwasi.create({
      data: {
        ...data,
        initialLeaveBalance: data.leaveBalance,
        status: 'ACTIVE',
        createdById: admin.id,
      },
    })
    console.log(`  ✓ ${lokwasi.name} (${lokwasi.employeeCode}) - Salary: ₹${data.grossSalary.toLocaleString('en-IN')}`)
  }

  // Create payroll schedule
  console.log('\nCreating payroll schedule...')
  const lastPayrollDate = new Date('2025-12-18') // December 18, 2025 - paid out January 23, 2026
  const nextPayrollDate = new Date('2026-01-01')

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
  console.log(`  ✓ Schedule created: Last payroll ${lastPayrollDate.toDateString()}, Next: ${nextPayrollDate.toDateString()}`)

  // Summary
  const totalSalary = lokwasisData.reduce((sum, l) => sum + l.grossSalary, 0)
  const totalDebt = lokwasisData.reduce((sum, l) => sum + l.salaryDebtBalance, 0)
  const withCompleteData = lokwasisData.filter(l => l.pan && l.bankAccount).length
  const needsData = lokwasisData.length - withCompleteData

  console.log('\n📊 Summary:')
  console.log(`  Lokwasis: ${lokwasisData.length}`)
  console.log(`  Total Bi-weekly Salary: ₹${totalSalary.toLocaleString('en-IN')}`)
  console.log(`  Total Salary Debt: ₹${totalDebt.toLocaleString('en-IN')}`)
  console.log(`  Complete Data: ${withCompleteData} | Needs Data: ${needsData}`)
  console.log('\n✅ Seed completed!')
  console.log('\n📝 Login credentials:')
  console.log('  Email: mudit@devalok.in')
  console.log('  Password: admin123')
  console.log('\n⚠️  Note: Some team members need bank/PAN details filled via the app UI')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
