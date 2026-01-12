@echo off
title Melann HR Management System - PRODUCTION
echo ====================================================
echo   MELANN HR MANAGEMENT SYSTEM - PRODUCTION MODE
echo ====================================================
echo.
echo 1. Launching optimized production server...
echo 2. Opening your browser to http://192.168.254.196:3001...
echo.
echo IMPORTANT: Keep this window open while using the system.
echo Performance is optimized for daily HR operations.
echo.
echo ====================================================

:: Open the browser automatically
start "" "http://192.168.254.196:3001"

:: Start the production server
npm start

echo.
echo ====================================================
echo   ERROR: The system stopped unexpectedly.
echo   Please check the messages above for details.
echo ====================================================
pause
