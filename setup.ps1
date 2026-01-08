# RestMon Quick Start Setup Script (Podman Version)
# This script sets up the development environment

Write-Host "RestMon Quick Start Setup" -ForegroundColor Cyan
Write-Host "=============================" -ForegroundColor Cyan
Write-Host ""

# Check if Podman is available
Write-Host "Checking Podman..." -ForegroundColor Yellow
try {
    podman ps | Out-Null
    Write-Host "Podman is available" -ForegroundColor Green
}
catch {
    Write-Host "Podman is not available. Please install Podman and try again." -ForegroundColor Red
    exit 1
}

# Start Podman services
Write-Host ""
Write-Host "Starting Podman services (PostgreSQL + Temporal)..." -ForegroundColor Yellow

# Clean up any existing pod
podman pod exists restmon-pod 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "Removing existing pod..." -ForegroundColor Yellow
    podman pod stop restmon-pod 2>$null
    podman pod rm -f restmon-pod 2>$null
}

# Run the Podman startup script
& "$PSScriptRoot\start-podman.ps1"

# Wait for services to be ready
Write-Host ""
Write-Host "Waiting for services to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Check if .env exists, if not copy from example
Write-Host ""
Write-Host "Setting up environment variables..." -ForegroundColor Yellow
if (-not (Test-Path "apps/api/.env")) {
    Copy-Item "apps/api/.env.example" "apps/api/.env"
    Write-Host "Created apps/api/.env" -ForegroundColor Green
}
else {
    Write-Host "apps/api/.env already exists" -ForegroundColor Blue
}

if (-not (Test-Path "apps/worker/.env")) {
    Copy-Item "apps/worker/.env.example" "apps/worker/.env"
    Write-Host "Created apps/worker/.env" -ForegroundColor Green
}
else {
    Write-Host "apps/worker/.env already exists" -ForegroundColor Blue
}

# Run database migrations
Write-Host ""
Write-Host "Running database migrations..." -ForegroundColor Yellow
Start-Sleep -Seconds 5  # Extra wait for Postgres
npm run migrate -w apps/api

Write-Host ""
Write-Host "Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Open 3 separate terminals" -ForegroundColor White
Write-Host "  2. Run these commands in each terminal:" -ForegroundColor White
Write-Host ""
Write-Host "     Terminal 1 (Frontend):" -ForegroundColor Yellow
Write-Host "     npm run dev -w apps/web" -ForegroundColor White
Write-Host ""
Write-Host "     Terminal 2 (Backend API):" -ForegroundColor Yellow
Write-Host "     npm run dev -w apps/api" -ForegroundColor White
Write-Host ""
Write-Host "     Terminal 3 (Worker):" -ForegroundColor Yellow
Write-Host "     npm run dev -w apps/worker" -ForegroundColor White
Write-Host ""
Write-Host "  3. Access the application:" -ForegroundColor White
Write-Host "     - Frontend: http://localhost:5173" -ForegroundColor Cyan
Write-Host "     - Backend API: http://localhost:3000/api" -ForegroundColor Cyan
Write-Host "     - Temporal UI: http://localhost:8080" -ForegroundColor Cyan
Write-Host ""
Write-Host "Tip: Run dev.ps1 to start all dev servers at once!" -ForegroundColor Yellow
Write-Host ""
