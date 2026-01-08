# Start RestMon infrastructure using Podman
# This replaces docker-compose

Write-Host "Starting RestMon infrastructure with Podman..." -ForegroundColor Cyan
Write-Host ""

# Create a pod (similar to docker-compose network)
Write-Host "Creating RestMon pod..." -ForegroundColor Yellow
# We only need 5432 for PostgreSQL now as we moved to RESTful architecture
podman pod create --name restmon-pod -p 5432:5432

# Start PostgreSQL
Write-Host "Starting PostgreSQL..." -ForegroundColor Yellow
podman run -d `
    --pod restmon-pod `
    --name restmon-postgres `
    -e POSTGRES_USER=restmon `
    -e POSTGRES_PASSWORD=restmon `
    -e POSTGRES_DB=restmon `
    postgres:15-alpine

# Wait for PostgreSQL to be ready
Write-Host "Waiting for PostgreSQL to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

Write-Host ""
Write-Host "Infrastructure started successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Services:" -ForegroundColor Cyan
Write-Host "  - PostgreSQL: localhost:5432" -ForegroundColor White
Write-Host ""
Write-Host "Note: Temporal has been removed in favor of a RESTful architecture." -ForegroundColor Gray
Write-Host ""
Write-Host "To stop: podman pod stop restmon-pod" -ForegroundColor Yellow
Write-Host "To remove: podman pod rm restmon-pod" -ForegroundColor Yellow
Write-Host ""
