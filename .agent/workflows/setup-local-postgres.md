---
description: Setup Local PostgreSQL Database
---

# Setup Local PostgreSQL Database for HR Management System

This workflow will help you switch from the JSON file database to a local PostgreSQL database.

## Prerequisites

Before starting, you need to have PostgreSQL installed on your Windows machine.

### Step 1: Install PostgreSQL (if not already installed)

1. Download PostgreSQL from: https://www.postgresql.org/download/windows/
2. Run the installer and follow these settings:
   - **Port**: 5432 (default)
   - **Superuser password**: Choose a password (remember this!)
   - **Locale**: Default locale
3. Make sure to install pgAdmin 4 (comes with the installer)

### Step 2: Create Database

Open **pgAdmin 4** or use **psql** command line:

```sql
-- Create a new database
CREATE DATABASE hr_management;
```

Or via command line (PowerShell/CMD):
```bash
psql -U postgres
CREATE DATABASE hr_management;
\q
```

### Step 3: Update .env File

Update your `.env` file with the local PostgreSQL connection string:

```env
# Local PostgreSQL Connection
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/hr_management
```

Replace `YOUR_PASSWORD` with the password you set during PostgreSQL installation.

### Step 4: Initialize Database Schema

Run the initialization script to create all tables:

// turbo
```bash
node init_database.js
```

### Step 5: (Optional) Migrate Existing Data

If you want to migrate your existing JSON data to PostgreSQL, run:

```bash
node migrate-json-to-postgres.js
```

### Step 6: Restart the Application

// turbo
```bash
npm run dev
```

### Step 7: Verify Connection

Check the console output. You should see:
```
✅ PostgreSQL Database connected
```

Instead of:
```
✅ Local JSON Database initialized
```

## Troubleshooting

### Connection Refused
- Make sure PostgreSQL service is running
- Check Windows Services: `services.msc` → Look for "postgresql-x64-XX"

### Authentication Failed
- Verify your password in the DATABASE_URL
- Check pg_hba.conf file for authentication settings

### Port Already in Use
- Change the port in DATABASE_URL if 5432 is taken
- Or stop the service using that port

## Testing the Connection

You can test the connection by accessing:
```
http://localhost:3001/api/debug
```

This should show database connection status.
