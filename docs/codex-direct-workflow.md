# Codex Direct Workflow

Use this when running Codex directly in a terminal.

```bash
codex -C /home/brk/Projects/fitx
```

Start with a concise feature-loop prompt from `.ai/prompts/feature-loop.md`.

Default sequence:

1. PLAN: create or update a small plan in `docs/plans/`.
2. IMPLEMENT: execute one scoped plan step.
3. VERIFY: run `scripts/verify-fast.sh`, review the diff, and return PASS/FAIL plus the next action.

Do not start the old orchestrator or spawn specialist agents by default. Use subagents only as optional exceptions for bounded research, large test triage, or parallel exploration.
