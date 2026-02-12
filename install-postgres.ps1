# PostgreSQL Quick Install Script for Windows
# This script will download and install PostgreSQL automatically

Write-Host "🚀 PostgreSQL Quick Installer for HR Management System" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "⚠️  This script needs to run as Administrator" -ForegroundColor Yellow
    Write-Host "Please right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit
}

# Check if Chocolatey is installed
$chocoInstalled = Get-Command choco -ErrorAction SilentlyContinue

if ($chocoInstalled) {
    Write-Host "✅ Chocolatey detected. Using Chocolatey for installation..." -ForegroundColor Green
    Write-Host ""
    
    # Install PostgreSQL via Chocolatey
    Write-Host "📦 Installing PostgreSQL..." -ForegroundColor Cyan
    choco install postgresql16 --params '/Password:admin123' -y
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ PostgreSQL installed successfully!" -ForegroundColor Green
    } else {
        Write-Host "❌ Installation failed. Please install manually." -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "📥 Chocolatey not found. Downloading PostgreSQL installer..." -ForegroundColor Yellow
    Write-Host ""
    
    # Download PostgreSQL installer
    $installerUrl = "https://get.enterprisedb.com/postgresql/postgresql-16.1-1-windows-x64.exe"
    $installerPath = "$env:TEMP\postgresql-installer.exe"
    
    Write-Host "Downloading from: $installerUrl" -ForegroundColor Gray
    
    try {
        Invoke-WebRequest -Uri $installerUrl -OutFile $installerPath -UseBasicParsing
        Write-Host "✅ Download complete!" -ForegroundColor Green
        Write-Host ""
        
        Write-Host "🔧 Starting PostgreSQL installer..." -ForegroundColor Cyan
        Write-Host ""
        Write-Host "IMPORTANT INSTALLATION NOTES:" -ForegroundColor Yellow
        Write-Host "1. When prompted for password, use: admin123" -ForegroundColor Yellow
        Write-Host "2. Keep the default port: 5432" -ForegroundColor Yellow
        Write-Host "3. Install all components (including pgAdmin 4)" -ForegroundColor Yellow
        Write-Host ""
        
        # Run installer
        Start-Process -FilePath $installerPath -Wait
        
        Write-Host "✅ Installer completed!" -ForegroundColor Green
        
    } catch {
        Write-Host "❌ Download failed: $_" -ForegroundColor Red
        Write-Host ""
        Write-Host "Please download manually from:" -ForegroundColor Yellow
        Write-Host "https://www.postgresql.org/download/windows/" -ForegroundColor Cyan
        exit 1
    }
}

Write-Host ""
Write-Host "🔄 Adding PostgreSQL to PATH..." -ForegroundColor Cyan

# Add PostgreSQL to PATH
$pgPath = "C:\Program Files\PostgreSQL\16\bin"
if (Test-Path $pgPath) {
    $currentPath = [Environment]::GetEnvironmentVariable("Path", "Machine")
    if ($currentPath -notlike "*$pgPath*") {
        [Environment]::SetEnvironmentVariable("Path", "$currentPath;$pgPath", "Machine")
        $env:Path += ";$pgPath"
        Write-Host "✅ PostgreSQL added to PATH" -ForegroundColor Green
    } else {
        Write-Host "✅ PostgreSQL already in PATH" -ForegroundColor Green
    }
} else {
    Write-Host "⚠️  PostgreSQL bin directory not found at expected location" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🎉 PostgreSQL Installation Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Close and reopen PowerShell" -ForegroundColor White
Write-Host "2. Run: node init_database.js" -ForegroundColor White
Write-Host "3. Run: node migrate-json-to-postgres.js" -ForegroundColor White
Write-Host "4. Run: npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "Default credentials:" -ForegroundColor Yellow
Write-Host "  Username: postgres" -ForegroundColor White
Write-Host "  Password: admin123" -ForegroundColor White
Write-Host ""

Read-Host "Press Enter to exit"
