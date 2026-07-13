PR Summary - pr/fix/frontend-ci
================================

Summary of changes pushed to branch `pr/fix/frontend-ci`:

- Fixed frontend JSX parse error earlier (now resolved).
- Restored and audited `backend/accounts` serializers and views.
- Added token-refresh synchronization between `frontend/src/axiosClient.js` and `frontend/src/api.js` (dispatches `noorpay:tokens`).
- Added GitHub PR template at `.github/PULL_REQUEST_TEMPLATE.md`.
- Added CI workflow at `.github/workflows/ci.yml` (runs backend tests, starts server, runs an e2e smoke script).

Local verification performed:

- Backend tests: `134` tests ran and passed locally.
- Frontend build: `npm run build` succeeded locally.
- E2E smoke test: `node backend/scripts/e2e_smoke.js` executed successfully against local dev server.

Notes for reviewers:

- The app uses debug OTPs in dev flows; remove debug output before production deployment.
- Ensure `VITE_API_URL` is set for deployed frontend so it points to the production backend.
- CI currently runs the same e2e smoke script; it expects a seeded CI user for login (`ci.tester+2@example.com`).
