# E2E Screenshot Artifacts Plan

## Status

Done

## Goal

Make regular Playwright e2e tests produce reviewable screenshots for the UI states covered by each scenario.

## Non-Goals

- Do not create a separate visual-only test suite.
- Do not add pixel-perfect screenshot assertions yet.
- Do not commit private activity files as fixtures.

## Requirements

- Keep screenshots attached to ordinary e2e scenarios.
- Keep behavior assertions as the pass/fail signal.
- Save screenshots through Playwright `test-results` artifacts.
- Let private activity files inform reduced committed scenarios later.

## Acceptance Criteria

- Existing active GPS/map e2e coverage attaches screenshots for key UI states, including Add GPS unavailable, Add GPS enabled, and Add GPS applied states.
- Standard `npm run test:e2e` produces those artifacts.
- Fast unit verification, build, and e2e all pass for the current active suite.

## Chosen Approach

Add a shared `attachScreenshot` helper for Playwright specs and call it from the existing GPS repair scenario at meaningful states.

## Approval Needs

- Architecture change: No
- Production dependency: No
- Schema/migration/auth/billing/security/deployment/external integration: No
- Human approval required before implementation: No

## Implementation Steps

1. **Attach screenshots from active e2e scenarios**
   - Scope: Add a reusable screenshot helper and attach artifacts from the active GPS repair scenario.
   - Files: `tests/e2e/helpers.ts`, `tests/e2e/gps-repair.spec.ts`
   - Status: Done
   - Verification: `npm run test:e2e -- tests/e2e/gps-repair.spec.ts` passed; `scripts/verify-fast.sh` passed; `npm run build` passed; `npm run test:e2e` passed for the current active suite.
2. **Add reduced bounded-gap Add GPS scenario**
   - Scope: Generate a bounded missing-GPS FIT input from committed `tests/fixtures/Activity.fit` inside the e2e spec, then capture the enabled and applied Add GPS map states.
   - Files: `tests/e2e/gps-repair.spec.ts`, `src/components/GpsRepairPanel.tsx`, `src/styles/gpsRepairPanel.css.ts`
   - Status: Done
   - Verification: `npm run test:e2e -- tests/e2e/gps-repair.spec.ts` passed; `scripts/verify-fast.sh` passed; `npm run build` passed; `npm run test:e2e` passed.

## Verification Log

- `npm run test:e2e -- tests/e2e/gps-repair.spec.ts`: pass - attached `gps-map-loaded`, `gps-erase-mode`, `gps-add-unavailable`, `fit-message-groups`, `gps-bounded-gap-loaded`, `gps-add-enabled`, and `gps-add-applied`.
- `scripts/verify-fast.sh`: pass - 13 files, 118 tests passed.
- `npm run build`: pass - TypeScript and Vite build passed; known large chunk warning remains.
- `npm run test:e2e`: pass - 2 active tests passed, 12 legacy message tests skipped.

## Risks

- The bounded-gap scenario is generated from committed `Activity.fit`; it should stay small and focused rather than becoming a broad fixture factory.
- Golden screenshot assertions should wait until map rendering is stable or masked.

## Rollback Notes

- Remove `attachScreenshot` calls to stop generating artifacts; behavior assertions remain independent.
