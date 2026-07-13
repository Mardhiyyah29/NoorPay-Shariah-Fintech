<!-- Pull Request Template -->

### Summary

Describe the change and the problem this PR fixes.

### What I changed

- Fixed frontend JSX parse error
- Restored backend `accounts` serializers and tests
- Added CI smoke test workflow
- Synced token refresh handling between `axiosClient.js` and `api.js`

### Checklist

- [ ] Backend tests pass locally (`python manage.py test`) — verified
- [ ] Frontend build passes (`npm run build`) — verify locally
- [ ] No debug secrets or OTPs left in production code
- [ ] Add environment variables for `VITE_API_URL` in deployment
- [ ] Security review for JWT handling and token rotation

### Notes for reviewers

Include any deployment steps, environment variables, or follow-ups the reviewer should know about.
