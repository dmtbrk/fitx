# Repository Map

## Important Paths

- `src/app/App.tsx`: top-level React shell and composition.
- `src/editor/`: editor state, edit overlay, GPS repair, validation, routing, and view-model logic.
- `src/fit/`: FIT parsing, writing, checksum, profile metadata access, and FIT validation.
- `src/components/`: product UI components.
- `src/styles/`: vanilla-extract styling and global CSS.
- `src/generated/`: generated FIT profile artifacts.
- `src/fixtures/`: unit-test FIT/profile fixtures.
- `tests/e2e/`: Playwright specs and browser fixtures.
- `scripts/`: generated-profile scripts plus verification helpers.
- `docs/plans/`: durable plans and step status.

## Commands

- Install: `npm ci`
- Dev server: `npm run dev`
- Unit tests: `npm test`
- Build/typecheck: `npm run build`
- E2E tests: `npm run test:e2e`
- Fast verification: `scripts/verify-fast.sh`
- Full verification: `scripts/verify-full.sh`
- Changed files: `scripts/changed-files.sh`
- Diff review helper: `scripts/review-diff.sh`

## Test Layout

- Unit tests live beside implementation files as `*.test.ts` or `*.test.js`.
- E2E tests live under `tests/e2e/` and start Vite through `playwright.config.ts`.
- FIT binary fixtures are committed under `tests/fixtures/`; avoid reading or creating private user activity files unless the human explicitly provides them for the task.

## Common Feature Areas

- FIT parser/writer behavior: `src/fit/`
- Edit tracking and export overlay: `src/editor/editOverlay.ts`, `src/editor/editSession.ts`
- Validation and issues: `src/editor/validation.ts`, `src/fit/validation.ts`
- GPS repair and routing: `src/editor/gpsRepair.ts`, `src/editor/gpsRepairSession.ts`, `src/editor/routing.ts`
- Map workspace UI: `src/components/GpsRepairPanel.tsx`
- Header/download/issues flow: `src/components/TopBar.tsx`, `src/components/IssuesDialog.tsx`, `src/editor/useFitEditorSession.ts`
- Generated FIT profile data: `scripts/generate-fit-profile*.mjs`, `src/generated/`
