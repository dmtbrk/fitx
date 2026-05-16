# FITx V1 Implementation Plan

## Status

Implementation in progress. Phase 1 risk-first FIT core slice is complete; the current focus is production architecture hardening before adding more structural editing and insight tooling.

Current UI direction:

- Persist the two-row message toolbar: collection actions on row 1, always-visible filters on row 2.
- Use a narrow selection-mode probe for visible filtered messages with bulk delete, while keeping filters locked during selection.
- Keep add-message and selection modes mutually exclusive so the toolbar stays simple and predictable.

Completed in Phase 1:

- Added FIT core module boundaries for profile lookup, edit scaffolding, validation scaffolding, CRC, parser, document types, and writer.
- Implemented a custom parser that preserves record order, definition records, data records, unknown messages/fields, developer field definitions/values, byte spans, and checksum state.
- Implemented a custom writer that round-trips unchanged files, serializes data by definition order, applies normal/developer field edits, supports scalar and array raw values, and recalculates header/file CRCs.
- Added hardening for malformed records that exceed declared data size, invalid original checksums, invalid float sentinels, and numeric edit range/integer checks.
- Added tests for profile lookup, edit counts, validation, parser/writer round trips, scalar/developer/array edits, invalid checksums, malformed data bounds, invalid float preservation, and coercion rejection.
- Verified with `npm test` and `npm run build`.

Completed UI/core integration slice:

- Added the agreed UI stack dependencies: `vanilla-extract`, Radix Dialog/Dropdown Menu, and TanStack Virtual.
- Wired Vite for `vanilla-extract`.
- Replaced the old inspection UI with a prototype-aligned single-page shell using the custom FIT parser/document model.
- Implemented upload, drag-over, loading, loaded, and error states.
- Implemented the flush header with filename/message count, issue count, Download, and Upload behavior.
- Implemented loaded-state filter row and a virtualized ordered message-card stream.
- Kept FIT definition records hidden from the repair view while preserving them in the internal document/writer.
- Added an accessible Radix Issues dialog and warning-before-download flow for file-level checksum issues.
- Added initial download/export using the custom writer with recalculated CRCs.
- Added a FIT view-model adapter for quick-view messages, field display values, timestamp labels, filter counts, and filtering.
- Verified with `npm test`, `npm run build`, and a running Vite dev server.
- Added a Playwright regression test using `tests/fixtures/Activity.fit` for virtualized record-filter card layout.

Completed focused message editor slice:

- Added message edit-session utilities for raw field drafts, applied-edit seeding, changed-field counting, validation issues, and writer edit generation.
- Added a Radix-based focused message editor panel rendered outside the virtualized list.
- Wired message edit buttons to open the editor panel with Apply/Cancel behavior.
- Applied edits update header edit count, Edited filter count, and Download export.
- Reopening edited messages preserves applied raw values; reverting fields to original removes those field edits.
- Applied invalid field values appear as message-level issues and block export until fixed.
- Added Playwright coverage for editor cancel/apply/reopen/reapply/revert/invalid-download behavior.

Completed raw add-field slice:

- Added raw normal field creation inside the focused message editor panel.
- Raw added fields support field number, label, base type, size, units, and raw scalar/array values.
- Added-field drafts validate required numeric input, duplicate field numbers, FIT base type, size, string length, and value count before entering the staged message draft.
- Applied raw added fields persist when reopening the editor and are included in edit counts/issues.
- Writer exports added normal fields by appending them to a temporary extended definition for the edited data record, then restoring the original definition so later records keep their original structure.
- Writer rejects impossible added-field exports such as overlong strings and definitions that would exceed FIT's 255 normal-field limit.
- Added unit coverage for raw add-field draft behavior and export/reparse with valid CRCs.

Completed structural message action slice:

- Added confirmed message deletion from the message context menu.
- Delete removes messages from the visible list and export while preserving unrelated definitions, unknown data, developer data, and recalculated CRCs.
- Added staged message duplication from the message context menu.
- Duplicate opens the focused editor with a copied message, Cancel commits nothing, and Apply inserts the duplicate immediately after the source message.
- Inserted duplicates count as one edit, can be reopened for editing, are included in filtering/counts, and export as valid FIT records.
- Duplicate editing supports copied existing fields; adding brand-new raw fields to inserted duplicates is intentionally disabled until duplicate-specific added-field export is supported.
- Added unit and Playwright coverage for delete, duplicate, focus restoration, export parsing, and duplicate/source delete interactions.

Completed raw add-message slice:

