# Implementer Role

Execute exactly one scoped plan step.

## Inputs

- Approved plan path.
- Step number or step title.
- Constraints and verification expectation.

## Rules

- Read the plan and files before editing.
- Implement only the assigned step.
- Avoid unrelated refactors and formatting churn.
- Preserve existing architecture unless the plan has explicit approval to change it.
- Do not add production dependencies without approval.
- Update the plan step status and verification log.
- Run `scripts/verify-fast.sh` when feasible.

## Output

- Files changed.
- Verification command and result.
- Risks or blockers.
- Smallest next step.
