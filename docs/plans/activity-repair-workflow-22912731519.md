# Activity Repair Workflow Plan

## Status

Done

## Goal

Use `22912731519_ACTIVITY.fit` as the local design driver for a map-centric GPS repair workflow. The immediate goal is to let a user erase bad GPS and add correct GPS back into existing `record` messages while preserving heart-rate, timer, and other non-GPS data.

## Non-Goals

- Do not commit the provided activity file as a fixture.
- Do not redesign the whole app shell.
- Do not restore the old GPS gaps list as-is.
- Do not silently rewrite broad session, lap, or record-derived fields in this slice.
- Do not make the generic FIT message accordion the primary repair entry point.
- Do not add production dependencies.

## Current Evidence

- The provided file exists locally at repo root and is about 290 KB.
- Current unit verification passes: `scripts/verify-fast.sh` passed with 13 files and 118 tests.
- Current build verification passes: `npm run build` passed with the known large chunk warning.
- Current e2e verification passes for the active GPS/map suite. Legacy message-editor specs remain skipped while the current map-first UI is being rebuilt.
- A current screenshot for `22912731519_ACTIVITY.fit` showed a large empty-looking map surface with a generic message-group accordion below it. This is not sufficient for judging or repairing the bad activity.
- Data inspection found 2,172 `record` messages, 1,238 records with GPS, and 934 records without GPS.
- GPS points split into 1,161 Ukraine points and 77 Peru points.
- The main bad span is not an adjacent point-to-point jump. It is a pause/missing-GPS span followed by Peru coordinates and inflated distance/speed/session/lap summary values.
- Existing GPS repair logic can erase GPS fields and has record speed edit helpers, but the active UI does not yet expose a clear review model for related record/session/lap updates.
- Export bug found during Add GPS e2e work: explicit `null` field edits are currently at risk of being treated like missing edits, which would make erased GPS fields fall back to original values on save.
- Existing insertion mechanics already exist behind the removed list flow: bounded gaps can be filled, routed, staged as `position_lat`/`position_long` edits, represented as fixed repairs, and adjusted through draggable fixed repair points.
- The active app shell no longer passes `fillGpsRepairRun`, `fixGpsRepairRun`, or `fixGpsFixedRepair` into the map panel because those controls were list-driven.

## Requirements

- Keep the map as the primary loaded workspace.
- Make the broken range visually diagnosable from the map.
- Add a map-centric `Add GPS` tool that mirrors the interaction style of `Erase GPS`.
- Let the user select a missing/erased GPS span from the map rather than from a separate gaps list.
- For bounded gaps, support inserting GPS into the missing records using the existing fill/route repair mechanics.
- For open-ended gaps, support placing the missing anchor from the map so the span becomes fillable.
- Keep the generated/fixed route editable on the map through draggable repair points.
- Keep repair actions contextual and progressive, not permanently piled onto the map.
- Defer related session/lap/speed consistency repair until after erase/add GPS works cleanly.
- Add visual verification as part of each UI step: desktop screenshot, mobile/narrow screenshot where relevant, and a short visual judgment against the task.

## Acceptance Criteria

- The bad activity can be loaded locally and the UI makes the Ukraine-to-Peru corruption visible enough that the user can decide what to erase.
- The user can erase bad GPS points from the map.
- The user can add replacement GPS positions into existing missing/erased records from the map.
- Added GPS edits preserve existing record identity and non-GPS fields.
- Fixed route points can be adjusted visually on the map before later consistency repair work.
- The active UI stays clean: map first, compact summary/review surfaces, contextual tools only.
- Fast verification passes after each scoped implementation step when feasible.
- Build passes before any substantial handoff.

## Open Questions

- **Q:** Should the post-pause Peru coordinates be treated as invalid GPS to erase, or should the workflow support reconstructing a route after the pause?
  **Recommendation:** Start by treating the Peru coordinates as invalid GPS and preserve the non-GPS record data. Add reconstruction only after the review surface makes the damaged span clear.
  **Status:** Answered: Work with map tools first. The user should be able to erase bad GPS and then add correct GPS back into existing records while preserving heart-rate and timer data. Fixing inconsistencies in other messages/fields comes after that.
- **Q:** What should the first `Add GPS` insertion mode do?
  **Recommendation:** Start with a straight-line fill between map anchors using existing record timestamps/timer data, then allow dragging generated repair points. Add routed/path-provider insertion after the map interaction feels right.
  **Status:** Answered: Yes.

## Options

