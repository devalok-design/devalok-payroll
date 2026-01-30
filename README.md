# Devalok Payroll Management System

A web-based payroll management tool for Devalok Design Private Limited.

## Features

- **Lokwasi (Employee) Management**: Add, edit, and manage team members with secure storage of sensitive data (PAN, Aadhaar, bank details)
- **Payroll Processing**: Create payroll runs with automatic TDS calculation, leave cashout, and salary debt payout
- **Excel Export**: Download bank payment files in Axis Bank format (within-bank) and NEFT format (other banks)
- **TDS Management**: Track monthly TDS deductions with exportable reports for CA
- **Salary Debt Tracking**: Monitor and pay off salary debts from proprietorship transition
- **Audit Trail**: Complete history of all actions for compliance

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Database**: PostgreSQL (Neon)
- **ORM**: Prisma
- **Auth**: NextAuth.js v5
- **Styling**: Tailwind CSS v4
- **Excel**: ExcelJS

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database (recommend [Neon](https://neon.tech) for free serverless PostgreSQL)

### Environment Variables

Create a `.env` file in the `app` directory:

```env
# Database
DATABASE_URL="postgresql://user:password@host:5432/database?sslmode=require"

# NextAuth
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"
```

### Installation

```bash
# Navigate to app directory
cd app

# Install dependencies
npm install

# Push database schema
npm run db:push

# Seed the database with initial data
npm run db:seed

# Start development server
npm run dev
```

### Default Login

After seeding, you can log in with:
- **Email**: admin@devalok.com
- **Password**: admin123

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard:
   - `DATABASE_URL` - Your Neon PostgreSQL connection string
   - `NEXTAUTH_SECRET` - Generate with `openssl rand -base64 32`
   - `NEXTAUTH_URL` - Your production URL (e.g., https://payroll.devalok.com)
4. Deploy!

### Database Setup (Neon)

1. Create a free account at [neon.tech](https://neon.tech)
2. Create a new project
3. Copy the connection string to `DATABASE_URL`
4. Run `npm run db:push` to create tables

## Project Structure

```
app/
├── prisma/
│   └── schema.prisma       # Database schema
├── scripts/
│   └── seed.ts             # Database seeding script
├── src/
│   ├── app/
│   │   ├── (auth)/         # Login pages
│   │   ├── (dashboard)/    # Protected dashboard pages
│   │   │   ├── lokwasis/   # Employee management
│   │   │   ├── payroll/    # Payroll processing
│   │   │   ├── tds/        # TDS management
│   │   │   ├── debts/      # Salary debt tracking
│   │   │   └── settings/   # System settings
│   │   └── api/            # API routes
│   ├── components/         # React components
│   └── lib/
│       ├── auth.ts         # NextAuth configuration
│       ├── prisma.ts       # Prisma client
│       ├── utils.ts        # Utility functions
│       ├── calculations/   # Payroll calculation logic
│       ├── excel/          # Excel template generators
│       └── validators/     # Zod schemas
```

## Payroll Workflow

1. **Dashboard** shows pending payrolls and alerts
2. **Create Payroll Run**: Select date, review employees, adjust leave cashout/debt payout
3. **Download Excel**: Get Axis Bank or NEFT payment files
4. **Upload to Bank**: Process payment through Axis Net Banking
5. **Mark as Paid**: Updates TDS records and balances

## Security

- Sensitive data (PAN, Aadhaar, bank accounts) stored encrypted
- Password hashing with bcrypt
- Session-based authentication with JWT
- Full audit logging of all actions
- Role-based access control (Admin/Viewer)

## License

Proprietary - Devalok Design Private Limited

---

Built with love by Devalok
