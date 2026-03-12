# Specs Folder Policy

This folder is the canonical location for new active specs in this repository.

## Policy

- Write new specs under `docs/specs/`.
- Keep historical and archived material in local-only `.archive/` (not versioned in git).
- Do not move legacy specs unless there is a specific migration task.
- Treat specs as the source of truth for proposed change scope and decisions, not for current implemented architecture.
- Use GitHub Issues as the canonical execution backlog.
- If a retained bundle documents an already-implemented change, rewrite or archive it so it reads as historical/decision context rather than pending execution.

## Naming

- Single-file mode: `docs/specs/00X-feature-name.md`
- Bundle mode: `docs/specs/00X-feature-name/spec.md` (+ optional `plan.md`, `tasks.md`)

## Recommended Usage

- Use no spec bundle for small, low-risk changes already clear in the issue.
- Use single-file mode when one document is enough to capture scope and acceptance.
- Use bundle mode for large, multi-phase, compliance-sensitive, or cross-stack initiatives.
- Add `plan.md` when technical translation or phased rollout matters.
- Add `tasks.md` only as a short-lived decomposition aid before or during issue creation; avoid maintaining it as a parallel backlog after execution tracking moves to GitHub Issues.

## Operating Model

- `AGENTS.md`: repository contract, execution rules, and workflow policy.
- `docs/architecture/overview.md`: implemented architecture only.
- `docs/specs/`: change intent, requirements, decisions, risks, and phased plans.
- GitHub Issues: execution, prioritization, and status.

This is a spec-anchored brownfield workflow. The repository does not use specs as a substitute for runtime or architectural truth.

## Source of Truth

When conflicts appear, follow this precedence:

1. `AGENTS.md`
2. `docs/architecture/overview.md`
3. `docs/playbooks/agentic-repo-bootstrap.md`
4. `docs/specs/*`

## Notes

- If a spec becomes obsolete, archive or remove it through an explicit maintenance task instead of letting it drift indefinitely.
- If issue state and retained spec wording diverge, GitHub Issues win for execution status while architecture docs win for implemented-state description.