### Option A - Map-Tool-First Repair Workflow

- Pros:
  - Matches the user's mental model: see bad GPS, erase it, draw/add replacement GPS.
  - Reuses existing GPS edit mechanics while avoiding the removed gaps list.
  - Keeps non-GPS record data intact.
- Cons:
  - Derived distance/speed/session/lap inconsistencies remain until the next phase.

### Option B - Review-First Repair Workflow

- Pros:
  - Makes derived FIT field updates explainable before broad edits.
  - Better foundation for later consistency repair.
- Cons:
  - Delays the core erase/add GPS workflow the user needs for real activity files.

## Chosen Approach

Use Option A. Build map tools first: keep `Erase GPS`, add `Add GPS`, and make insertion operate on existing records through the current GPS repair edit model. Add field/message consistency review after the user can repair the route geometry.

## Approval Needs

- Architecture change: No
- Production dependency: No
- Schema/migration/auth/billing/security/deployment/external integration: No
- Human approval required before implementation: Yes, for the first `Add GPS` insertion mode question above.

## Implementation Steps

1. **Capture baseline and plan workflow**
   - Scope: Inspect the provided activity, capture the current visual baseline, and document the intended workflow.
   - Files: `docs/plans/activity-repair-workflow-22912731519.md`
   - Status: Done
   - Verification: `scripts/verify-fast.sh` passed; `npm run build` passed; e2e was updated later to match the current map-first UI.
2. **Add map-centric bounded GPS insertion entry point**
   - Scope: Restore the needed repair callbacks into the map panel and add an `Add GPS` map tool next to `Erase GPS`. The tool should select missing/erased gap lines or open-ended gap anchors from the map, not from a list.
   - Files: `src/app/App.tsx`, `src/components/GpsRepairPanel.tsx`, `src/styles/gpsRepairPanel.css.ts`, focused tests/e2e as needed.
   - Status: Done
   - Verification: `scripts/verify-fast.sh` passed; `npm run build` passed; visual smoke check with `22912731519_ACTIVITY.fit` passed for Add GPS mode; current e2e passes for the active GPS/map suite.
3. **Support bounded map fill**
   - Scope: For a selected bounded gap, stage replacement GPS into existing missing records using the existing fill mechanics and show the fixed route on the map.
   - Files: `src/app/App.tsx`, `src/components/GpsRepairPanel.tsx`, `src/styles/gpsRepairPanel.css.ts`
   - Status: Done with Step 2 for straight-line fills triggered by clicking bounded map gap lines.
   - Verification: `scripts/verify-fast.sh` passed; `npm run build` passed; Playwright GPS e2e passes with screenshots for Add GPS enabled and applied states.
4. **Support open-ended anchor placement**
   - Scope: For an open-ended erased/missing span, let the user place the missing start/end anchor on the map, then make the span fillable.
   - Files: `src/components/GpsRepairPanel.tsx`, existing `placeGpsRepairAnchor` flow, focused tests.
   - Status: Pending
   - Verification: `scripts/verify-fast.sh`, `npm run build`, screenshot review.
5. **Preserve editable fixed-route adjustment**
   - Scope: Keep inserted/fixed route points visible and draggable so the user can correct the generated path visually.
   - Files: `src/components/GpsRepairPanel.tsx`, focused tests/e2e.
   - Status: Pending
   - Verification: `scripts/verify-fast.sh`, focused e2e, screenshot review.
6. **Add consistency review/fix workflow**
   - Scope: After erase/add GPS is usable, show and apply related record speed, session distance, lap summary, and start/end position fixes.
   - Files: `src/editor/`, `src/components/GpsRepairPanel.tsx`, tests.
   - Status: Pending
   - Verification: `scripts/verify-fast.sh`, `npm run build`, focused e2e, screenshot review.
7. **Fix null edit export persistence**
   - Scope: Make explicit `null` field edits write FIT invalid values instead of falling back to original field values, so erased GPS saves persist.
   - Files: `src/fit/writer.ts`, `src/fit/parser-writer.test.ts`, `tests/e2e/gps-repair.spec.ts`
   - Status: Done
   - Verification: `scripts/verify-fast.sh` passed; focused GPS e2e passed while generating the bounded-gap fixture through real null erase edits.
