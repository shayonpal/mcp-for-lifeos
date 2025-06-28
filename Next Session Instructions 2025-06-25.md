# Next Session Instructions - June 25, 2025

## Session Summary
- Duration: ~1 hour (7:00 PM - 8:00 PM EST)
- Main focus: Issue management and daily note workflow bug analysis
- Issues created: 5 new GitHub issues (#86-90)

## Current State
- Branch: master
- Uncommitted changes: analytics/usage-metrics.json (auto-updated during session)
- Work in progress: Daily note workflow bug fixes

## Completed Today
- ✅ Analyzed daily note workflow issues from user feedback
- ✅ Created 5 focused GitHub issues for specific bugs (#86-90)
- ✅ Provided root cause analysis for each issue
- ✅ Set appropriate priorities (P1 for core issues, P2 for UX improvements)

## Created Issues Priority Order
1. **#86** - tp-daily template not applied consistently (P1)
2. **#87** - Incorrect date resolution for "today's daily note" (P1) 
3. **#88** - Tasks added to wrong section instead of "# Day's Notes" (P1)
4. **#89** - Tasks missing creation date notation (➕ YYYY-MM-DD) (P2)
5. **#90** - Tasks inserted at top instead of bottom (P2)

## Next Priority
1. **Fix failing integration tests** - Tool parity tests are timing out, blocking development
2. **Work on Issue #27** - Add faster editing methods for large notes (P1)
3. **Start daily note workflow fixes** - Begin with #86 (template application)

## Important Context
- Common thread: Tools don't fully understand tp-daily template structure
- Integration tests failing with timeouts - needs investigation
- Analytics system working and collecting data properly
- User experiencing multiple daily note workflow issues affecting productivity

## Pending Tasks from Todo List
- Fix failing integration tests (timeouts in tool-parity.test.ts) - HIGH
- Work on Issue #27: Add faster editing methods for large notes - HIGH  
- Commit analytics usage-metrics.json changes - MEDIUM
- Sync Claude Code slash commands Mac Mini → MacBook Air - MEDIUM

## Commands to Run
```bash
# Continue where left off
cd /Users/shayon/DevProjects/mcp-for-lifeos
git status

# Check test failures
npm test

# Add issues to GitHub Project (if auth fixed)
gh auth refresh -s read:project --hostname github.com
gh project list

# Start with template issue investigation
grep -r "tp-daily" src/
```

## GitHub Issues Created This Session
- [#86](https://github.com/shayonpal/mcp-for-lifeos/issues/86) - Template application bug
- [#87](https://github.com/shayonpal/mcp-for-lifeos/issues/87) - Date resolution bug  
- [#88](https://github.com/shayonpal/mcp-for-lifeos/issues/88) - Task section placement bug
- [#89](https://github.com/shayonpal/mcp-for-lifeos/issues/89) - Task date notation bug
- [#90](https://github.com/shayonpal/mcp-for-lifeos/issues/90) - Task insertion order bug

## Technical Notes
- Need to investigate template loading logic in create_note/edit_note tools
- Date parsing may have timezone issues with date-fns
- Section detection algorithm needs review for template structure
- Task formatting missing metadata appending
- Insert position logic defaults to beginning instead of end