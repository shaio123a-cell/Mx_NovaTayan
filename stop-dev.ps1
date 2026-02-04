# Stop all RestMon development servers and infrastructure

Write-Host "Stopping all RestMon processes..." -ForegroundColor Yellow

# Kill node processes associated with the project
Write-Host "Cleaning up Node.js processes..." -ForegroundColor Cyan
$nodeProcesses = Get-CimInstance Win32_Process -Filter "name = 'node.exe'" | Where-Object { 
    $_.CommandLine -like "*Mx_NovaTayan*" -or 
    $_.CommandLine -like "*nest*" -or 
    $_.CommandLine -like "*vite*" -or 
    $_.CommandLine -like "*ts-node*" -or
    $_.CommandLine -like "*prisma*"
}

if ($nodeProcesses) {
    Write-Host "Terminating $($nodeProcesses.Count) Node.js processes..." -ForegroundColor Yellow
    foreach ($p in $nodeProcesses) {
        Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue
    }
}

# Kill PowerShell windows started by dev.ps1
Write-Host "Cleaning up PowerShell development windows..." -ForegroundColor Cyan
$pwshProcesses = Get-CimInstance Win32_Process -Filter "name = 'powershell.exe' or name = 'pwsh.exe'" | Where-Object {
    $_.CommandLine -like "*npm run dev -w*" -and $_.CommandLine -like "*Mx_NovaTayan*"
}

if ($pwshProcesses) {
    Write-Host "Terminating $($pwshProcesses.Count) PowerShell windows..." -ForegroundColor Yellow
    foreach ($p in $pwshProcesses) {
        Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue
    }
}

### Stop Podman pod
#Write-Host "Stopping Podman containers..." -ForegroundColor Cyan
#if (Test-Path "$PSScriptRoot\stop-podman.ps1") {
#    & "$PSScriptRoot\stop-podman.ps1"
#}

Write-Host "Cleanup complete!" -ForegroundColor Green
