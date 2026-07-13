# Start both backend Django dev server and frontend Vite server
param()

Write-Host "Starting backend..."
Set-Location "./backend"
.\venv\Scripts\Activate.ps1
Start-Process -NoNewWindow -FilePath pwsh -ArgumentList "-NoExit", "-Command", "python manage.py runserver 127.0.0.1:8000"
Start-Sleep -Seconds 2
Write-Host "Starting frontend..."
Set-Location "..\frontend"
Start-Process -NoNewWindow -FilePath pwsh -ArgumentList "-NoExit", "-Command", "npm run dev"
Write-Host "Dev servers started. Backend: http://127.0.0.1:8000, Frontend: http://localhost:5173"