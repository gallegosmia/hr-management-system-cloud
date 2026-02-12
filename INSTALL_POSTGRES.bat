@echo off
echo ========================================
echo PostgreSQL Quick Installer
echo ========================================
echo.
echo This will install PostgreSQL on your system.
echo.
echo IMPORTANT: You need to run this as Administrator!
echo.
pause

PowerShell -NoProfile -ExecutionPolicy Bypass -Command "& '%~dp0install-postgres.ps1'"

pause
