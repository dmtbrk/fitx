# FIT File Editor POC

## Status

`Implementation Plan`

## Q&A

**Q1:** Should FIT files be parsed entirely in-browser?
**Recommendation:** Yes, for the POC. It keeps user activity data private and avoids backend scope.
**Answer:** Assumed yes.

**Q2:** What does "show contents" mean for the first POC?
**Recommendation:** Show file metadata, basic activity summary, message groups, inspectable records, and raw decoded fields.
**Answer:** Assumed this combined view.

**Q3:** Should the first POC edit and export FIT files?
**Recommendation:** No. Defer editing/export until parsing and inspection are useful.
**Answer:** Assumed no for initial POC.

## Requirements

1. Create a React frontend-first POC.
2. Let the user upload or drag-and-drop a `.fit` file.
3. Parse the FIT binary locally in the browser.
4. Show file/header details, decoded message groups, common activity metrics, and an inspectable table of records.
5. Avoid sending user files to any backend.
6. Keep the implementation dependency-light and easy to extend toward editing later.

## Approaches

### Option A - Use a FIT Parser Package

Use an npm parser library and focus on UI.

Pros:
- Faster path to broad FIT profile coverage.
- Less parser maintenance.

Cons:
- Adds dependency risk.
- Package output shape may be awkward for editing/export later.
- Requires package selection and validation.

### Option B - Implement a Minimal Browser Parser

Decode FIT headers, definition messages, data messages, common base types, and common profile field names directly.

Pros:
- No parser dependency.
- Clear control over raw bytes and decoded values.
- Easier to evolve toward editing/export because local/global message definitions are preserved.

Cons:
- Initial profile mapping is incomplete.
- Needs more work later for full Garmin profile coverage, developer fields, validation, and write support.

**Recommendation:** Option B for the POC.

## Chosen Approach

Build a Vite React app with a minimal FIT decoder in `src/lib/fitParser.ts`. The UI will expose summary metrics and raw inspection views without pretending to fully support every FIT message.

## Steps

### Step 1 - App Scaffold

**Files:** `package.json`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/styles.css`

Create a Vite React TypeScript app shell with upload/dropzone, state handling, and inspection layout.

### Step 2 - FIT Parser

**Files:** `src/lib/fitParser.ts`

Implement FIT header parsing, definition record handling, data record decoding, common base types, basic profile field names, value transforms for timestamps/coordinates/distance/speed/altitude, and summary derivation.

### Step 3 - Verification

**Files:** `src/lib/fitParser.test.ts`, project scripts

Add a focused synthetic FIT fixture test for parser behavior, then run typecheck/build/test. Start the local dev server for manual use.
