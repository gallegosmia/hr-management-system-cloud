@echo off
echo ========================================
echo HR Management System - PostgreSQL Setup
echo ========================================
echo.
echo This script will complete the PostgreSQL setup:
echo 1. Create the database
echo 2. Initialize schema (create tables)
echo 3. Migrate data from JSON to PostgreSQL
echo 4. Start the application
echo.
pause

echo.
echo [Step 1/4] Creating database...
echo.
psql -U postgres -c "CREATE DATABASE hr_management;" 2>nul
if %errorlevel% equ 0 (
    echo ✓ Database created successfully!
) else (
    echo ℹ Database might already exist, continuing...
)

echo.
echo [Step 2/4] Initializing database schema...
echo.
node init_database.js
if %errorlevel% neq 0 (
    echo ✗ Schema initialization failed!
    pause
    exit /b 1
)

echo.
echo [Step 3/4] Migrating data from JSON to PostgreSQL...
echo.
node migrate-json-to-postgres.js
if %errorlevel% neq 0 (
    echo ⚠ Data migration had issues, but continuing...
)

echo.
echo [Step 4/4] Starting the application...
echo.
echo Your HR Management System will start at: http://localhost:3005
echo.
echo Press Ctrl+C to stop the server when done.
echo.
pause

npm run dev

pause
