# RestMon Development Server Launcher
# Starts all three dev servers in separate windows

Write-Host " Starting RestMon Development Servers..." -ForegroundColor Cyan
Write-Host ""

# Start frontend in new window
Write-Host "Starting Frontend (apps/web)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host ' Frontend Server' -ForegroundColor Cyan; npm run dev -w apps/web"

# Wait a bit between launches
Start-Sleep -Seconds 2

# Start backend in new window
Write-Host "Starting Backend API (apps/api)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host 'Backend API' -ForegroundColor Cyan; npm run dev -w apps/api"

# Wait a bit between launches
Start-Sleep -Seconds 2

# Start worker in new window
Write-Host "Starting Worker (apps/worker)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host 'Temporal Worker' -ForegroundColor Cyan; npm run dev -w apps/worker"

Write-Host ""
Write-Host "All servers starting in separate windows!" -ForegroundColor Green
Write-Host ""
Write-Host "Access points:" -ForegroundColor Cyan
Write-Host "  - Frontend:    http://localhost:5173" -ForegroundColor White
Write-Host "  - Backend API: http://localhost:3000/api" -ForegroundColor White
Write-Host ""
Write-Host "To stop all servers, close each PowerShell window." -ForegroundColor Yellow
Write-Host ""
