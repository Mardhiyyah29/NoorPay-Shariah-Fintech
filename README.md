# NoorPay - Development README

Quick steps to run the project locally (Windows dev shells):

1) Backend (Python virtualenv)

```powershell
cd backend
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 127.0.0.1:8000
```

2) Frontend (Vite)

```powershell
cd frontend
npm install
npm run dev
```

Notes
- During development the frontend proxies `/api` to `http://127.0.0.1:8000` (see `vite.config.js`).
- For production set `VITE_API_URL` in the frontend environment to point to the deployed backend (include `/api` suffix).
- There's a helper script for Windows to start both servers: `scripts/start-dev.ps1`.
- CI workflow exists at `.github/workflows/ci.yml` and runs backend tests and an e2e smoke script.
