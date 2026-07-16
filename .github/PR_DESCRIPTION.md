NoorPay - PR: pr/fix/frontend-ci

Summary
- Fix frontend JSX parse error
- Restore and audit backend `accounts` serializers and tests
- Add token-refresh sync between frontend axios and in-memory tokens
- Add CI workflow with e2e smoke test
- Add Docker / deployment manifests (Docker Compose, Render, Vercel, Kubernetes)

How to review
- Backend: see `backend/` for auth, serializers and Dockerfile
- Frontend: see `frontend/src/axiosClient.js` and `frontend/src/api.js` for token sync
- CI: see `.github/workflows/ci.yml`
- Deployment manifests: `render.yaml`, `frontend/vercel.json`, `k8s/*`, `docker-compose.yml`

Checklist
- [x] Backend tests run and pass locally (134 tests)
- [x] Frontend build succeeds (`npm run build`)
- [x] E2E smoke script executed locally (`node backend/scripts/e2e_smoke.js`)
- [x] Docker Compose & Dockerfiles added for frontend; backend Dockerfile available at `backend/Dockerfile`
- [ ] Confirm production secrets removed (debug OTPs, dev tokens)
- [ ] Set `VITE_API_URL` in production environment
- [ ] Approve PR and merge
