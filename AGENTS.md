# Agent Operating Guide

This repository uses a project-local agent workflow. The standard entry point is this file.

## Start Here

For all planning, implementation, debugging, testing, review, or project-kickoff requests, begin by reading:

- `.agents/orchestrator.md`

The orchestrator decides which specialist prompt or workflow playbook to load next. Do not load every file in `.agents/` by default.

## Context Discipline

- Load only the specialist agent file needed for the current task.
- Load only one workflow playbook at a time.
- Prefer repository evidence over assumptions once project code exists.
- Keep handoffs written to durable markdown plans when work spans multiple agents or turns.
- Do not touch product code during workflow setup unless the user explicitly asks.

## Agent Files

- `.codex/agents/*.toml` - native Codex custom agents used when Codex spawns subagents.
- `.agents/orchestrator.md` - entry point and routing agent.
- `.agents/architect.md` - requirements, design options, and implementation plans.
- `.agents/repo-explorer.md` - read-only codebase exploration.
- `.agents/worker.md` - scoped implementation from an approved plan.
- `.agents/debugger.md` - root-cause analysis before fixes.
- `.agents/unit-test-engineer.md` - unit test planning and implementation.
- `.agents/code-reviewer.md` - implementation quality review.
- `.agents/security-auditor.md` - security and dependency review.

## Workflow Playbooks

- `.agents/workflows/project-kickoff.md` - use for first-time product discovery and initial planning.
- `.agents/workflows/delivery-cycle.md` - use for feature, bugfix, test, and review loops after project direction exists.

The workflows define when agents collaborate. The agent files define how each role behaves.

## Native Codex Subagents

When running Codex CLI directly, prefer native custom agents from `.codex/agents/` for spawned work:

- `architect`
- `repo_explorer`
- `workflow_worker`
- `debugger`
- `unit_test_engineer`
- `code_reviewer`
- `security_auditor`

Start as the orchestrator in the root session, then spawn these agents only for bounded tasks. Use `/agent` in Codex CLI to inspect or switch between active agent threads.
