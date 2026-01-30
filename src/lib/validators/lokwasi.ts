import { z } from 'zod'

export const lokwasiSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  pan: z
    .string()
    .regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, 'Invalid PAN format (e.g., AAAAA0000A)')
    .transform((val) => val.toUpperCase()),
  aadhaar: z
    .string()
    .regex(/^[0-9]{12}$/, 'Aadhaar must be 12 digits')
    .transform((val) => val.replace(/\s/g, '')),
  bankAccount: z.string().min(5, 'Bank account number required'),
  ifscCode: z
    .string()
    .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC format (e.g., SBIN0001234)')
    .transform((val) => val.toUpperCase()),
  bankName: z.string().min(2, 'Bank name required'),
  beneficiaryNickname: z.string().min(2, 'Beneficiary nickname required'),
  isAxisBank: z.boolean().default(false),
  tdsRate: z.coerce.number().min(0).max(100).default(10),
  grossSalary: z.coerce.number().min(0, 'Salary must be positive'),
  natureOfWork: z.string().default('Professional Services'),
  leaveBalance: z.coerce.number().min(0).default(0),
  salaryDebtBalance: z.coerce.number().min(0).default(0),
  joinedDate: z.coerce.date(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'TERMINATED']).default('ACTIVE'),
})

export type LokwasiFormData = z.infer<typeof lokwasiSchema>

export const lokwasiUpdateSchema = lokwasiSchema.partial()

export type LokwasiUpdateData = z.infer<typeof lokwasiUpdateSchema>
