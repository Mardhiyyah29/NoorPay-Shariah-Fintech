# Starts the Django backend and Vite frontend together from the repo root.
# Usage: .\start-dev.ps1

$ErrorActionPreference = 'Stop'
Write-Host "Starting backend on http://127.0.0.1:8000 and frontend on http://127.0.0.1:5173/"

$backend = Start-Process -NoNewWindow -FilePath "python" -ArgumentList "backend\manage.py", "runserver", "8000" -PassThru
$frontend = Start-Process -NoNewWindow -FilePath "npm" -ArgumentList "run", "dev", "--prefix", "frontend" -PassThru

Write-Host "Backend PID: $($backend.Id)"
Write-Host "Frontend PID: $($frontend.Id)"
Write-Host "Press Ctrl+C to stop both processes."

try {
    Wait-Process -Id $backend.Id, $frontend.Id
} finally {
    if (-not $backend.HasExited) {
        Write-Host "Stopping backend..."
        $backend.Kill()
    }
    if (-not $frontend.HasExited) {
        Write-Host "Stopping frontend..."
        $frontend.Kill()
    }
}
