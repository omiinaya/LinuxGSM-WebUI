# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
- Standard repo infrastructure: CHANGELOG, CONTRIBUTING, SECURITY, Makefile, .github templates
- Playwright end-to-end test suite covering every page, workflow, button, and modal:
  - Auth: login, logout, redirects, invalid-credentials, role guards
  - Profile: password change, 2FA enable → login round-trip → disable
  - Dashboard: stats, server cards, Add Server modal (Discover/Manual), view toggles
  - Server detail: Overview, Console, Players, Config, Backups, Logs, update/port modals
  - Navigation: sidebar, header, theme toggle, command palette (Ctrl+K)
  - Catalogue: game cards, install flow
  - Install wizard: full 5-step walkthrough
  - Alerts: Discord + email config, event toggles
  - Admin: user management, sessions, audit log
  - Monitor Setup + Parameters pages
- npm scripts: `test:e2e`, `test:e2e:headed`
- CI: real `e2e` job (Playwright) + removed `|| true` dead-gates from `quality` job

### Fixed
- Admin "Create User" button opened nothing — the dialog modal was never rendered. Added the full create-user dialog (username, password, email, role).
- Enabling 2FA locked users out: the login flow returned `requires2FA` but the login page never rendered a code step. Added a 2FA verification step to the login page.
- 2FA verify could never succeed: `pending2FATokens` was redeclared in both `login/route.ts` and `verify/route.ts` (separate Next.js module instances), so the token created at login was never visible to the verify route. Moved the store to a shared `src/lib/pending-2fa.ts`.
- Duplicate "New Password" / "Confirm New Password" fields in the profile password-change form (the same three fields were rendered twice).