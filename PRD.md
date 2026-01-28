# Product Requirements Document (PRD): HR & Payroll Management System

## 1. Project Overview
The **HR & Payroll Management System** is a comprehensive web-based platform designed to streamline human resource operations, employee record-keeping (201 files), and payroll processing for small to medium enterprises.

## 2. Target Audience
- **HR Administrators:** For managing employee data, documents, and attendance.
- **Finance/Payroll Officers:** For calculating salaries, managing loans, and generating payslips.
- **Employees:** For viewing personal profiles and downloading payslips.

## 3. Core Modules & Features

### A. Employee Management (201 Module)
- **Profile Management:** Modern, card-based UI for viewing and editing employee personal details.
- **Fields Included:** Full Name, Date of Birth, Gender, Civil Status, Religion, Email, Contact Number, Residential Address, and Employment Status.
- **Emergency Contacts:** Dedicated section for emergency contact name and number.
- **Document Management:** Upload and manage employee-related PDF documents (Contracts, Medical records, etc.).
- **Educational Attainment:** Track school history and degrees.
- **Profile Picture:** Support for uploading and displaying employee photos.

### B. Payroll Management
- **Payroll Runs:** Create and manage batch payroll processing.
- **Payslip Generation:** Automatic calculation of net pay based on earnings and deductions.
- **Loan Management:** Track employee loans and automatically deduct payments during payroll runs.
- **Payroll Register:** Generate comprehensive PDF reports (Legal Portrait) for banking or accounting purposes.
- **Custom Allowances:** Management of Transportation Allowance and Bonuses per branch.

### C. Attendance & Time Tracking
- **Time Logs:** Track daily clock-in/out.
- **Attendance Summary:** View YTD stats (Lates, Absences, Leaves) directly on the employee's 201 file.
- **Integration:** Attendance data feeds directly into the payroll calculation engine.

### D. Reporting & Analytics
- **Branch Filtering:** Filter payroll and employee reports by specific branches.
- **PDF Export:** Support for downloading high-quality PDF reports for 201 files and payroll records.

### E. Authentication & Security
- **Role-Based Access Control (RBAC):** Restrict access to sensitive payroll data based on user roles.
- **Two-Factor Authentication:** OTP-based verification for secure logins.
- **Audit Logs:** Track system changes (e.g., employee updates) for accountability.

## 4. Technical Stack
- **Frontend:** Next.js (React), Tailwind CSS/Vanilla CSS (Redesigned for premium aesthetics).
- **Backend:** Next.js API Routes.
- **Database:** PostgreSQL (Neon Cloud) with local JSON fallback for development.
- **PDF Generation:** jsPDF and autoTable.
- **Authentication:** Custom JWT-based auth with OTP support.

## 5. Design Principles
- **Modern & Premium:** High-focus on aesthetics, using glassmorphism, subtle shadows, and vibrant green-themed accents.
- **Responsive:** Fluid layout that works across desktop and tablet devices.
- **User-Centric:** Intuitive navigation with breadcrumbs and clear tabbed interfaces.

## 6. Recent Updates (v2.0 Refactor)
- **Profile Redesign:** Simplified and modernized the "Edit Profile" experience.
- **Schema Optimization:** Expanded database fields to include Religion, Emergency Contacts, and full Address details.
- **UX Improvement:** Removed redundant "Family" and "Medical history" sections to focus on professional record-keeping.
- **Employment Management:** Added "Resigned" and "Terminated" statuses and branch assignment features.
- **Data Governance:** Implemented secure employee deletion from both the masterlist and 201 individual files.
- **System Cleanup:** Removed redundant "Compensation & Benefits" module, integrating all payroll setup directly into the 201 Employee File.

---
*Created on: January 27, 2026*