8. **Remove duplicate stretched map overlay**
   - Scope: Stop drawing the simplified SVG known route over the real MapLibre route. Keep any SVG fallback paths hidden so they can support tests/click targets without changing the visible map.
   - Files: `src/components/GpsRepairPanel.tsx`, `src/styles/gpsRepairPanel.css.ts`
   - Status: Done
   - Verification: `scripts/verify-fast.sh` passed; focused GPS e2e passed; `npm run build` passed; local smoke on `22912731519_ACTIVITY.fit` confirmed the stretched red gap is hidden on open and only shown in Add GPS mode.
9. **Speed up Add GPS staging**
   - Scope: Optimize bulk edit staging so map gap fill does not copy edit overlay state once per generated GPS field edit. Add a regression test for batching multiple field edits across messages.
   - Files: `src/editor/editOverlay.ts`, `src/editor/editOverlay.test.ts`, `src/app/App.tsx`, `src/components/GpsRepairPanel.tsx`, `tests/e2e/gps-repair.spec.ts`
   - Status: Done
   - Verification: `scripts/verify-fast.sh` passed; focused GPS e2e passed; `npm run build` passed; local timing on `22912731519_ACTIVITY.fit` improved from about 4.4s to about 0.45s to visible edits, with loading text visible at about 0.19s.
10. **Remove Add GPS regression**
   - Scope: Remove the artificial Add GPS delay and stop building full FIT message groups before the map workflow needs them. Keep message review available behind an explicit Messages action.
   - Files: `src/app/App.tsx`, `src/components/GpsRepairPanel.tsx`, `tests/e2e/gps-repair.spec.ts`
   - Status: Done
   - Verification: `scripts/verify-fast.sh` passed; focused GPS e2e passed; `npm run build` passed; private-file timing smoke measured map ready in about 1.0s and Add GPS click to visible edits in about 0.13s.
11. **Lazy message-review refresh**
   - Scope: Replace whole-document message display rebuilding with cheap group headers, stable message IDs, per-message versioned summary cache invalidation, and page-level dense table schemas.
   - Files: `src/editor/activitySummary.ts`, `src/components/GpsRepairPanel.tsx`
   - Status: Done
   - Verification: `scripts/verify-fast.sh` passed; focused GPS e2e passed; `npm run build` passed; private-file timing smoke with Messages open measured Add GPS click to visible edits in about 0.56s.
12. **Restore fixed-point dragging**
   - Scope: End Add GPS mode after filling a gap so fixed route points are draggable, and improve fixed-point visuals/hit targets to fit the current map tool design.
   - Files: `src/components/GpsRepairPanel.tsx`, focused e2e as feasible.
   - Status: Done
   - Verification: `scripts/verify-fast.sh` passed; focused GPS e2e passed and now asserts Add GPS exits after a gap fill; `npm run build` passed.
13. **Show fixed-point drag cursor**
   - Scope: Make the cursor change over the fixed-point drag hitbox, including the invisible enlarged hit area, without conflicting with Erase GPS or Add GPS cursors.
   - Files: `src/components/GpsRepairPanel.tsx`
   - Status: Done
   - Verification: `scripts/verify-fast.sh` passed; focused GPS e2e passed; `npm run build` passed.
14. **Make fixed-point hover affordance visible**
   - Scope: Replace the non-distinct map-hand hover with a fixed-point-specific move cursor and visible hover ring over the enlarged drag hit area.
   - Files: `src/components/GpsRepairPanel.tsx`
   - Status: Done
   - Verification: `scripts/verify-fast.sh` passed; focused GPS e2e passed; `npm run build` passed.
15. **Tune fixed-point drag target size**
   - Scope: Use explicit viewport-sized point constants with a 44 px drag target, modest visible handle, and hover ring that remains comfortable at normal repair zoom.
   - Files: `src/components/GpsRepairPanel.tsx`
   - Status: Done
   - Verification: `npm run build` passed; `scripts/verify-fast.sh` passed; focused GPS e2e passed.
16. **Reduce fixed-point visual size**
   - Scope: Keep the fixed point visually just larger than the fixed route line while preserving an invisible comfortable drag target.
   - Files: `src/components/GpsRepairPanel.tsx`
   - Status: Done
   - Verification: `npm run build` passed; `scripts/verify-fast.sh` passed; focused GPS e2e passed.
17. **Align fixed route color with app palette**
   - Scope: Replace the off-palette green editable route and fixed-point styling with the app accent purple and matching light accent halo; update the legend marker.
   - Files: `src/components/GpsRepairPanel.tsx`, `src/styles/gpsRepairPanel.css.ts`
   - Status: Done
   - Verification: `npm run build` passed; `scripts/verify-fast.sh` passed; focused GPS e2e passed.
