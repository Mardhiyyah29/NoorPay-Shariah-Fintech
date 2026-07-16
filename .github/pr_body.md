Summary
- Adds a small smoke test (root redirect) to the test suite.
- Adds CI workflow (.github/workflows/ci.yml) to run migrations, unit tests and a small E2E smoke script.
- Adds a lightweight E2E script at `backend/scripts/e2e_smoke.js`.
- Minor test and CI-related adjustments in `backend/reports/tests.py`.

Files changed (high level)
- `backend/reports/tests.py` — appended smoke test.
- `backend/scripts/e2e_smoke.js` — lightweight Node.js smoke script.
- `.github/workflows/ci.yml` — CI that runs migrations, tests and smoke script.
- Small frontend/backend changes and docs to support CI.

Why
- Provides automated verification (unit + smoke) on pushes/PRs to catch regressions early.
- Adds a quick, non-flaky e2e smoke step to validate the app boots and the root redirect works.

Testing done locally
- Ran `python backend/manage.py test reports` — 11 tests passed.
- Note: `docker` CLI not available on this machine so I could not run `docker compose up --build` here.

Suggested reviewers / checks
- Reviewers: backend maintainers, CI owner
- Verify in PR checks: migrations step, unit tests, e2e smoke runs successfully in GitHub Actions.
