# Phase Alpha 2.0 Status

Last updated: 2026-04-18

## Done
- Login registration redirect now verifies tournament code before navigating.
- Friendly error handling: no raw `404: {...}` API dumps in UI.
- Auto-close error modal (2s) added for player/coach registration flows.
- Player and coach pages moved tournament-code verification to left-side panel (30%).
- Tournament-specific registration instructions + form links are rendered in registration side panels.
- Public tournament page added (`/public-tournaments`) with:
  - player-only category view by tournament + user ID
  - coach all-category view with age/weight filters
- Verify page is now tournament-scoped (selector + backend enforced access control).
- Admin tournament page now supports instructions/form links and active-status dot indicators.
- Weight category filters tightened to association-first and male/female-only filtering.
- Session handling improved:
  - redirect to login on expired/invalid session
  - silent refresh resumes after reload
  - session/inactivity aligned to 1 hour
- Public forgot-password page added (`/forgot-password`) using new reset request/complete APIs.

## Test Accounts
### Single-role
- admin@tkd.local / TkdAdmin@2026 (admin)
- organizer@tkd.local / Test@1234 (organizer)
- jury1@tkd.local / Test@1234 (jury)
- jury2@tkd.local / Test@1234 (jury)
- jury3@tkd.local / Test@1234 (jury)
- coach1@tkd.local / Test@1234 (coach)
- coach2@tkd.local / Test@1234 (coach)

### Multi-role
- verify@tkd.local / Test@1234 (verification_officer + jury)

## Remaining (Next Iteration)
- Full unification of User Management + Staff Assignment + Jury management into one consolidated page.
- Add visual bracket rendering component in public page (current: player list + bracket JSON payload view).
- Add dedicated frontend/backend test coverage for the new public tournament bracket workflow.
