# Project Kickoff Workflow

Use this workflow when the user is starting a new product or project and the codebase does not yet define the product shape.

## Goal

Turn a vague or early product idea into an approved initial project plan without touching product code until the user agrees.

## Sequence

1. Orchestrator gathers product intent:
   - target users
   - core problem
   - primary workflows
   - platform constraints
   - non-goals
   - technical preferences
   - delivery priorities

2. Orchestrator asks only blocking questions.

3. Architect creates a planning document:
   - requirements
   - assumptions
   - design options
   - recommendation
   - initial implementation phases

4. User reviews and approves or revises the plan.

5. Orchestrator converts the approved plan into the first scoped task for a worker.

## Agents

- Required: orchestrator, architect.
- Optional after approval: repo-explorer, worker, unit-test-engineer, code-reviewer, security-auditor.

## Stop Conditions

Stop before implementation if:

- the product goal is still unclear
- the user has not approved the initial direction
- the plan requires a major technical decision the user has not accepted

## Output

The kickoff phase should produce a durable markdown plan, preferably under:

- `docs/plans/<project-or-feature-name>.md`

If no `docs/` directory exists yet, ask before creating project documentation structure.