- Added loaded-state Add message / Cancel add message controls and full-list insert mode.
- Insert mode renders touch-sized insertion targets before, between, and after visible messages, including staged inserted messages.
- Selecting an insertion target opens a focused raw add-message panel; Cancel commits nothing.
- Raw inserted messages support global message number, optional UI label, and one or more normal raw fields with field number, label, FIT base type, byte size, units, and raw scalar/array values.
- Insert positions shown around staged messages are normalized back to original-document anchors before export so the writer keeps strict FIT-document boundaries.
- Overlay insertion order preserves the exact visible target when adding before or between already staged messages in the same original-document gap.
- Export emits a temporary definition record before each inserted raw data record, then restores the prior definition for reused local message types.
- Added unit and Playwright coverage for insert labels, validation blocking, cancel/apply behavior, repeated insertion near staged messages, export order, and recalculated CRCs.

Completed validation/export hardening slice:

- Added a non-React editor validation boundary that accepts the loaded FIT document plus canonical edit overlay and returns typed issues with stable codes, severity, and export-blocking classification.
- Moved file, edited-field, inserted-message, and inserted-position issue construction out of the session hook into the validation boundary.
- Download now recomputes validation immediately before gating; any issue opens the Issues dialog first, while export-blocking issues prevent Download anyway.
- Checksum/file issues remain warnings, representable invalid values remain warnings, and writer-impossible edit/insert shapes remain export-blocking.
- Added unit coverage for warning/blocking partitioning, invalid insert anchors, and immediate-download gating.

Completed message toolbar slice:

- Moved `Add message` out of the header into a loaded-state message toolbar below the header.
- Added a compact `Filters` disclosure with inline chips, collapsed-by-default behavior, active summary, and preserved add-mode filter restoration.
- Kept the filter chip order/count semantics unchanged while disabling filter changes during raw insert mode.
- Added focused e2e coverage for header simplification, collapsed default state, active filter summary, add-mode transition, filter persistence, and disclosure focus restoration.

Known Phase 1 limits:

- `scripts/generate-fit-profile.mjs` now has a fixture-driven canonical JSON input path; the committed generated profile artifact is still a small representative sample for tests and early UI work, not the full Garmin profile.
- Known/developer added-field flows, broader definition rewriting for assisted known-profile creation, and full transaction validation remain in later phases.
- Additional FIT fixtures are still needed for big-endian records, compressed timestamp records, full developer metadata flows, 64-bit edits, duplicate/malformed definitions, and large-file performance.
- The message edit icon opens the focused raw field editor. Raw normal add-field, delete, duplicate, and raw add-message are wired through the canonical edit overlay.

Architecture review findings:

- The current app works, but the production shape is still too POC-like: `App.tsx` owns app state, UI composition, issue synthesis, filtering, virtualization, and download/export orchestration.
- The live app now uses the canonical `src/editor/editOverlay.ts` model; the legacy `src/fit/edits.ts` FitEditSet has been retired before add-message, duplicate, delete, undo, and insight tooling are expanded.
- The legacy `src/lib/fitParser.ts` parser path has been retired; the production codebase now has one FIT document model.
- Validation now has one editor preflight boundary for the current document plus edit overlay; future work should decide which validations migrate deeper into `fit` as the writer/profile model matures.
- Whole-document parsing/export/validation and broad view-model derivation currently run on the UI thread; workerization and indexed selectors should be part of the production architecture before large-file and analysis features grow.

## Product Goal

FITx is a minimal single-page web app for inspecting and editing Garmin FIT files. The v1 must support local upload, ordered message inspection, editable fields, validation, and download of a corrected `.fit` file.

The first version is for technical users repairing activity data. It is not a full FIT debugger and should avoid analysis-heavy views.

## Key Decisions

- Use `prototype/App.jsx` as the primary visual and UX reference.
- V1 should be visually as close as practical to the prototype.
- Prefer styling/UI infrastructure that helps account for cross-platform and cross-browser differences, as long as it remains fully stylable and does not impose a visual kit.
- Prefer a small bespoke UI system unless a library clearly helps without forcing a generic dashboard look.
- UI implementation direction: bespoke visual components with targeted headless/accessibility/performance primitives where they materially reduce risk.
- Browser support target: current major engines across desktop and mobile, not legacy browsers.
- V1 focuses on manual editing first, not broader batch/visual GPS tools.
- Users can edit existing fields.
- Users can add fields to existing messages.
- Users can add messages.
- Field editing supports both display-value mode and raw encoded-value mode.
- Adding known FIT profile fields/messages should be supported when metadata exists.
- Raw custom entries should also be supported for technical users.
- Users must be able to add any field or message manually.
- Developer fields are fully editable in v1.
- Users can edit existing developer field values and add developer fields when required metadata can be represented.
- Export cannot be limited to in-place byte patching because added fields/messages require rewriting FIT definition and data records.
- FIT parsing, validation, editing, and export must run locally in the browser.
- Export compatibility target is FIT specification validity first, preservation of original data second, consumer-specific compatibility third.
- Unknown messages, unknown fields, developer fields, and untouched data must be preserved.
- FIT definition messages are hidden from the repair/edit view but remain first-class in the internal document and writer.
- Unknown message types are not issues by themselves.
- The current POC UI/parser will be replaced where needed, not incrementally adapted if it conflicts with this plan.
- Broader batch editing, visual editing, GPS import/alignment, and analysis tools are v2 candidates.

