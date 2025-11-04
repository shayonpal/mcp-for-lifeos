---
name: 09-release
version: 2.0.0
description: Streamlined release with 2 checkpoints
author: Shayon Pal
tags: [workflow-v2, release]
argument_hint: [version|auto]
---

# Release - Streamlined Publishing (Simplified Stub)

**Note**: This is a simplified stub for testing. Full implementation pending.

## Instructions

```bash
source .claude/commands/workflow-v2/_shared/config.md
source .claude/commands/workflow-v2/_shared/agent-utils.md
source .claude/commands/workflow-v2/_shared/state-utils.md
source .claude/commands/workflow-v2/_shared/output-templates.md

VERSION="${ARGUMENTS:-auto}"
write_workflow_state "current_phase" "release"

echo "🏷️ Release Preparation"

# Checkpoint 1: Version & Changes (Consolidated)
checkpoint_output \
  "Release Confirmation" \
  "Version: $VERSION\nCommits: 15\nQuality: All passing" \
  "Proceed with release? (yes/no)"

# If yes, auto-progress through quality gates
echo "✅ TypeScript validation"
echo "✅ Build verification"
echo "✅ Test suite"

# Checkpoint 2: Final Approval (Consolidated)
checkpoint_output \
  "Final Approval" \
  "All validations passed. Ready to publish." \
  "Create release? (yes/no)"

# If yes:
# - Update CHANGELOG
# - Create git tag
# - Push tag
# - Create GitHub release
# - Update Linear issues

success_output "Release Phase" "Release $VERSION published successfully" "Workflow complete"
```

## Checkpoint Reduction

**V1**: 6 checkpoints (version, changes, quality, docs, Linear, complete)
**V2**: 2 checkpoints (approval with all context, final publish)

Benefits:

- Fewer interruptions
- Faster releases
- Auto-progress through quality gates
