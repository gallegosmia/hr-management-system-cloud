@echo off
title Melann HR Management System Launcher
echo ====================================================
echo   MELANN HR MANAGEMENT SYSTEM - OFFLINE LAUNCHER
echo ====================================================
echo.
echo 1. Starting the HR System engine...
echo 2. Opening your browser to http://localhost:3005...
echo.
echo IMPORTANT: Keep this window open while using the system.
echo You can minimize it, but do not close it.
echo.
echo ====================================================

for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3005') do taskkill /F /PID %%a >nul 2>&1

:: Open the browser automatically
start "" "http://localhost:3005"

:: Start the server
npm run dev

echo.
echo ====================================================
echo   ERROR: The system stopped unexpectedly.
echo   Please check the messages above for details.
echo ====================================================
pause