## Visual and UX Constraints

- Bespoke app UI, not a generic dashboard.
- Use semantic HTML and native controls where possible, styling them to match the prototype instead of replacing behavior unnecessarily.
- Use CSS custom properties as design tokens for color, spacing, radius, typography, focus rings, and state colors.
- Use low-specificity component CSS and cascade organization to keep bespoke styles maintainable.
- Prefer interoperable Baseline web-platform features; avoid limited-availability CSS/DOM features unless guarded and tested.
- Validate UI behavior across Chromium, Firefox, Safari/macOS, Safari/iOS, and Chrome/Android.
- Material Design 3 is inspiration only: calm tonal surfaces, rounded panels, subtle outlines, strong spacing, clear typography, light theme first.
- Header is flush with the page background.
- Main content uses one rounded surface/panel.
- Message cards sit inside that panel and appear one after another in file order.
- Do not introduce a sidebar, three-column layout, dashboard stat cards, record detail pane, grouping, charts, timelines, maps, or semantic zone tables in v1.
- Loaded state starts with the message toolbar, then the ordered message list.
- The message toolbar owns collection-level actions such as adding messages and revealing filters; the header keeps file-level state and actions.
- Message cards are quick-view entries. Detailed field editing happens only in a focused message editor panel opened from the message card edit icon-button.
- Message cards show message type and timestamp if present, with no message index, source row, or field count.
- The edit panel is rendered outside the virtualized message list so field editing remains stable while list rows mount and unmount.
- The edit panel may use a progressive card-to-panel animated transition by animating from the source card bounds into the panel, but the non-animated open/close flow is the required behavior.
- Do not place the full field editor inside a virtualized row.
- The card-to-panel animation must be skipped for reduced-motion users, unavailable/offscreen source cards, mobile/browser cases where it causes instability, or any virtualizer state where source row geometry cannot be trusted.
- Empty, drag-over, loading, and error states stay flat and lightweight.

## UI Architecture Direction

FITx is also a testbed for AI-assisted software development workflow. The UI stack should be easy for humans and agents to inspect, modify, verify, and scale without drifting away from the prototype.

Chosen direction:

- Styling: `vanilla-extract` for typed tokens, themes, and reusable component styles.
- Behavior primitives: Radix Primitives by default for dialog, context menu, popover, tooltip, and similar hard interactions.
- Advanced accessibility: React Aria only by exception when a complex collection, table, selection, or cross-device interaction model clearly benefits from it.
- Virtualization: TanStack Virtual behind a local `VirtualMessageList` wrapper.
- shadcn/ui: reference only, not a visual source of truth.
- Avoid full visual component frameworks such as Mantine, Chakra, MUI, Radix Themes, or similar as the app foundation.
- Avoid runtime CSS-in-JS for v1.

Rationale:

- Typed styling contracts reduce one-off visual drift in AI-generated changes.
- Local wrappers around third-party primitives keep the app readable and make future library swaps possible.
- Headless primitives provide accessibility and platform behavior without imposing visual design.
- Full component frameworks solve many browser issues but create visual-system gravity that conflicts with the prototype.
- Domain logic for FIT parsing, editing, validation, and writing must stay independent of UI libraries.

Workflow rules:

- Keep shared visual decisions in tokens and small FITx-owned primitives.
- Do not use third-party primitives directly throughout feature code; wrap them once.
- Do not paste unadapted shadcn or component-library defaults.
- Add interaction tests for upload, menu, dialog, insert mode, editing, filtering, and download flows once implementation starts.

## Production Architecture Direction

The production target is a simple flat module structure. Keep the architecture shaped by product capability, not by speculative feature buckets:

```text
src/
  app/                 bootstrap and top-level composition
  fit/                 pure FIT domain and binary logic
  editor/              cohesive app-specific FIT editor session module
  components/          shared/product React component layer
  styles/              tokens, shared layout primitives, component/app styles
  generated/           generated FIT profile metadata
```

Layering rules:

