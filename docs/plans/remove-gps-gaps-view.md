# Remove GPS Gaps View Plan

## Status

Done

## Goal

Remove the visible GPS gaps list from the map workspace for now because it does not fit the current design direction.

## Non-Goals

- Do not remove GPS gap detection, repair state, map gap lines, erase behavior, or route/fill command logic.
- Do not redesign the map toolbar, legend, message details, or underlying GPS repair model.

## Requirements

- Keep the map-first loaded workspace.
- Leave underlying repair/session pieces available for a future redesign pass.
- Remove the visible `GPS gaps` region from the active UI.
- Update regression coverage so the gaps view is expected to be absent.

## Acceptance Criteria

- The loaded GPS workspace no longer renders a `GPS gaps` region or heading.
- Existing map, legend, erase control, and message details still render.
- Fast verification is run when feasible.

## Open Questions

- None blocking.

## Chosen Approach

Remove only the mounted gaps-list UI and direct list-driven controls. Keep the computed gap geometry and repair rows where still needed by map behavior and future repair surfaces.

## Approval Needs

- Architecture change: No
- Production dependency: No
- Schema/migration/auth/billing/security/deployment/external integration: No
- Human approval required before implementation: No

## Implementation Steps

1. **Remove visible gaps view**
   - Scope: Unmount the GPS gaps section and update e2e expectations.
   - Files: `src/components/GpsRepairPanel.tsx`, `src/styles/gpsRepairPanel.css.ts`, `tests/e2e/gps-repair.spec.ts`, `docs/plans/fitx-v1-current.md`
   - Status: Done
   - Verification: `scripts/verify-fast.sh` passed; `npm run build` passed; `npm run test:e2e` failed on the existing missing `Activity summary` region expectation before reaching the GPS gaps absence assertion.

## Verification Log

- `scripts/verify-fast.sh`: pass - 13 files, 118 tests passed.
- `npm run build`: pass - TypeScript and Vite build passed; Vite reported the existing large chunk warning.
- `npm run test:e2e`: fail - `tests/e2e/gps-repair.spec.ts` could not find `region[name="Activity summary"]`; the Playwright snapshot showed the map workspace and no `GPS gaps` region.

## Risks

- Fill/auto-route actions become unavailable until a redesigned entry point is added.

## Rollback Notes

- Restore the gaps section render and related e2e assertions if this surface is needed again before the redesign.
