# Stop and remove RestMon Podman infrastructure

Write-Host "Stopping RestMon infrastructure..." -ForegroundColor Yellow

podman pod stop restmon-pod
podman pod rm restmon-pod

Write-Host "Infrastructure stopped and removed!" -ForegroundColor Green