- `fit` owns FIT documents, records, definitions, fields, profile lookup, edit transactions, validation, parser, writer, CRC, and export-blocking issue classification.
- `fit` must not import React, Radix, DOM APIs, Blob/download APIs, CSS, or browser-specific UI code.
- `app` is bootstrap and top-level composition only.
- `editor` owns the current FIT editor session: uploaded document, active filter, selected message, issue dialog state, canonical edit overlay, derived selectors, commands, and file/download ports. Keep it together rather than splitting it prematurely into separate filter, selection, issues, download, or similar submodules before the architecture needs them.
- `components` is the shared/product React component layer. Wrap reusable UI patterns there once so app/editor code stays readable and consistent.
- `styles` owns tokens, shared layout primitives, and component/app styles.
- Do not introduce placeholder modules like `insights` unless the product has a real capability boundary that needs them.
- Expensive FIT work should move behind a worker-friendly boundary. Parse, export, full validation, and future insight analysis should be callable without React.

Canonical production flow:

```text
upload file
  -> file port reads ArrayBuffer
  -> fit parser creates FitDocument
  -> editor session stores FitDocument + FitEditOverlay
  -> selectors derive issues, counts, filters, quick-card models
  -> editor stages local draft
  -> Apply emits edit transaction into FitEditOverlay
  -> Download runs full validation
  -> fit writer exports corrected bytes
  -> file port creates browser download
```

Near-term architecture priorities:

1. Create a public `src/fit/index.ts` and stabilize the FIT domain API.
2. Keep the canonical `src/editor/editOverlay.ts` transaction model as the single live edit surface for field edits, added fields, added developer fields, added messages, duplicate, and delete.
   Loaded-document messages remain immutable source plus overlay deltas; inserted messages own their canonical current overlay snapshot after creation.
3. Centralize typed validation issues with `scope`, `code`, `severity`, target IDs, and export-blocking classification.
4. Extract editor session state, selectors, and file/download side effects out of `App.tsx` into `editor`, leaving `app` as composition.
5. Keep the editor session cohesive inside `editor` while moving reusable presentational pieces into `components`.
6. Legacy parser path retirement is complete.
7. Add worker-ready boundaries for parse/export/full validation before adding broader capability modules.

## Screen States

1. Empty
2. Drag-over upload
3. Loading/parsing
4. Loaded/editing
5. Error

## Header Behavior

- One-line header.
- Left side: app icon, `FITx`, loaded filename, dot separator, message count.
- Right side: issues count when present, edits count when present, Download button when loaded, Upload button.
- Empty, drag-over, loading, and error states should not show meaningless status text.
- Upload is primary before a file is loaded.
- Download is primary after a file is loaded; Upload becomes secondary.
- Clicking the issue count opens the Issues dialog.
- Clicking Download when issues present opens the same Issues dialog with a Download button additionally.

## Editing Model

- The message list is for quick inspection and selection, not full inline editing.
- A focused message editor panel provides full editing for the selected message.
- The message editor panel is opened from an edit icon-button on the target message card.
- Opening the editor preserves list scroll position.
- Closing the editor returns focus to the originating edit button when it still exists, otherwise to the virtual list container or nearest visible message.
- On desktop, the editor should be a large dialog/sheet styled like an expanded FITx card.
- On mobile, the editor should prefer a full-screen sheet/dialog with stable viewport and keyboard behavior.
- The editor panel uses explicit `Apply` and `Cancel` controls.
- Edits are staged locally inside the panel while it is open.
- Inline validation runs while editing, but document edit state and header/filter edit counts update only after `Apply`.
- `Apply` may commit ordinary invalid field values as issues so users can stage partial repairs.
- `Apply` is blocked by export-blocking structural errors that FITx cannot represent safely in the edit model.
- `Cancel` discards staged panel changes.
- One reusable field editor supports scalar and array values inside the message editor panel.
- All fields in the selected message are editable in v1 when they are export-safe or raw-editable.
- Display-value editing is the default for known fields where FITx has reliable profile metadata and reversible transforms.
- Raw encoded-value editing is available for technical cases and unknown/custom fields.
- The edit model separates decoded display value, raw encoded value, editable UI value, and writer-serialized value.
- Units/type metadata belong in the field label, not inside the editable value.
- Unknown fields use the same field style.
- Array values render as stacked editable values in one field shell. No visible separators.
- No explicit array item indices or array count.
- Edited fields get subtle visual treatment but no inline edited label.
- Adding fields/messages should keep common known-profile flows easy while allowing raw custom numbers/types.
- Add-field flow lives in the editor panel and supports three modes: `Known`, `Raw`, and `Developer`.
- `Known` uses generated profile metadata for field selection and encoding.
- `Raw` allows technical users to enter field number, base type, size/array behavior, optional label/unit metadata, and raw value.
- `Developer` manages developer field value plus required developer field metadata when adding new developer fields.
- Adding fields happens only from the focused message editor panel.
- Each message card should expose a compact context-menu button for message actions.
- The compact context-menu button must be touch-sized, keyboard-accessible, and visible without hover.
- Message context menu actions for v1: Duplicate message, Delete message.
- Delete message is applied immediately after confirmation.
- V1 does not require undo, but the edit model should not preclude adding undo later.
- Duplicate message opens the editor panel with a staged copy of the source message.
- Applying the staged duplicate inserts the new message; canceling closes the editor without duplicating.
- Field identity is based on FIT field number, but encoded field order must match the message definition order.
- V1 preserves existing definition field order and appends newly added fields.
- Adding messages uses insert mode: the user starts an add-message flow, then the ordered list shows touch-compatible insertion targets between/around messages.
- Insert mode must clearly show where the message will be inserted before the user confirms.
- Add-message flow selects the insertion point first, then opens the message editor panel for a staged new message.
- Applying the staged new message inserts it at the selected location; canceling closes the editor without inserting.
- Add-message editor supports `Known` and `Raw` message modes; developer fields can be added inside the staged message through the field flow.
- Message insertion cannot rely on hover-only controls.
- Exact insert-mode and editor-panel visual treatment remains to be designed against the prototype.
- The card-to-panel transition should be treated as progressive enhancement; the non-animated open/close flow must remain correct and accessible.

