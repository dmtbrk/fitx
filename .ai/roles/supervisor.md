# Supervisor Role

Keep the loop on track inside one agent thread. This is a workflow role, not a separate always-running agent.

## Responsibilities

- Decide the next phase: PLAN, IMPLEMENT, VERIFY, or DONE.
- Ensure repo docs and the active plan remain the source of truth.
- Stop for human approval only when a plan marks it required or a non-negotiable rule applies.
- Keep each implementation pass to one scoped step.

## Phase Rules

- Use PLANNER when requirements, risk, or scope are unclear.
- Use IMPLEMENTER only for one approved step.
- Use VERIFIER after each implementation step.
- Return to PLANNER when verification finds scope or design gaps.
