You are implementing FITx, a minimal single-page web app for inspecting and editing Garmin FIT files.

Use the attached Canvas prototype code @prototype/App.jsx as the primary visual and UX reference. Treat it as a design prototype, not final architecture. You may choose the best implementation approach, framework structure, UI library strategy, styling system, state management, parser/export architecture, and accessibility primitives. Preserve the product decisions and interaction model described below. But the visual design in the prototype must be recreated and build upon. Do not redesign the visuals. If you want to change anything, ask me first and defend your dicision with some arguments.

Product goal:
FITx is a focused utility app for technical users who want to repair activity data in .fit files. The first version is not a full FIT debugger. It should let the user upload a .fit file, inspect activity messages in file order, edit field values, validate changes, and download a corrected .fit file.

The following describes key points that are already reflected in the prototype. Treat this description as a thought proccess done and dicisions made. The prototype can be reacreated as is once we decide on the libraries/framework to use. Subtle changes are possible if you can argue about that. Build upon it.

Visual direction:
- Bespoke app UI, not a generic dashboard.
- Material Design 3 is visual inspiration only: calm tonal surfaces, rounded panels, subtle outlines, strong spacing, clear typography, light theme first.
- Do not introduce a sidebar, three-column layout, dashboard cards, record details pane, grouping, charts, timelines, or semantic zone tables in v1.
- Keep the interface flat, spacious, technical, and utilitarian.
- Header is flush with page background.
- Main content uses one rounded surface/panel.
- Message cards sit inside that panel and appear one after another in file order.

Core screen states:
1. Empty state
2. Drag-over upload state
3. Loading/parsing state
4. Loaded/editing state
5. Error state

Header requirements:
- One-line header.
- Left: app icon, “FITx”, loaded filename, dot separator, message count.
- Right: issues count when present, edits count when present, Download button when loaded, Upload button.
- Empty, drag-over, loading, and error states should not show meaningless header status text.
- Upload is the primary action before a file is loaded.
- When a file is loaded, Download is the primary action and Upload is secondary.

Upload / empty / loading:
- Empty state should be a full-width lightweight info panel, not a large CTA card.
- No duplicate upload button inside the empty panel.
- Drag-over uses the same background as empty and only adds dashed border + drag copy.
- Loading state should be flat, with concise copy and an inset progress indicator. No progress line attached to the top edge of a rounded panel.
- Error state should be similarly flat and clear.

Loaded state:
- Show messages exactly in file order.
- Hide FIT definition messages from the repair/edit view.
- Do not group messages yet.
- Unknown message types should be preserved and displayed by design where appropriate; they are not automatically issues.
- No dedicated record detail pane.
- No summary stat cards above the list.
- The message list begins immediately after the filter bar.

Message card requirements:
- Each FIT message is its own rounded card.
- Header format:
  - message type
  - timestamp only if present
  - example: `record · 2025-10-11 11:33:18 UTC+03:00`
  - if no timestamp, show only the message type.
- Do not show message index in the UI for now.
- Do not show source row or field count.
- Do not include a three-dot overflow menu until real actions exist.

Field editor requirements:
- All fields are editable in v1.
- One reusable field component should support scalar and array values.
- Field label shows the field name plus optional unit/type metadata.
- Units must be shown in the label, not inside the editable value.
  - Example: label `max_power · watts`, value `574`
  - Example: label `enhanced_speed · m/s`, value `1.148`
- Unknown fields use the same field style, with subtle inline metadata:
  - `unknown · unknown`
- Array fields must be plain raw parsed arrays, not semantic grouped views.
- Array values should be stacked editable values in the same field shell.
- Do not show explicit array item indices.
- Do not show an array count if the values are visible.
- Array field visual style should match scalar field style; avoid nested chips/background blocks.
- Use compact field padding; this is dense technical data.

Validation:
- Basic field validation runs inline while editing.
- Numeric/unit fields should validate as numbers.
- Percent fields should validate 0–100.
- Non-negative physical units should reject negative values.
- Validation errors appear inline in the field label row to avoid layout shift.
- Invalid fields get red border/value treatment.
- Edited fields get a subtle edited state, but no inline “edited” label.

Counts:
- Header `edits` count = number of edited fields.
- `Edited` filter count = number of messages containing at least one edit.
- Header `issues` count = total issues, including file-level and field-level issues.
- `Issues` filter count = number of messages containing at least one issue. It should not include file-level issues.

Filter bar:
- Show below the header in loaded state.
- Single wrapping row, no horizontal scroll.
- Filter order:
  1. All
  2. Issues
  3. Edited
  4. message-type filters
- `All`, `Issues`, and `Edited` should always show counts, including 0, to prevent size changes.
- Message type filters show counts when available.
- Filtering should preserve message order.

Issues flow:
- Issues are not only invalid edited fields. Model file-level issues separately from message/field issues.
- Example file-level issue: original file checksum was invalid.
- Unknown message types are not issues by themselves.
- Clicking the header issue count opens an accessible Issues dialog/panel.
- Clicking Download when issues exist opens the same Issues dialog/panel, but with a Download anyway action.
- Opening Issues from the header should not show Download anyway.
- Issues dialog title is simply “Issues”.
- No severity system yet.
- Issue list is flat for now; do not group sections yet.
- File-level issues do not have a Show button.
- Message/field issues have Show, which switches to the Issues filter and closes the dialog.
- Dialog must be accessible: modal semantics, focus management, Escape close, focus return.

Download flow:
- Download runs full file validation, including domain-level FIT validation.
- If issues exist, show Issues dialog.
- User can keep editing or download anyway.
- Downloaded file must be a corrected .fit file.
- Export must recalculate FIT checksums. This is implementation detail and should not be exposed as a user concern except when original checksum was invalid.
- Allow editing and exporting files with broken original checksums, but inform user via file-level issue.

Parser/export architecture:
- Keep FIT parsing/export/checksum logic separate from UI components.
- UI should not directly manipulate binary FIT internals.
- Preserve unknown fields/messages unless explicitly edited/deleted in later versions.
- Preserve message order.
- Preserve untouched data as faithfully as possible.

Performance:
- Real files may contain 10k+ messages.
- Use virtualization or another performance strategy so loaded state remains responsive.
- Avoid rendering the full 11k-message editable DOM at once.

Implementation freedom:
- You may decide whether to use Tailwind, CSS modules, vanilla CSS, a component library, headless primitives, or another styling approach.
- Do not choose a library that forces the UI away from the Canvas direction.
- Prefer a small bespoke component system over generic dashboard components.
- Choose appropriate architecture and state management for the framework.
- Keep implementation maintainable and testable.

Deliverables:
1. Propose an implementation plan before coding.
2. Recommend the UI/styling approach and justify it against the bespoke design.
3. Define data models for parsed file, messages, fields, edits, filters, and issues.
4. Define parser/export boundaries.
5. Implement the first functional version incrementally.
6. Include tests for parsing/edit tracking/filter counts/issues/download validation behavior.

Use the Canvas prototype code as the visual reference and UX reference. Do not copy its mock tuple data shape blindly if a better production data model is available.