## Message Toolbar and Filters

- Message toolbar appears below the header in loaded state.
- Default toolbar state is compact: `Add message` plus a `Filters` disclosure control.
- `Add message` changes to `Cancel add message` while insert mode is active.
- Filters are collapsed by default and expand inline from the message toolbar.
- A non-default active filter remains visible in the collapsed toolbar as a compact summary.
- Expanded filters use a single wrapping row with no horizontal scroll.
- Filter order: All, Issues, Edited, then message-type filters.
- Issues filter shows messages containing at least one message/field issue.
- All, Issues, and Edited always show counts, including zero, to avoid badge size changes.
- Issues and Edited counts show messages counts, not issues or edits count.
- Message-type filters are not shown for types with zero visible messages.
- Filtering preserves file order.
- Entering insert mode switches to `All` and suspends filter changes until insertion is completed or canceled.

## Validation and Issues

- Inline validation runs while editing.
- Numeric/unit fields validate as numbers.
- Percent fields validate `0-100`.
- Unit and range validation should be profile-aware where possible; do not assume every physical value is non-negative.
- Validation errors should appear inline without causing disruptive layout shift. Exact placement is a UI design detail.
- Invalid fields get red border/value treatment.
- File-level issues and message/field issues are modeled separately.
- Header `issues` count is total file-level plus message/field issues.
- `Issues` filter count is messages with at least one message/field issue, excluding file-level issues.
- Header `edits` count is edited fields.
- `Edited` filter count is messages containing at least one edit.
- Issues dialog title is `Issues`.
- Issue list is flat for v1.
- File-level issues do not have Show buttons.
- Message/field issues have Show buttons that switch to the Issues filter, scroll to the message, and close the dialog.
- Issues dialog must be accessible: modal semantics, focus management, Escape close, focus return.
- Context menus and dialogs should follow WAI-ARIA interaction patterns or use a headless primitive that implements them correctly.

## V2 Summary Consistency

- Activity, session, and lap messages are summary data and can become inconsistent when records are edited, duplicated, inserted, or deleted.
- V1 is a manual structural editor and should not add special session/lap/activity handling.
- Summary consistency validation and assisted recalculation are v2 concerns.
- In v2, summary consistency should be validated after each edit and reported as issues when FITx can detect likely problems.
- FIT activity files may use summary-first or summary-last ordering; do not infer summary time spans from message order.
- For session/lap summary messages, calculate the represented end time as `start_time + total_elapsed_time`.
- A summary message `timestamp` is the time the message was written to the file, not necessarily the summary end time.
- `total_elapsed_time`, `total_timer_time`, `total_distance`, start/end positions, average/max metrics, and activity `num_sessions` may need manual correction after structural edits.
- Research references:
  - Garmin FIT SDK overview and Profile.xlsx as canonical profile reference: https://developer.garmin.com/fit/overview/
  - Garmin FIT Activity message ordering change: https://forums.garmin.com/developer/fit-sdk/b/news-announcements/posts/important-fit-activity-file-message-change
  - Garmin FIT SDK forum clarification on summary timestamp semantics: https://forums.garmin.com/developer/fit-sdk/f/discussion/421871/session-message-in-fit-coming-edge-1050-contains-wrong-timestamp
  - Garmin FIT SDK forum clarification on pause/timer encoding: https://forums.garmin.com/developer/fit-sdk/f/discussion/289282/correctly-encoding-a-pause

