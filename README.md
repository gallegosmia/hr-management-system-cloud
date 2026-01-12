# HR Management System - Digital 201 File

A comprehensive, secure, web-based HR Management System designed specifically for Philippine companies with a focus on Digital 201 File Management.

## 🌟 Features

### Core Module: Digital 201 File Masterlist
- **Complete Employee Profile Management**
  - Employee ID, Name, Department, Position
  - Employment Status tracking (Probationary, Regular, Contractual, Resigned)
  - Contact information and government IDs

- **Government & Statutory Compliance**
  - SSS Number
  - PhilHealth Number
  - Pag-IBIG Number
  - TIN (Tax Identification Number)

- **201 File Document Tracking Checklist**
  - Personal Information Complete
  - Pre-Employment Requirements Complete
  - Government Documents Complete
  - Employment Records Complete
  - Attendance Records Complete
  - Payroll Records Complete
  - Disciplinary Records
  - Training Records
  - Separation Records

- **Automated Completion Status**
  - Real-time calculation of 201 file completion
  - Color-coded status indicators:
    - 🟢 Green = Complete
    - 🟡 Yellow = Partial
    - 🔴 Red = Incomplete

### Additional Features
- **Dashboard with Statistics**
  - Total employees count
  - 201 file completion breakdown
  - Department distribution
  - Employment status overview

- **Search & Filter Capabilities**
  - Search by name, ID, department, or position
  - Filter by department, employment status, or completion level
  - Export to Excel/CSV

- **Transportation Allowance Management**
  - Monthly ₱400.00 allowance per employee (distributed on the 10th)
  - PDF acknowledgment form generation
  - Employee signature collection
  - Automated employee list and total calculation

- **Security & Compliance**
  - Role-based access control (Admin, HR, Manager, Employee)
  - Secure password encryption
  - Activity audit logging
  - Data privacy compliance

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ installed
- npm or yarn package manager

### Installation

1. **Install Dependencies**
   ```powershell
   npm install
   ```

2. **Run Development Server**
   ```powershell
   npm run dev
   ```

3. **Open in Browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

### Default Login Credentials
- **Username:** `admin`
- **Password:** `admin123`

## 📁 Project Structure

```
HR MANAGEMENT SYSTEM/
├── app/
│   ├── api/                    # API routes
│   │   ├── auth/              # Authentication endpoints
│   │   ├── dashboard/         # Dashboard statistics
│   │   └── employees/         # Employee CRUD operations
│   ├── dashboard/             # Dashboard page
│   ├── employees/             # Employee management pages
│   │   ├── [id]/             # Employee detail view
│   │   └── add/              # Add new employee
│   ├── globals.css            # Global styles & design system
│   ├── layout.tsx             # Root layout
│   └── page.tsx               # Login page
├── components/
│   └── DashboardLayout.tsx    # Reusable dashboard layout
├── lib/
│   ├── auth.ts                # Authentication & authorization
│   ├── data.ts                # Data access layer
│   └── database.ts            # Database initialization
├── package.json
├── tsconfig.json
└── next.config.js
```

## 🎨 Design System

The application uses a modern, professional design system with:
- **Color Palette:** Professional blue and purple gradients
- **Typography:** Inter for body text, Poppins for headings
- **Components:** Cards, buttons, forms, tables, badges, modals
- **Responsive:** Mobile-first design with desktop optimization
- **Animations:** Smooth transitions and micro-interactions

## 🔒 Security Features

1. **Authentication**
   - Password hashing with bcrypt
   - Session-based authentication
   - Automatic session expiration

2. **Authorization**
   - Role-based access control
   - Permission checks on all operations
   - Data visibility based on user role

3. **Audit Trail**
   - All CRUD operations logged
   - User activity tracking
   - Timestamp and IP address recording

## 📊 Database Schema

The system uses SQLite for local development (easily upgradable to PostgreSQL for production):

- **users** - User accounts and authentication
- **employees** - Main 201 file masterlist
- **documents** - File attachments per employee
- **attendance** - Daily attendance records
- **leave_requests** - Leave applications and approvals
- **disciplinary_records** - Disciplinary actions
- **training_records** - Training and seminars
- **audit_logs** - System activity logs

## 🇵🇭 Philippine Compliance

This system is designed to comply with Philippine labor laws and DOLE requirements:
- Complete 201 file documentation
- Government ID tracking (SSS, PhilHealth, Pag-IBIG, TIN)
- Employment status management
- Audit-ready record keeping
- Printable reports for DOLE inspections

## 📈 Future Enhancements

- [ ] Document upload and storage
- [ ] PDF generation for 201 files
- [ ] Payroll integration
- [ ] Advanced reporting and analytics
- [ ] Email notifications
- [ ] Mobile app
- [ ] Biometric integration
- [ ] Cloud backup

## 🛠️ Technology Stack

- **Frontend:** Next.js 14, React 18, TypeScript
- **Styling:** Modern CSS with custom design system
- **Database:** SQLite (development), PostgreSQL-ready
- **Authentication:** bcrypt, session-based
- **Export:** CSV/Excel export capabilities

## 📝 License

This project is designed for internal company use. All rights reserved.

## 👥 Support

For support and questions, contact your HR department or system administrator.

---

**Built with ❤️ for Philippine Companies**
🇵🇭 DOLE Compliant • Secure • Audit-Ready
