# Setup Local PostgreSQL Database - Step by Step Guide

## 📋 Overview
This guide will help you switch from the JSON file database to a local PostgreSQL database running on your Windows machine.

---

## Step 1: Install PostgreSQL

### Option A: Using Official Installer (Recommended)

1. **Download PostgreSQL**
   - Visit: https://www.postgresql.org/download/windows/
   - Click "Download the installer"
   - Choose the latest version (PostgreSQL 16.x recommended)
   - Download the Windows x86-64 installer

2. **Run the Installer**
   - Double-click the downloaded `.exe` file
   - Click "Next" through the welcome screen

3. **Installation Settings**
   - **Installation Directory**: Keep default (`C:\Program Files\PostgreSQL\16`)
   - **Components to Install**: Select all (PostgreSQL Server, pgAdmin 4, Stack Builder, Command Line Tools)
   - **Data Directory**: Keep default (`C:\Program Files\PostgreSQL\16\data`)
   - **Password**: Set a password for the `postgres` superuser
     - ⚠️ **IMPORTANT**: Remember this password! You'll need it later.
     - Example: `admin123` (or choose your own secure password)
   - **Port**: Keep default `5432`
   - **Locale**: Keep default locale

4. **Complete Installation**
   - Click "Next" and wait for installation to complete
   - Uncheck "Launch Stack Builder at exit" (not needed)
   - Click "Finish"

### Option B: Using Chocolatey (Alternative)

If you have Chocolatey installed:
```powershell
choco install postgresql
```

---

## Step 2: Verify PostgreSQL Installation

Open PowerShell and run:
```powershell
# Add PostgreSQL to PATH (if not already added)
$env:Path += ";C:\Program Files\PostgreSQL\16\bin"

# Verify installation
psql --version
```

You should see something like: `psql (PostgreSQL) 16.x`

---

## Step 3: Create the Database

### Using pgAdmin 4 (GUI Method)

1. **Open pgAdmin 4**
   - Search for "pgAdmin 4" in Windows Start Menu
   - It will open in your browser

2. **Connect to PostgreSQL**
   - Expand "Servers" in the left panel
   - Click on "PostgreSQL 16"
   - Enter the password you set during installation

3. **Create Database**
   - Right-click on "Databases"
   - Select "Create" → "Database..."
   - Database name: `hr_management`
   - Owner: `postgres`
   - Click "Save"

### Using Command Line (Alternative)

Open PowerShell as Administrator:
```powershell
# Connect to PostgreSQL
psql -U postgres

# Enter your password when prompted
# Then run this SQL command:
CREATE DATABASE hr_management;

# Exit psql
\q
```

---

## Step 4: Update Environment Configuration

1. **Edit the `.env` file** in your project root
2. **Update the DATABASE_URL**:

```env
# Local PostgreSQL Connection
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/hr_management
```

**Replace `YOUR_PASSWORD`** with the password you set during PostgreSQL installation.

Example:
```env
DATABASE_URL=postgresql://postgres:admin123@localhost:5432/hr_management
```

---

## Step 5: Initialize Database Schema

Run this command to create all the tables:

```powershell
node init_database.js
```

You should see:
```
🚀 Starting database initialization...
📄 Executing schema.sql...
✅ Schema created successfully!
👤 Creating default admin user...
✅ Admin user created!
   Username: admin
   Password: admin123
🎉 Database initialization complete!
```

---

## Step 6: Migrate Existing Data (Optional)

If you want to keep your existing data from the JSON database:

```powershell
node migrate-json-to-postgres.js
```

This will:
- Read your `data/database.json` file
- Transfer all records to PostgreSQL
- Preserve your existing users, employees, attendance, etc.

---

## Step 7: Start the Application

```powershell
npm run dev
```

Check the console output. You should now see:
```
✅ PostgreSQL Database connected
```

Instead of:
```
✅ Local JSON Database initialized
```

---

## Step 8: Verify Everything Works

1. **Open your browser**: http://localhost:3001
2. **Login** with your existing credentials
3. **Check the data** - all your records should be there

---

## 🔧 Troubleshooting

### Issue: "psql: command not found"

**Solution**: Add PostgreSQL to your PATH manually

1. Open System Environment Variables:
   - Press `Win + R`
   - Type `sysdm.cpl` and press Enter
   - Click "Environment Variables"

2. Edit the PATH variable:
   - Under "System variables", find "Path"
   - Click "Edit"
   - Click "New"
   - Add: `C:\Program Files\PostgreSQL\16\bin`
   - Click "OK" on all windows

3. Restart PowerShell and try again

### Issue: "Connection refused" or "ECONNREFUSED"

**Solution**: Make sure PostgreSQL service is running

1. Open Services:
   - Press `Win + R`
   - Type `services.msc` and press Enter

2. Find "postgresql-x64-16" (or similar)
   - Right-click → "Start" if it's stopped
   - Right-click → "Properties" → Set "Startup type" to "Automatic"

### Issue: "password authentication failed"

**Solution**: Check your password in the `.env` file

- Make sure the password in `DATABASE_URL` matches the one you set during installation
- No spaces or special characters that need escaping

### Issue: "database does not exist"

**Solution**: Create the database again

```powershell
psql -U postgres -c "CREATE DATABASE hr_management;"
```

---

## 📊 Database Management Tools

### pgAdmin 4 (Installed with PostgreSQL)
- GUI tool for managing databases
- View tables, run queries, backup/restore
- Access: Start Menu → pgAdmin 4

### Command Line (psql)
```powershell
# Connect to your database
psql -U postgres -d hr_management

# Useful commands:
\dt              # List all tables
\d table_name    # Describe table structure
SELECT * FROM users LIMIT 5;  # Query data
\q               # Quit
```

---

## 🎯 Next Steps

After successful setup:

1. ✅ Your app now uses PostgreSQL instead of JSON files
2. ✅ Better performance and reliability
3. ✅ Proper database transactions and constraints
4. ✅ Ready for production deployment

---

## 📝 Notes

- **JSON Backup**: Your original `data/database.json` is kept as a backup
- **Performance**: PostgreSQL is much faster for large datasets
- **Scalability**: Can handle thousands of employees and records
- **Security**: Better data integrity and security features

---

## 🆘 Need Help?

If you encounter any issues:
1. Check the troubleshooting section above
2. Verify PostgreSQL service is running
3. Check the console logs for specific error messages
4. Make sure the DATABASE_URL is correct in `.env`
