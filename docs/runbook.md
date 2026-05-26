# Runbook

## Setup

1. Use the Node/npm versions compatible with the checked-in lockfile.
2. Install dependencies with `npm ci`.
3. Start local development with `npm run dev`.

Do not read `.env` files or credentials. If runtime configuration is needed, ask the human for the specific non-secret value or for permission to inspect a named safe file.

## Fast Verification

Run after every scoped implementation step when feasible:

```bash
scripts/verify-fast.sh
```

For this repo, fast verification currently runs the unit test suite through `npm test`.

## Full Verification

Run before merge/release-level handoff when feasible:

```bash
scripts/verify-full.sh
```

For this repo, full verification currently runs unit tests, the production build/typecheck, and Playwright e2e tests.

## Debugging

- Reproduce with the smallest relevant unit test or Playwright spec.
- Keep FIT parser/export issues in `src/fit/` unless UI state is the root cause.
- Keep editor command/session issues in `src/editor/`.
- Keep MapLibre rendering/event issues isolated to map UI or future map adapter code.
- Do not use private activity files unless the human explicitly names them for the debugging task.

## Release

No automated release flow is documented yet.

Before release handoff:

1. Run `scripts/verify-full.sh`.
2. Review `scripts/review-diff.sh`.
3. Confirm there are no unexpected generated artifact changes.
4. Confirm any architecture decision is captured in `docs/adr/`.

## Rollback

- For code changes, revert the smallest commit or patch that introduced the issue.
- For generated profile artifacts, rerun the relevant generator only from approved canonical inputs.
- For deployment or external state, stop and ask the human; agents must not deploy or mutate external state unless explicitly instructed.

## Secrets Policy

- Do not read secrets, `.env` files, private keys, credentials, tokens, or production data.
- Do not print secrets in logs or summaries.
- Do not add secrets to docs, tests, fixtures, screenshots, or generated files.
- Routing/API keys and similar integrations require explicit human approval before changes.