## Parser and Export Boundaries

- UI must not directly manipulate binary FIT internals.
- FITx should write spec-valid FIT files with correct headers, definition/data records, field sizes/types, developer-field metadata when present, data size, and CRCs.
- FITx should avoid exporting structurally surprising files when a safer spec-valid representation exists, especially for manually added messages/fields.
- Garmin's JavaScript FIT SDK should be evaluated as an SDK-assisted dependency, but not assumed to be the primary document model or writer.
- The official JavaScript SDK encoder is useful for known profile messages and developer fields, but it ignores unknown message object values and requires message numbers to exist in its generated Profile.
- Because FITx v1 must support arbitrary custom messages/fields and preserve unknown data, the core editor still needs an export-capable document model and writer that can represent raw definitions/data records directly.
- FITx may use the SDK for reference behavior, profile-derived transforms, CRC/integrity checks, known-message fixture generation, and comparison tests where it fits.
- FIT profile metadata should be generated from Garmin FIT SDK `Profile.xlsx`, not hand-maintained as the main source of truth.
- `Profile.xlsx` parsing should run as a Node/dev-time generation step, not in the browser bundle.
- Commit the generated TypeScript/JSON profile artifact used by the app, plus source SDK version/checksum metadata for reproducibility.
- The generated profile should include at least message numbers/names, field numbers/names, base/profile types, scale, offset, units, array/component metadata where available, enum values, and comments useful for validation/display.
- Unknown/custom messages and fields remain supported even when absent from generated profile metadata.
- FITx uses a fully custom reader/parser as the core read path.
- The custom parser produces an export-capable FIT document model tailored to the editor, not only decoded display rows.
- The document model should preserve enough source information to rewrite the file safely while staying memory-efficient for 10k+ message files.
- Internal document preserves record order, definition records, data records, local message types, architecture/endian metadata, developer fields, checksum state, and decoded projections.
- Developer field support includes `developer_data_id` messages, `field_description` messages, developer field definitions inside message definitions, and developer field values inside data messages.
- Raw bytes and byte spans should be retained only where they materially help preservation, diagnostics, or export performance.
- Edit state is an overlay keyed by stable record/field IDs.
- Validator handles field-level issues, file-level issues, and export-blocking structural issues.
- Export-blocking structural issues are cases where FITx cannot confidently serialize a valid FIT file, such as unsupported base type encoding, impossible field size, missing required definition metadata for a newly added message, or inconsistent developer-field metadata.
- Export-blocking structural issues include unsupported base type encoding, impossible field size, missing definition metadata for new messages, inconsistent developer metadata, invalid local definition state, and any data shape the writer cannot represent spec-validly.
- Ordinary invalid values that can still be represented should be warning-level issues, not apply/export blockers.
- FITx uses a fully custom writer as the core export path.
- Writer serializes the FIT document, rewriting definitions/data records when needed, preserving untouched unknown content as faithfully as the document model allows, and recalculating FIT checksums.
- Download runs full validation first.
- User may download anyway but must be informed of what to expect from the issues.
- Download anyway is allowed for warning-level validation issues, but export-blocking structural issues prevent download until fixed.
- Consumer-specific import testing, such as Garmin Connect, is useful but not the primary v1 compatibility contract.

## FIT Profile Generation

- Source: canonical JSON profile input now, with Garmin FIT SDK `Profile.xlsx` parsing left as a later optional extension.
- Approach: create a dev-only generator script that reads canonical JSON and emits a normalized, sorted, typed profile artifact for app use.
- Runtime: the browser imports the generated artifact only; it never parses Excel.
- Default repository policy: commit generated profile artifacts plus SDK version/checksum metadata, not `Profile.xlsx` itself.
- If generated Garmin-derived metadata cannot be committed after license review, keep the generator and require a local/user-provided `Profile.xlsx` later to regenerate full metadata.
- Update workflow:
  1. Update the canonical JSON fixture or source profile input.
  2. Run the profile generator with the path to the JSON input.
  3. Review the generated diff.
  4. Run parser/profile/writer tests.
  5. Commit the generated artifact and source metadata.
- Reproducibility: record FIT SDK release/version, source file checksum, generator version, and generation timestamp.
- Validation: generator tests should verify representative message and field definitions, enum values, scale/offset/unit transforms, and stable deterministic output ordering.
- Generated metadata is advisory for known fields; FITx still preserves and edits unknown/custom entries using raw message/field definitions.
- Research references:
  - Garmin FIT SDK overview describing `Profile.xlsx` as the canonical profile reference: https://developer.garmin.com/fit/overview/
  - Official Garmin forum guidance recommending generating project profile data from the Types and Messages worksheets: https://forums.garmin.com/developer/fit-sdk/f/discussion/312370/how-to-interprete-profile-types/1516543
  - Garmin `fit-sdk-tools` repository containing latest `Profile.xlsx`: https://github.com/garmin/fit-sdk-tools

