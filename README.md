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
- There is a helper script for Windows to start both servers: `start-dev.ps1` from repo root or `frontend/start-dev.ps1` from inside `frontend`.
- CI workflow exists at `.github/workflows/ci.yml` and runs backend tests and an e2e smoke script.
### Postman integration

- Open `Postman/NoorPay.postman_collection.json` in Postman.
- Set environment variable `base_url` to `http://localhost:8000/api`.
- Use `Auth - Login` to obtain `access_token`, then set it for protected calls.
- Example endpoints: `/auth/profile/`, `/reports/ai/chat/`, `/wallet/`, `/transactions/`.
## Production deployment guidance

### Required production environment variables

Backend
- `SECRET_KEY`: Django secret key
- `DEBUG=0`
- `DJANGO_ALLOWED_HOSTS`: production host(s)
- `DATABASE_URL`: Postgres connection URL, e.g. `postgres://user:pass@host:5432/dbname`
- `CORS_ALLOWED_ORIGINS`: comma-separated frontend URL(s), e.g. `https://app.example.com`
- `CSRF_TRUSTED_ORIGINS`: comma-separated trusted origin(s)
- `VITE_API_URL`: frontend build-time API base URL, e.g. `https://api.example.com/api`

Frontend
- `VITE_API_URL`: points to deployed backend API endpoint, e.g. `https://api.example.com/api`

### Deployment targets

- Local Docker Compose
- Render Docker services for frontend and backend
- Vercel static frontend hosting
- Kubernetes manifests in `k8s/`

### Local Docker Compose

```powershell
cd C:\Users\HP\OneDrive\Desktop\Projects\NoorPay-Shariah-Fintech
docker compose up --build
```

Backend: `http://localhost:8000`
Frontend: `http://localhost:5173`

### Production checkboxes

- [ ] Use Postgres instead of SQLite
- [ ] Set `VITE_API_URL` for production builds
- [ ] Keep `DEBUG=0` in production
- [ ] Store `SECRET_KEY` in secure secret storage
- [ ] Configure CORS and CSRF for production domains
- [ ] Remove any debug-only endpoints or payloads from production

