- [x] **Reports & Analytics**: Compliance, attendance, and leave reports.
- [x] **Auto-Alerts**: Critical notifications for missing docs and probation.
- [x] **Excel Import**: Bulk employee onboarding.
- [x] **100% Offline Ready**: No internet connection required for daily operations.

## 🔧 Deployment Steps

1. **Build the Application**:
   ```bash
   npm run build
   ```

2. **Start Production Server**:
   ```bash
   npm start
   ```

3. **Access the System**:
   - URL: `http://localhost:3000`
   - Admin Login: `admin` / `admin123`

## 🖥️ Use as an Offline Desktop App

1. Open the system in **Google Chrome** or **Microsoft Edge**.
2. Click the **three dots (⋮)** in the top right corner.
3. Go to **"Apps"** > **"Install this site as an app"**.
4. This will create a shortcut on your desktop. You can now open the HR System like a regular offline program!

## 🧪 How to Test New Features

### 1. Auto-Alerts
- Go to the Dashboard.
- Look for the red "Action Required" widget.
- It will show alerts for any incomplete 201 files or probationary employees.

### 2. Excel Import
- Go to `http://localhost:3000/import`.
- Upload a sample Excel file with columns: `employee_id`, `first_name`, `last_name`, `department`, etc.
- Click "Start Import".

### 3. Attendance
- Click "Attendance" in the sidebar.
- Select a department to filter.
- Enter Time-In (e.g., 08:00) and Time-Out (e.g., 17:00).
- Click "Save Attendance".

### 4. Leave Requests (Enhanced)
- **Configuration**: Go to Settings > Leave Configuration. Enable "Level 1" and "Level 2" approval. Set cut-off days.
- **Filing**: Go to Leave page. File a request.
- **Approval**:
  - Status should be "Pending Level 1".
  - Approve it. Status should change to "Pending Level 2" (if enabled).
  - Approve again. Status should be "Approved".
- **Cancellation**: File another request. Click the "Trash" icon to cancel it.
- **Reports**: Go to Reports page. Click "Leave Report" to download the PDF.

### 5. Reports
- Click "Reports" in the sidebar.
- View the charts and tables.
- Click "Download Compliance Report" to generate a PDF.

### 6. Settings
- Click "Settings" in the sidebar.
- **General**: Update Company Name or Attendance Cutoff and click Save.
- **User Management**: Create a new user (e.g., `hr_user` / `hr123`) and try logging in with it.

### 7. Payroll Setup (New)
- **Configure Salary**: Go to Employees > Edit Employee. Scroll down to "Compensation & Benefits".
- **Rates**: Enter Basic Salary. Daily/Hourly rates are auto-calculated.
- **Allowances**: Add Allowances (Rice, Laundry, etc.).
- **Deductions**: 
    - Enter government contributions (SSS, PhilHealth, Pag-IBIG) with decimal precision.
    - **Other Deductions**: Add custom deductions (e.g., Uniform, Union Fees) with specific names and amounts.
- Save Changes.

### 8. Payroll Processing (New)
- **Create Run**: Go to Payroll > New Payroll Run.
- **Select Dates**: Choose a period (e.g., 1-15 or 16-30).
- **Preview**: Click "Generate Preview". 
- **Adjust Attendance**: 
    - **Days Present**: Manually adjust the number of days worked (defaults to 11 for semi-monthly).
    - **Double Pay**: Enter the number of holiday/double pay days. The system adds 200% pay for these days.
- **Verify**: Check that "Other Deductions" and loans are correctly applied.
- **Save**: Click "Confirm & Save".
- **History**: Click "View Details" on any run in the list to see individual payslips and deduction breakdowns.

## 📝 Maintenance

- **Database**: The system uses a JSON file database located at `data/database.json`. Back up this file regularly.
- **Logs**: Check the console logs for any runtime errors.

**Congratulations! Your HR System is ready.**