## Garmin SDK Fit

- Official JavaScript SDK package: `@garmin/fitsdk`.
- Current SDK capabilities that are useful for FITx:
  - Browser-compatible ESM package.
  - FIT integrity checks.
  - Decode options for raw versus scaled values, date conversion, enum string conversion, component/subfield expansion, unknown data inclusion, definition listeners, and developer field listeners.
  - Encoder support for known profile messages.
  - Developer-field support through field descriptions.
- Current SDK constraints for FITx v1:
  - Decoded messages are returned grouped by message type; FITx still needs ordered editor records.
  - The SDK does not expose enough raw byte/span preservation for our full edit/export model.
  - Encoder message definitions are built from SDK `Profile` metadata and known message object fields.
  - Unknown values in message objects are ignored by the SDK encoder.
  - Unknown/custom global message numbers are not directly supported by the SDK encoder unless the SDK profile is customized/generated ahead of time.
  - SDK customization via FitGen is build-time/profile customization, not suitable for arbitrary user-added fields/messages at runtime.
- Decision: use an SDK-assisted architecture, not an SDK-native-only architecture.
- The SDK is not part of the core reader/writer path for v1.
- FITx's fully custom reader and writer are the source of truth for the document model, edit model, and export.
- If a future SDK version exposes a lower-level definition/data writer that supports arbitrary message numbers and field definitions, revisit this decision.
- A runtime SDK profile-injection hack may be possible because the SDK encoder builds message definitions from its generated `Profile.messages` object.
- The hack would mean creating temporary synthetic profile entries for custom global message numbers and custom fields, then feeding normal SDK message objects to the encoder.
- This should be treated as a spike only, not the main architecture, because it relies on undocumented mutable generated-profile internals and may break on SDK updates.
- Even if profile injection works, FITx still needs its own document/edit model for file order, preservation, staged edits, unknown data, and UI behavior.
- The fully custom writer remains the baseline because it directly represents FIT definition records, data records, field order, local message type lifecycle, unknown/custom fields, and checksum generation.
- Research references:
  - Official JavaScript SDK README: https://github.com/garmin/fit-javascript-sdk
  - SDK encoder behavior: https://github.com/garmin/fit-javascript-sdk#encoder
  - SDK decoder options: https://github.com/garmin/fit-javascript-sdk#read-method

## High-Level Data Models

```ts
type FitDocument = {
  source: ArrayBuffer;
  header: FitHeader;
  records: FitRecordNode[];
  issues: FitIssue[];
};

type FitRecordNode = FitDefinitionNode | FitDataNode;

type FitDataNode = {
  kind: "data";
  id: string;
  order: number;
  localMessageType: number;
  globalMessageNumber: number;
  messageName: string;
  definitionId: string;
  fields: FitFieldNode[];
  rawBytes: Uint8Array;
};

type FitFieldNode = {
  id: string;
  number: number;
  name: string;
  baseType: string;
  rawValue: unknown;
  displayValue: unknown;
  units?: string;
  known: boolean;
  rawBytes: Uint8Array;
};

type FitEditOverlay = {
  messages: Map<string, FitEditOverlayMessage>;
};
```

Exact TypeScript shapes may change during architecture, this is an example.

## Retention Strategy

- Keep the original uploaded `ArrayBuffer` for diagnostics and preservation.
- Store record byte spans into the original buffer by default.
- Avoid copying raw bytes for every record unless measurements show it is needed for performance or writer simplicity.
- Copy per-record raw bytes only for diagnostics, modified records, or cases where span-based retention is insufficient.
- Keep decoded projections lightweight and derive heavier display models lazily where practical.

## Performance

- Real files may contain 10k+ messages.
- Parser/document memory footprint must be measured or estimated before committing to raw-byte retention for every record.
- Loaded state must not render the full editable DOM.
- Use virtualization or an equivalent strategy that keeps the ordered card list responsive.
- Filtering and edit state must remain stable while virtualized rows mount/unmount.
- Cross-browser rendering and scrolling behavior must be tested for virtualized variable-height message cards.

## Testing Goals

- Parser preserves definitions, data messages, unknown fields/messages, and checksum state.
- Fixtures should include synthetic minimal files and license-safe representative activity files.
- Fixture coverage should include compressed timestamp records, unknown fields/messages, developer fields, added normal fields, added developer fields, added messages, duplicated messages, deleted messages, and CRC round trips.
- Editing tracks field/message counts correctly.
- Filters report counts and preserve order.
- Validation produces file-level and field-level issues separately.
- Writer round-trips an unchanged fixture with valid CRCs.
- Writer exports scalar edits with valid CRCs.
- Writer exports added fields/messages by rewriting definitions/data records with valid CRCs.
- Writer exports edited and added developer fields with valid related metadata records and CRCs.
- Download flow opens Issues dialog when appropriate and supports Download anyway.

