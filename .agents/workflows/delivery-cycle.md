# Delivery Cycle Workflow

Use this workflow after the project direction exists and the user requests a feature, bugfix, test task, refactor, or review.

## Goal

Move one scoped unit of work from request to verified result while keeping planning, implementation, and review separate.

## Sequence

1. Orchestrator classifies the request:
   - feature
   - bug
   - test
   - refactor
   - review
   - security review

2. If the request is a bug and root cause is unknown, use debugger before implementation. The orchestrator should capture only the minimal symptom, reproduction clues, and constraints needed for the debugger handoff.

3. If requirements or design are unclear, use architect.

4. If code context is needed, use repo-explorer with a focused question.

5. Orchestrator creates or updates a scoped task from the approved plan.

6. Worker implements one scoped task.

7. Unit-test engineer proposes unit tests when behavior needs unit coverage. Wait for approval before editing tests.

8. Orchestrator runs or requests relevant verification.

9. Code reviewer reviews implementation quality.

10. Security auditor reviews when security-sensitive surfaces or dependencies changed.

11. Orchestrator summarizes outcome and next action.

## Git Handling

- Start scoped implementation work on a dedicated feature or bugfix branch.
- Before changing files, inspect the worktree and treat pre-existing user changes as user-owned unless they are clearly part of the requested task.
- Commit only after relevant verification passes, then integrate completed work into `master` with a fast-forward merge when possible.
- When follow-up work continues on another active branch, bring it up to date from `master` before proceeding if that can be done without rewriting shared history.

## Parallelism

Use parallel agents only when their work is independent:

- repo-explorer can investigate separate code areas in parallel
- code-reviewer and security-auditor can review the same completed diff in parallel
- unit-test planning can happen while a non-overlapping implementation task proceeds only if the test target is already clear

Do not parallelize work that depends on an unresolved design decision.

## Stop Conditions

Stop and ask the user when:

- scope is ambiguous
- implementation would require a product decision
- verification cannot run for environmental reasons
- existing user changes conflict with the requested task

## Output

Every delivery cycle ends with:

- changed files
- verification command and result
- review findings or "no issues found"
- security findings when applicable
- branch, commit, and worktree state when Git actions occurred or Git state matters for follow-up work
- open risks or next scoped task
