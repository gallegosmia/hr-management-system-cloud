# 🚀 PostgreSQL Setup - Complete Guide

## ✅ What I've Done For You:

I've prepared everything for your PostgreSQL setup. Here's what's ready:

### 📁 Files Created:

1. **`INSTALL_POSTGRES.bat`** - One-click PostgreSQL installer
2. **`SETUP_AND_START.bat`** - Complete database setup and app launcher
3. **`install-postgres.ps1`** - PowerShell installation script
4. **`migrate-json-to-postgres.js`** - Data migration script
5. **`SETUP_LOCAL_POSTGRES.md`** - Detailed documentation
6. **`.env`** - Updated with local PostgreSQL connection

### ⚙️ Configuration:

Your `.env` file is now configured for local PostgreSQL:
```
DATABASE_URL=postgresql://postgres:admin123@localhost:5432/hr_management
```

---

## 🎯 Quick Start (2 Steps Only!)

### Step 1: Install PostgreSQL

**Right-click** `INSTALL_POSTGRES.bat` → **Run as Administrator**

This will:
- Download and install PostgreSQL 16
- Set password to `admin123`
- Configure everything automatically

⏱️ Takes about 5-10 minutes

### Step 2: Setup Database & Start App

**Double-click** `SETUP_AND_START.bat`

This will:
- Create the `hr_management` database
- Create all tables (users, employees, attendance, etc.)
- Migrate your existing data from JSON to PostgreSQL
- Start your application at http://localhost:3001

⏱️ Takes about 1-2 minutes

---

## 🎉 That's It!

After these 2 steps, your HR Management System will be running on PostgreSQL!

---

## 🔧 Alternative: Manual Installation

If the automated installer doesn't work:

1. **Download PostgreSQL manually**:
   - Visit: https://www.postgresql.org/download/windows/
   - Download PostgreSQL 16 installer
   - Run installer, set password to `admin123`, port `5432`

2. **Then run**: `SETUP_AND_START.bat`

---

## 📊 What Changes?

### Before (JSON Database):
- Data stored in: `data/database.json` (3.69 MB file)
- Limited performance with large datasets
- No concurrent access support

### After (PostgreSQL):
- Data stored in: PostgreSQL database
- Much faster queries and operations
- Professional database with ACID compliance
- Ready for production use

---

## 🔐 Default Credentials

**PostgreSQL:**
- Username: `postgres`
- Password: `admin123`
- Database: `hr_management`
- Port: `5432`

**Application:**
- Username: `admin`
- Password: `admin123`

*(Change these after first login!)*

---

## ❓ Troubleshooting

### "Access Denied" when running INSTALL_POSTGRES.bat
→ Right-click and select "Run as Administrator"

### "psql: command not found" after installation
→ Close and reopen PowerShell/Command Prompt

### "Connection refused"
→ Check if PostgreSQL service is running in Windows Services

### "Database already exists" error
→ That's fine! It means the database is already created. Continue with the setup.

---

## 📞 Need Help?

Check the detailed guide: `SETUP_LOCAL_POSTGRES.md`

---

**Ready to start? Run `INSTALL_POSTGRES.bat` as Administrator!** 🚀
