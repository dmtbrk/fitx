# Legacy AI Workflow

The previous setup used a multi-agent orchestration model with specialist prompts, Codex custom agents, and delivery/kickoff playbooks.

That workflow is now legacy because it was too token-heavy for this repo and still required manual feature context before each implementation pass.

Archived copies live under:

- `.ai/legacy/agents/`
- `.ai/legacy/codex/`

Do not use the legacy workflow by default. The active workflow is the single-agent role-switching loop documented in `AGENTS.md`.
