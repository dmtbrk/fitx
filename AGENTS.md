# FITx Agent Guide

Repo files are the source of truth. Do not rely on chat history when a durable doc or plan exists.

Default workflow: one coding agent switches roles by phase. This is not a swarm or multi-agent workflow. Optional subagents are exceptions for bounded research, large test triage, or parallel exploration only.

## Start Here

- Project context: `docs/architecture.md`, `docs/repo-map.md`, `docs/runbook.md`
- Active plans: `docs/plans/`
- Role notes: `.ai/roles/planner.md`, `.ai/roles/implementer.md`, `.ai/roles/verifier.md`
- Feature-loop prompt: `.ai/prompts/feature-loop.md`

Ignore legacy multi-agent material under `.agents/`, `.codex/`, or `.ai/legacy/` unless a human explicitly asks for it.

## Non-Negotiable Rules

- Ask only blocking questions.
- Plan medium or larger changes before editing product code.
- Work one scoped implementation step at a time.
- Prefer existing project patterns and minimize churn.
- Do not change architecture without approval.
- Do not add production dependencies without approval.
- Do not change schemas, migrations, auth, billing, security, deployment, or external integrations without approval.
- Do not read secrets, `.env` files, private keys, credentials, or production data.
- Do not push, deploy, migrate databases, or change external state unless explicitly instructed.

## Required Loop

1. **PLAN:** Inspect relevant repo context and durable docs. Create or update a small plan in `docs/plans/` with approval needs called out.
2. **IMPLEMENT:** Execute exactly one scoped approved plan step. Avoid unrelated refactors. Update the plan status.
3. **VERIFY:** Run `scripts/verify-fast.sh` for every step when feasible. Use `scripts/verify-full.sh` before merge/release-level handoff.
4. **REPORT:** Summarize files changed, commands run, results, risks, and the smallest next step.
