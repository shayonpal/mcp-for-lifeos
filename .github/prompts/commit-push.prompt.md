---
agent: agent
description: Commit, push, and PR handoff workflow for MCP for LifeOS
---

# Commit & Push Prompt – MCP for LifeOS

> Invocation: `/commit-push <linear-issue-id>` (filename `commit-push.md` defines the command name).

You orchestrate the handoff from completed implementation to source control and review for the MCP for LifeOS repository. Follow OpenAI's prompt design guidance: make roles explicit, sequence tasks, surface assumptions, highlight trade-offs, and invite clarification. Mirror the existing commit/push workflow (previously `.claude/commands/workflow/07-commit-push.md`) while keeping git operations deliberate and auditable.

## Mission & Constraints
- Ensure documentation, tests, and metadata are ready before committing.
- Execute git operations (status, staging, commit, push) with clear reporting and without leaving the tree dirty.
- Decide whether to open a PR or land directly to `master` based on workflow policy and issue scope.
- Working issue context: `$ARGUMENTS` (first token matching `AAA-123` selects the Linear issue).
- Maintain factual, neutral tone; record any skipped validations with justification.

If the Linear ID is absent, respond exactly with:
```
Error: Linear issue ID required
Usage: /commit-push <linear-issue-id>
Example: /commit-push MCP-123
```

## Commit Workflow
1. **Preflight Verification**
   - Confirm documentation phase complete (CHANGELOG, READMEs, docs) and that `git status` is clean aside from intentional changes.
   - Capture current timestamp and summarize pending changes (`git diff --stat`).
   - Re-run critical quality gates (`npm run typecheck`, targeted tests) unless already recorded and unchanged.
2. **Branch & Mode Decision**
   - Identify current branch; if still on master, decide whether a feature branch is required (large features, collaborative review) or direct commit is acceptable.
   - If a branch exists, ensure it tracks remote; if not, create and checkout a descriptive branch name following staging recommendation.
3. **Stage & Commit**
   - Stage files intentionally (source, tests, docs, CHANGELOG, supporting assets). Auto-include `.claude/` updates except local settings.
   - Confirm `.codex/` remains ignored by git unless the workflow requires exporting prompts elsewhere.
   - Compose Conventional Commit message referencing Linear issue (`feat(mcp): description (MCP-123)`). Include breaking change notes if applicable.
   - Record hook outputs; if hooks modify files, restage and repeat until clean.
4. **Push & Publish**
   - Push branch to remote. If working on master, confirm branch protection expectations.
   - When using a feature branch, create a PR draft via `gh pr create` (title, body summarizing scope, tests, docs).
   - Capture commit SHA, branch, remote URLs, and PR link (if created).
5. **Tracker Update & Next Steps**
   - Prepare a Linear issue comment summarizing commit/pr details, tests run, documentation status, and remaining tasks.
   - Recommend transition to `/review-pr` (for branch workflow) or mark ready for release depending on route.

## Output Format
Structure responses with these sections (use headings exactly):
```
# Commit & Push – <Issue ID>: <Concise Title>

## 📋 Preflight Summary
- Pending changes overview
- Quality gates rerun (commands & outcomes)
- Documentation readiness confirmation

## 🌿 Branch & Commit Details
- Branch strategy (direct master / feature branch)
- Commit message(s)
- Hook results or warnings

## 🚀 Push / PR Status
- Push command executed
- Remote tracking info
- PR link & state (if applicable)

## 📣 Tracker Update Draft
- Suggested Linear comment
- Status change recommendation
- Follow-up actions

## 🚦 Next Workflow Step
- Recommendation: `/review-pr`, `/release`, or monitoring
- Rationale and any outstanding checks
```

## Style Checklist
- Use repository-relative file paths when referencing staged files.
- Quote exact commands executed and their exit status.
- Reference commit SHAs, branch names, and PR URLs explicitly.
- Note any skipped steps with reason and risk level.
- Maintain neutral tone; no superlatives.

Conclude only when every section is complete or justified as N/A.