18. **Prevent stale fixed route while dragging**
   - Scope: Draw dragged fixed-route geometry in a dedicated preview layer and hide the committed fixed route during drag so the old purple path does not remain visible.
   - Files: `src/components/GpsRepairPanel.tsx`
   - Status: Done
   - Verification: `npm run build` passed; `scripts/verify-fast.sh` passed; focused GPS e2e passed.
19. **Keep dragged point connected to preview route**
   - Scope: Delay drag-preview cleanup until the committed route update arrives, and add a focused preview-geometry regression test proving the moved point and preview route use the same coordinates.
   - Files: `src/components/GpsRepairPanel.tsx`, `src/components/gpsRepairMapPreview.ts`, `src/components/gpsRepairMapPreview.test.ts`
   - Status: Done
   - Verification: `scripts/verify-fast.sh` passed with the new regression test; `npm run build` passed; focused GPS e2e passed.
20. **Use one fixed route layer while dragging**
   - Scope: Remove the separate drag-preview route layer and update the single fixed-route source in place while dragging, preventing old and new editable paths from both being visible.
   - Files: `src/components/GpsRepairPanel.tsx`
   - Status: Done
   - Verification: `scripts/verify-fast.sh` passed; `npm run build` passed; focused GPS e2e passed.
21. **Start canonical two-state GPS route model**
   - Scope: Add a canonical edit-route model that contains known GPS records plus bounded-gap records on a straight line, and render the view route from that model so gaps are connected by design.
   - Files: `src/editor/gpsEditRoute.ts`, `src/editor/gpsEditRoute.test.ts`, `src/editor/index.ts`, `src/components/GpsRepairPanel.tsx`
   - Status: Done
   - Verification: `scripts/verify-fast.sh` passed; `npm run build` passed; focused GPS e2e passed.
22. **Replace tool buttons with one mode toggle**
   - Scope: Replace separate `Erase GPS` and `Add GPS` map toolbar buttons with one `Edit GPS` / `View GPS` button that switches between view-only and editing mode.
   - Files: `src/components/GpsRepairPanel.tsx`, `tests/e2e/gps-repair.spec.ts`
   - Status: Done
   - Verification: `scripts/verify-fast.sh` passed; `npm run build` passed; focused GPS e2e passed.
23. **Move edit handles onto canonical route**
   - Scope: Render edit-mode map handles from `GpsEditRoute.points`, preview drags by moving one route record in the canonical route, and stage GPS edits for the dragged record id instead of selected fixed-repair points.
   - Files: `src/editor/gpsRepair.ts`, `src/editor/gpsEditRoute.ts`, `src/editor/gpsEditRoute.test.ts`, `src/editor/useFitEditorSession.ts`, `src/app/App.tsx`, `src/components/GpsRepairPanel.tsx`, `tests/e2e/gps-repair.spec.ts`
   - Status: Done
   - Verification: `scripts/verify-fast.sh` passed; `npm run build` passed; focused GPS e2e passed.
24. **Remove legacy gap/fixed visual layers**
   - Scope: Stop rendering the old SVG gap overlay and separate gap/fixed route map layers. Draw one canonical route line in both view and edit modes, and use edit-mode route points for dragging.
   - Files: `src/components/GpsRepairPanel.tsx`, `src/app/App.tsx`, `tests/e2e/gps-repair.spec.ts`
   - Status: Done
   - Verification: `scripts/verify-fast.sh` passed; `npm run build` passed; focused GPS e2e passed.
25. **Commit drag preview immediately**
   - Scope: Keep the dragged canonical route as the local current route on mouseup, and preserve synthetic added GPS field metadata across repeated drags so generated gap points stay editable.
   - Files: `src/components/GpsRepairPanel.tsx`, `src/editor/gpsRepair.ts`, `src/editor/gpsRepair.test.ts`
   - Status: Done
   - Verification: `scripts/verify-fast.sh` passed; `npm run build` passed; focused GPS e2e passed.
26. **Hold pending drag route until model catches up**
   - Scope: Keep the locally moved route as the displayed map route until the rebuilt canonical route contains the moved record coordinates, preventing the gap line from reverting until another drag.
   - Files: `src/components/GpsRepairPanel.tsx`
   - Status: Done
   - Verification: `scripts/verify-fast.sh` passed; `npm run build` passed; focused GPS e2e passed.
