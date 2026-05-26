# FITx Architecture

FITx is a client-side React/Vite app for inspecting, repairing, validating, and exporting Garmin FIT files. Activity files are parsed in the browser and should not be sent to a backend.

## Product Boundaries

- Local `.fit` upload, parsing, editing, validation, and corrected download are core.
- Unknown FIT messages and fields should be preserved unless a later approved feature explicitly changes that behavior.
- Current active UI direction is map-first GPS repair with header-level upload, download, and issue handling.
- FIT definition records are internal repair/export machinery, not primary user-facing repair rows.
- The app is for technical repair workflows, not a full FIT debugger or analysis dashboard.

## Runtime Stack

- Vite + React + TypeScript.
- Styling uses vanilla-extract plus global CSS.
- Dialog/dropdown accessibility uses Radix primitives.
- Large lists use TanStack Virtual where mounted.
- Map rendering uses MapLibre.
- Tests use Vitest for unit coverage and Playwright for e2e coverage.

## Current Layers

- `src/app/`: React composition root and app shell.
- `src/components/`: UI components, including map/GPS repair, dialogs, status, message editing, and top bar.
- `src/editor/`: application/editor model, edit overlay, validation, view models, GPS repair/session logic, routing helpers, and React session hook.
- `src/fit/`: FIT parser, writer, CRC, base types, validation, profile lookup, and domain types.
- `src/generated/`: generated FIT profile metadata.
- `src/styles/`: vanilla-extract and global styling.
- `tests/e2e/`: Playwright user-flow coverage.

## Dependency Direction

Target direction:

```text
app composition -> concrete adapters
components -> editor/application services -> fit/gps domain
domain -> value types and interfaces only
adapters -> browser, network, map, file/download APIs
```

Current known drift:

- `src/editor/useFitEditorSession.ts` still carries app state, browser file/download operations, validation, routing, GPS repair coordination, and command handling in one hook.
- `src/components/GpsRepairPanel.tsx` mixes product UI, MapLibre adapter work, map events, popup construction, gap rows, and summary display.
- Routing is not fully injected; GraphHopper/Vite/browser concerns remain close to editor commands.
- Summary/date formatting is spread across editor view-model code and UI helpers.

## Approved Refactor Direction

Preserve behavior while moving toward:

- explicit browser/routing/download/confirm/id/time ports;
- pure editor command/use-case functions returning typed results;
- a MapLibre adapter component behind typed route/map props;
- centralized screen model selectors;
- a narrower public `src/editor/index.ts` API;
- parser/export/validation code that can later run off the UI thread.

Architecture changes beyond this direction need human approval and, when durable, an ADR in `docs/adr/`.