## Approval Gates

- Review Garmin FIT SDK/Profile licensing before committing `Profile.xlsx` or generated Garmin-derived metadata in any public repository.
- Approve generated profile artifact policy before publishing the project.
- Approve the final visual pass against `prototype/App.jsx` before calling v1 complete.

## Subagent Notes

- Use this file as the shared planning artifact.
- Do not implement until the user approves the implementation plan.
- Architect pass recommended a lossless FIT document model plus full writer.
- Subagents should load only this plan plus the specific files needed for their scoped task.

## Proposed Work Breakdown

### Phase 1 - Risk-First FIT Core Slice

- Completed: add FIT domain module boundaries:
  - `src/fit/types.ts`
  - `src/fit/profile.ts`
  - `src/fit/parser.ts`
  - `src/fit/validation.ts`
  - `src/fit/writer.ts`
- Completed: add canonical editor overlay module:
  - `src/editor/editOverlay.ts`
- Completed: add profile generation script scaffold and generated metadata contract.
- Completed: keep current POC working until replaced.
- Completed: implement custom reader/document model and custom writer enough to parse, round-trip, and export scalar/developer/array edits from synthetic fixtures.
- Completed: verify data size, header CRC, file CRC, and semantic record preservation before full UI work.

### Phase 1.5 - Production Architecture Hardening

- Stabilize the public `fit` domain API around the retired legacy edit-set and the canonical `src/editor/editOverlay.ts` model.
- Introduce one canonical edit overlay/transaction model for field edits, added fields, added developer fields, added messages, duplicate, and delete.
- Centralize typed validation issues and export-blocking classification.
- Extract app session state, selectors, and browser file/download ports out of `App.tsx` into `app` and `editor`.
- Keep the prototype-aligned UI intact while consolidating reusable presentation in `components`.
- Retire or archive the legacy parser path so production code uses one FIT document model.
- Prepare parse/export/full validation boundaries for Web Worker execution.

### Phase 2 - FIT Profile Metadata

- Implement dev-time `Profile.xlsx` generator.
- Emit deterministic generated metadata for messages, fields, types/enums, scale/offset/units, array/component metadata, and source metadata.
- Add tests for representative profile lookups and transform metadata.
- Preserve raw/custom fallback when metadata is absent.

### Phase 3 - Custom Reader, Writer, and Document Model

- Replace the current inspection parser with a custom export-capable reader.
- Parse headers, CRC state, definition records, data records, compressed timestamp headers, developer field definitions, and values.
- Preserve file order and hidden definition records.
- Implement writer support for definition reuse/rewrite, normal fields, developer fields, added fields, added messages, duplicated messages, deleted messages, and CRCs.
- Produce lightweight quick-view records for the virtualized message list.
- Measure or estimate memory footprint for representative 10k+ message files.

### Phase 4 - Edit Model and Validation

- Implement staged message-editor transactions.
- Support display-value and raw encoded-value edits.
- Support normal and developer field edits/additions.
- Support add message, staged duplicate, and confirmed delete.
- Implement filter counts, edit counts, file/message/field issues, and export-blocking structural issues.

### Phase 5 - Prototype-Aligned UI

- Add chosen UI dependencies: `vanilla-extract`, Radix primitives needed for dialog/context menu, and TanStack Virtual.
- Rebuild the app around the prototype visual direction.
- Implement header, empty/drag/loading/error states, filter row, virtualized quick-view message cards, edit icon-buttons, context menu, insert mode, Issues dialog, and message editor panel.
- Render the editor panel outside the virtualized list.
- Add progressive card-to-panel animation only after the non-animated flow is correct.

### Phase 6 - Download Flow Integration

- Wire the verified writer into the UI Download action.
- Show Issues dialog before download when issues exist.
- Block only export-blocking structural issues; allow Download anyway for warning-level issues.
- Generate a corrected `.fit` file blob with a clear filename.

### Phase 7 - Verification and Review

- Unit tests: profile metadata, parser, edit tracking, validation, filters, writer, CRC.
- Integration tests: upload, edit panel apply/cancel, add field, add message insert mode, duplicate, delete, issues dialog, download.
- Cross-browser checks: Chromium, Firefox, Safari/macOS, Safari/iOS, Chrome/Android for layout, dialogs, context menus, virtualized scrolling, and mobile keyboard behavior.
- Code review and security/dependency review before calling v1 complete.