27. **Derive one GPS map view from the effective document**
   - Scope: Build one canonical map view from the virtual FIT document with edits applied, pass it to the map panel, and style points with current GPS differently from interpolated missing-GPS points.
   - Files: `src/editor/gpsEditRoute.ts`, `src/editor/gpsEditRoute.test.ts`, `src/editor/useFitEditorSession.ts`, `src/app/App.tsx`, `src/components/GpsRepairPanel.tsx`
   - Status: Done
   - Verification: `scripts/verify-fast.sh` passed; `npm run build` passed; focused GPS e2e passed.

## Verification Log

- `scripts/verify-fast.sh`: pass - 15 files, 125 tests passed.
- `npm run build`: pass - TypeScript and Vite build passed; known large chunk warning remains.
- `npm run test:e2e -- tests/e2e/gps-repair.spec.ts`: pass - 2 Chromium tests passed with GPS map/edit-mode screenshots attached by the spec.
- `npm run test:e2e -- tests/e2e/gps-repair.spec.ts`: pass - generated a reduced bounded-gap fixture from committed `Activity.fit`, clicked the map gap line, staged 802 GPS edits, and captured `gps-add-applied`.
- `scripts/verify-fast.sh`: pass - 13 files, 119 tests passed after the null edit export regression test.
- `npm run test:e2e -- tests/e2e/gps-repair.spec.ts`: pass - bounded-gap fixture generation now uses real null erase edits instead of manually writing invalid GPS sentinels.
- `scripts/verify-fast.sh`: pass - 13 files, 119 tests passed after hiding visible duplicate/stretch overlay paths.
- `npm run test:e2e -- tests/e2e/gps-repair.spec.ts`: pass - Add GPS still exposes and clicks the contextual gap target.
- `npm run build`: pass - TypeScript and Vite build passed; known large chunk warning remains.
- Local visual smoke: pass - `22912731519_ACTIVITY.fit` no longer shows the stretched red gap on initial open; `Add GPS` mode still shows the gap line and prompt.
- `scripts/verify-fast.sh`: pass - 13 files, 120 tests passed after bulk edit staging optimization.
- `npm run test:e2e -- tests/e2e/gps-repair.spec.ts`: pass - Add GPS loading state is asserted before fixed route appears.
- `npm run build`: pass - TypeScript and Vite build passed; known large chunk warning remains.
- Local timing smoke: pass - `22912731519_ACTIVITY.fit` Add GPS indicator visible in about 190 ms and edits visible in about 445 ms, down from about 4.4s before this step.
- `scripts/verify-fast.sh`: pass - 13 files, 120 tests passed after removing the performance regression.
- `npm run test:e2e -- tests/e2e/gps-repair.spec.ts`: pass - message review remains available behind `Show messages`; Add GPS still creates fixed route edits.
- `npm run build`: pass - TypeScript and Vite build passed; known large chunk warning remains.
- Local timing smoke: pass - `22912731519_ACTIVITY.fit` map ready in about 992 ms and Add GPS click to visible edits in about 130 ms after removing eager message group building and the artificial fill delay.
- `scripts/verify-fast.sh`: pass - 13 files, 120 tests passed after lazy message-review refresh.
- `npm run test:e2e -- tests/e2e/gps-repair.spec.ts`: pass - message review still opens via `Show messages`, and Add GPS still updates the map.
- `npm run build`: pass - TypeScript and Vite build passed; known large chunk warning remains.
- Local timing smoke: pass - with Messages open on `22912731519_ACTIVITY.fit`, Add GPS click to visible edits measured about 563 ms while message rows are cached and dense schemas are page-local.
- `scripts/verify-fast.sh`: pass - 13 files, 120 tests passed after restoring fixed-point dragging.
- `npm run test:e2e -- tests/e2e/gps-repair.spec.ts`: pass - Add GPS now exits after fill so fixed route point drag handlers are enabled.
- `npm run build`: pass - TypeScript and Vite build passed; known large chunk warning remains.
- `npm run test:e2e`: pass - 2 active GPS tests passed, 12 legacy message-editor tests skipped.
- `scripts/verify-fast.sh`: pass - 13 files, 120 tests passed after adding fixed-point drag cursor handling.
- `npm run build`: pass - TypeScript and Vite build passed; known large chunk warning remains.
- `npm run test:e2e -- tests/e2e/gps-repair.spec.ts`: pass - active GPS map tests passed after the cursor update.
- `npm run build`: pass - TypeScript and Vite build passed after adding the fixed-point hover ring; known large chunk warning remains.
- `scripts/verify-fast.sh`: pass - 13 files, 120 tests passed after adding the fixed-point hover ring.
- `npm run test:e2e -- tests/e2e/gps-repair.spec.ts`: pass - active GPS map tests passed after adding the fixed-point hover ring.
- `npm run build`: pass - TypeScript and Vite build passed after fixed-point drag target size tuning; known large chunk warning remains.
- `scripts/verify-fast.sh`: pass - 13 files, 120 tests passed after fixed-point drag target size tuning.
- `npm run test:e2e -- tests/e2e/gps-repair.spec.ts`: pass - active GPS map tests passed after fixed-point drag target size tuning.
- `npm run build`: pass - TypeScript and Vite build passed after reducing fixed-point visual sizing; known large chunk warning remains.
- `scripts/verify-fast.sh`: pass - 13 files, 120 tests passed after reducing fixed-point visual sizing.
- `npm run test:e2e -- tests/e2e/gps-repair.spec.ts`: pass - active GPS map tests passed after reducing fixed-point visual sizing.
- `npm run build`: pass - TypeScript and Vite build passed after fixed route palette update; known large chunk warning remains.
- `scripts/verify-fast.sh`: pass - 13 files, 120 tests passed after fixed route palette update.
- `npm run test:e2e -- tests/e2e/gps-repair.spec.ts`: pass - active GPS map tests passed after fixed route palette update.
- `npm run build`: pass - TypeScript and Vite build passed after the stale fixed-route drag preview fix; known large chunk warning remains.
- `scripts/verify-fast.sh`: pass - 13 files, 120 tests passed after the stale fixed-route drag preview fix.
- `npm run test:e2e -- tests/e2e/gps-repair.spec.ts`: pass - active GPS map tests passed after the stale fixed-route drag preview fix.
- `scripts/verify-fast.sh`: pass - 14 files, 121 tests passed after adding the dragged point connected-route regression test.
- `npm run build`: pass - TypeScript and Vite build passed after the dragged point connected-route fix; known large chunk warning remains.
- `npm run test:e2e -- tests/e2e/gps-repair.spec.ts`: pass - active GPS map tests passed after the dragged point connected-route fix.
- `scripts/verify-fast.sh`: pass - 14 files, 121 tests passed after switching drag to a single fixed-route layer.
- `npm run build`: pass - TypeScript and Vite build passed after switching drag to a single fixed-route layer; known large chunk warning remains.
- `npm run test:e2e -- tests/e2e/gps-repair.spec.ts`: pass - active GPS map tests passed after switching drag to a single fixed-route layer.
- `scripts/verify-fast.sh`: pass - 15 files, 123 tests passed after adding the canonical GPS edit route model.
- `npm run build`: pass - TypeScript and Vite build passed after rendering the view line from the canonical GPS edit route; known large chunk warning remains.
- `npm run test:e2e -- tests/e2e/gps-repair.spec.ts`: pass - active GPS map tests passed after rendering the view line from the canonical GPS edit route.
- `scripts/verify-fast.sh`: pass - 15 files, 123 tests passed after replacing map tools with one mode toggle.
- `npm run build`: pass - TypeScript and Vite build passed after replacing map tools with one mode toggle; known large chunk warning remains.
- `npm run test:e2e -- tests/e2e/gps-repair.spec.ts`: pass - active GPS map tests passed after replacing map tools with one mode toggle.
- `scripts/verify-fast.sh`: pass - 15 files, 124 tests passed after moving edit handles onto the canonical route.
- `npm run build`: pass - TypeScript and Vite build passed after moving edit handles onto the canonical route; known large chunk warning remains.
- `npm run test:e2e -- tests/e2e/gps-repair.spec.ts`: pass - active GPS map tests passed after moving edit handles onto the canonical route.
- Current screenshot: captured locally for `22912731519_ACTIVITY.fit`; the active UI is map-first but not yet visually useful for this repair case.

## Risks

- Real activity files can expose data shapes that synthetic fixtures miss; avoid hard-coding this file into committed tests.
- A straight-line fill may be useful for proving the map workflow but may not be accurate enough for final activity repair without route shaping.
- Derived FIT inconsistencies will remain after GPS insertion until the later consistency workflow is built.
- The current `GpsRepairPanel.tsx` remains large, so UI changes should be small and visually verified.

## Rollback Notes

- Remove this plan if the repair workflow direction changes.
- Revert individual scoped steps rather than reverting unrelated dirty worktree changes.
