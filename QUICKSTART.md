# 🚀 Quick Start Guide

## HR Management System - Digital 201 File

### Step 1: Install Dependencies

Open PowerShell in the project directory and run:

```powershell
npm install
```

This will install all required packages including:
- Next.js 14 (React framework)
- TypeScript (type safety)
- bcryptjs (password encryption)
- better-sqlite3 (database)
- date-fns (date utilities)
- jspdf & xlsx (export functionality)

### Step 2: Run the Development Server

```powershell
npm run dev
```

The application will start on [http://localhost:3000](http://localhost:3000)

### Step 3: Login

Use the default admin credentials:
- **Username:** `admin`
- **Password:** `admin123`

### Step 4: Start Using the System

1. **Dashboard** - View overall statistics and quick actions
2. **201 Files** - Add and manage employee records
3. **Add Employee** - Create new employee profiles
4. **View Employee** - See complete 201 file with checklist
5. **Update Checklist** - Click on checklist items to toggle completion

## 📋 Key Features to Try

### Add Your First Employee
1. Click "Add New Employee" from the dashboard
2. Fill in the employee information
3. Include government IDs (SSS, PhilHealth, Pag-IBIG, TIN)
4. Save the employee

### Track 201 File Completion
1. Go to the employee detail page
2. Click on checklist items to mark them as complete
3. Watch the completion percentage update automatically
4. Status will change from Incomplete → Partial → Complete

### Search and Filter
1. Go to the 201 Files page
2. Use the search box to find employees
3. Filter by department, employment status, or completion level
4. Export the filtered list to Excel

## 🎨 Color-Coded Status System

- 🟢 **Green (Complete)** - All required documents are in place
- 🟡 **Yellow (Partial)** - Some documents are missing
- 🔴 **Red (Incomplete)** - Most documents are missing

## 🔒 Security Notes

- The database is created automatically on first run
- All passwords are encrypted with bcrypt
- Session expires after 24 hours of inactivity
- All actions are logged in the audit trail

## 📊 Database Location

The SQLite database file `hr_system.db` will be created in the project root directory.

## 🛠️ Troubleshooting

### If npm install fails:
1. Make sure Node.js 18+ is installed
2. Try running PowerShell as Administrator
3. If you get execution policy errors, run:
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```

### If the server won't start:
1. Make sure port 3000 is not in use
2. Check for any error messages in the console
3. Try deleting `node_modules` and `.next` folders, then run `npm install` again

### If you can't login:
1. Delete the `hr_system.db` file
2. Restart the server to recreate the database with default admin user

## 📱 Browser Compatibility

Works best on:
- Chrome/Edge (recommended)
- Firefox
- Safari

## 🎯 Next Steps

After getting familiar with the system:
1. Add your company's departments
2. Import existing employee data
3. Set up additional user accounts
4. Configure role-based permissions
5. Start tracking 201 file completion

## 💡 Tips

- Use the search function to quickly find employees
- Export data regularly for backup
- Keep government IDs updated for compliance
- Review the audit logs periodically
- Mark 201 file items as complete as documents are collected

---

**Need Help?** Contact your system administrator or refer to the README.md file for detailed documentation.

🇵🇭 **Built for Philippine Companies** - DOLE Compliant & Audit-Ready
