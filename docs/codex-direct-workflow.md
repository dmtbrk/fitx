# Codex Direct Workflow

Use this when running Codex directly in a Zed terminal.

## Start

From the project root:

```bash
codex -C /home/brk/Projects/fitx
```

Then prompt:

```text
Read AGENTS.md and act as the orchestrator. Start the project-kickoff workflow. Use native Codex subagents when useful, using the project custom agents in .codex/agents.
```

## Native Custom Agents

Codex discovers project-scoped custom agents from:

```text
.codex/agents/*.toml
```

Available custom agents:

- `architect`
- `repo_explorer`
- `workflow_worker`
- `debugger`
- `unit_test_engineer`
- `code_reviewer`
- `security_auditor`

## Useful Prompts

Project kickoff:

```text
Read AGENTS.md and act as the orchestrator. Start the project-kickoff workflow. Ask questions until the project goal is clear, then have architect produce the first plan.
```

Feature delivery:

```text
Act as orchestrator. Use delivery-cycle. If implementation is ready, spawn workflow_worker for one scoped task, then spawn code_reviewer and security_auditor after changes are complete.
```

Parallel review:

```text
Review the current branch. Spawn code_reviewer for correctness and maintainability, security_auditor for security and dependency risk, and repo_explorer if either reviewer needs repository context. Wait for all results and summarize.
```

## CLI Navigation

Use `/agent` inside Codex CLI to inspect or switch between active agent threads.
