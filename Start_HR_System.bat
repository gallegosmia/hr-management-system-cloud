@echo off
title Melann HR Management System Launcher
echo ====================================================
echo   MELANN HR MANAGEMENT SYSTEM - OFFLINE LAUNCHER
echo ====================================================
echo.
echo 1. Starting the HR System engine...
echo 2. Opening your browser to http://localhost:3000...
echo.
echo IMPORTANT: Keep this window open while using the system.
echo You can minimize it, but do not close it.
echo.
echo ====================================================

:: Open the browser automatically
start "" "http://localhost:3000"

:: Start the server
npm run dev

echo.
echo ====================================================
echo   ERROR: The system stopped unexpectedly.
echo   Please check the messages above for details.
echo ====================================================
pause
