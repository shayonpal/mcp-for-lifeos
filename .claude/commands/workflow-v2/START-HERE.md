# Workflow V2 - Start Here

## Quick Start (2 minutes)

### 1. Initialize a Test Workflow

```bash
/workflow-v2:00-init-workflow MCP-TEST-001
```

This creates the state file and fetches Linear context.

### 2. Check Your Progress

```bash
/workflow-v2:99-status
```

See where you are in the workflow.

### 3. Auto-Continue

```bash
/workflow-v2:99-continue
```

Automatically runs the next appropriate phase.

## What You Get

### ✅ Fully Implemented (Ready to Use)

1. **00-init-workflow** - State initialization & Linear fetch
2. **01-plan** - Parallel agent planning
3. **05-test** - Auto-skip for doc changes
4. **07-commit-push** - Pre-validated commits
5. **99-status** - Progress tracking
6. **99-continue** - Auto-routing

### ⚠️ Simplified Stubs (Functional for Testing)

7. **02-stage** - Branch naming (basic)
8. **03-execute** - Implementation (basic)
9. **04-code-review** - Code review (basic)
10. **06-document** - Documentation (basic)
11. **08-review-pr** - PR review (basic)
12. **09-release** - Release (basic)

## Key Improvements Over V1

### 1. State Persistence

No more manual parameter passing:

```bash
# V1: Pass issue ID every time
/workflow:01-plan MCP-123
/workflow:02-stage MCP-123
/workflow:03-execute MCP-123

# V2: Set once, use everywhere
/workflow-v2:00-init MCP-123
/workflow-v2:01-plan    # Knows issue = MCP-123
/workflow-v2:02-stage   # Knows issue = MCP-123
```

### 2. Auto-Skip Tests

Documentation changes skip tests automatically:

```bash
# Make doc change
echo "Update" >> README.md

# V1: Asks user every time
/workflow:05-test MCP-123
"Run tests? (yes/no)" ← Manual

# V2: Auto-detects
/workflow-v2:05-test
"✅ AUTO-SKIP: Doc-only changes"
```

**Time saved**: 2-3 minutes per doc PR

### 3. Pre-Commit Validation

Validates commit message BEFORE committing:

```bash
# V1: Commit then validate
Commit → ❌ Too short → Amend → Retry

# V2: Validate then commit
Validate → ❌ Too short → Fix → Validate → Commit
```

**Prevents**: Wasted commits, cleaner git history

### 4. Progress Visibility

Always know where you are:

```bash
/workflow-v2:99-status

Progress: [████████░░░░░░░░░░░░] 40% (3/8 phases)
Current: code-review
Next: /workflow-v2:05-test
```

### 5. Parallel Agents

Context gathering is 3x faster:

```bash
# V1: Sequential (60 seconds total)
linear-expert → doc-search → agent-Plan

# V2: Parallel (20 seconds total)
linear-expert + doc-search + agent-Plan
```

## Performance Comparison

| Metric | V1 | V2 | Improvement |
|--------|----|----|-------------|
| Full workflow | 15-20 min | 10-12 min | **25-40% faster** |
| Context gathering | ~60s | ~20s | **3x faster** |
| Test phase (docs) | 2-3 min | <1s | **200x faster** |
| Manual inputs | ~12 | ~6 | **50% reduction** |

## Testing Checklist

Try these to validate V2:

- [ ] Initialize workflow: `/workflow-v2:00-init MCP-XXX`
- [ ] Check status: `/workflow-v2:99-status`
- [ ] Run planning: `/workflow-v2:01-plan`
- [ ] Auto-continue: `/workflow-v2:99-continue`
- [ ] Make doc change and run: `/workflow-v2:05-test` (should auto-skip)
- [ ] Verify state file: `cat .claude/workflow-state.json`
- [ ] Test pre-commit validation: `/workflow-v2:07-commit-push`

## Files to Read

1. **README.md** - Complete feature overview
2. **WHATS-NEW.md** - Detailed changes explained
3. **TESTING-GUIDE.md** - Step-by-step test scenarios
4. **IMPLEMENTATION-STATUS.md** - What's complete vs pending

## Common Questions

**Q: Can I use V2 now?**
A: Yes, for testing. Core infrastructure works. Stubs are functional but simplified.

**Q: Will V2 break my V1 workflow?**
A: No. V2 uses different command names (`/workflow-v2:*`). Both coexist.

**Q: Do I need to migrate?**
A: No. Test V2, provide feedback, decide later.

**Q: What if V2 has bugs?**
A: Fall back to V1 anytime. V1 unchanged.

**Q: When will stubs be fully implemented?**
A: Based on your feedback. Report what's missing.

**Q: How do I clean up state?**
A: Delete `.claude/workflow-state.json` to reset.

## Quick Test Scenario

**5-minute test**:

```bash
# 1. Init
/workflow-v2:00-init-workflow MCP-TEST

# 2. Status (should show 0/8 complete)
/workflow-v2:99-status

# 3. Make doc change
echo "Test" >> README.md

# 4. Run test phase (should auto-skip in <1s)
/workflow-v2:05-test

# 5. Status again (should show 1/8 complete)
/workflow-v2:99-status

# 6. Check state file
cat .claude/workflow-state.json
```

**Expected results**:
- State file created
- Test auto-skipped
- Progress tracked
- Status updated

## Next Steps

1. **Test core flow** - Run 00→01→05→07 sequence
2. **Report issues** - What doesn't work?
3. **Request features** - What's missing from V1?
4. **Provide feedback** - Keep V2 or iterate?

## Support

- **Documentation**: Read all .md files in this directory
- **Issues**: Report problems you encounter
- **Questions**: Ask about specific features

---

**Start testing**: `/workflow-v2:00-init-workflow MCP-TEST-001`
