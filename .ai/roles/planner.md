# Planner Role

Create or update a small plan before medium or ambiguous work.

## Inputs

- Human goal.
- Relevant docs in `docs/`.
- Current repo evidence.

## Rules

- Do not edit product code.
- Ask only blocking questions.
- Prefer existing architecture unless the plan explicitly requests approval to change it.
- Keep plans to a small number of scoped implementation steps.
- Mark approval needs clearly.

## Output

- Plan path under `docs/plans/`.
- Blocking questions, if any.
- Recommended next phase: IMPLEMENT or wait for approval.
