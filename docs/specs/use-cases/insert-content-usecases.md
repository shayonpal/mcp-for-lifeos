# Insert Content Tool - Comprehensive Use Cases

## Overview

The `insert_content` tool needs to handle various content insertion scenarios in markdown notes. This document catalogs all possible use cases to ensure comprehensive coverage.

## 1. Heading-Based Insertion Use Cases

### 1.1 Insert Immediately After Heading

**Intent**: Add content right after the heading line, before any existing content

```markdown
## Project Status
[INSERT HERE: "Last updated: 2024-01-15"]
Current progress: 75% complete
```

**Use cases**:

- Adding timestamps
- Adding brief descriptions
- Adding metadata

### 1.2 Insert at End of Section

**Intent**: Add content at the end of a section, before the next heading

```markdown
## Daily Tasks
- [ ] Morning standup
- [ ] Code review
[INSERT HERE: "- [ ] Deploy to staging"]

## Notes
```

**Use cases**:

- Appending to task lists
- Adding final thoughts to a section
- Adding conclusions

### 1.3 Insert Within Existing List

**Intent**: Continue or merge with an existing list structure

```markdown
## Shopping List
- Milk
- Bread
[INSERT HERE: "- Eggs" - maintaining list format]
- Butter
```

**Use cases**:

- Adding items to ordered/unordered lists
- Maintaining list hierarchy and formatting
- Inserting at specific positions in lists

### 1.4 Insert Between Paragraphs

**Intent**: Add content between existing paragraphs with proper spacing

```markdown
## Meeting Notes
First topic discussed was budget.

[INSERT HERE: "Second topic was timeline."]

Final decisions were recorded.
```

**Use cases**:

- Adding forgotten paragraphs
- Inserting clarifications
- Adding examples

### 1.5 Insert in Empty Section

**Intent**: Add first content to an empty section

```markdown
## Resources
[INSERT HERE: "- [Official Docs](https://example.com)"]

## References
```

**Use cases**:

- Populating empty templates
- Starting new sections
- Initial content creation

## 2. Block Reference Use Cases

### 2.1 Insert Annotation After Block

**Intent**: Add explanatory content after a referenced block

```markdown
This is the main decision. ^decision-2024

[INSERT HERE: "Rationale: Based on Q4 analysis"]
```

**Use cases**:

- Adding explanations to referenced content
- Providing context for linked blocks
- Adding metadata to specific paragraphs

### 2.2 Insert Update Before Block

**Intent**: Add status updates or modifications before referenced content

```markdown
[INSERT HERE: "UPDATE (2024-01-15): Revised based on feedback"]

Original proposal: Use microservices ^proposal-v1
```

**Use cases**:

- Adding update notices
- Inserting warnings or caveats
- Prepending version information

## 3. Pattern-Based Use Cases

### 3.1 Inline Insertion

**Intent**: Insert content within a line at a specific pattern

```markdown
Attendees: John, Jane[INSERT HERE: ", Bob"]
Status: In Progress[INSERT HERE: " (75% complete)"]
```

**Use cases**:

- Appending to metadata fields
- Extending inline lists
- Adding inline annotations

### 3.2 Replace Pattern

**Intent**: Find pattern and replace/modify it

```markdown
Status: [PENDING][INSERT/REPLACE: "COMPLETED"]
Last Updated: [DATE][INSERT/REPLACE: "2024-01-15"]
```

**Use cases**:

- Updating template placeholders
- Modifying status fields
- Filling in blanks

### 3.3 Multi-line Pattern Context

**Intent**: Insert content in relation to multi-line patterns

```markdown
```yaml
tags:
  - project
  - active
[INSERT HERE: "  - priority-high"]
```

```
**Use cases**:
- Adding to YAML frontmatter
- Modifying code blocks
- Extending structured data

## 4. List-Specific Use Cases

### 4.1 Nested List Insertion
**Intent**: Insert items maintaining proper nesting level
```markdown
- Project A
  - Task 1
  - Task 2
  [INSERT HERE: "- Task 3" with proper indentation]
- Project B
```

### 4.2 Checkbox List Continuation

**Intent**: Add items maintaining checkbox format

```markdown
## TODO
- [x] Setup environment
- [ ] Write tests
[INSERT HERE: "- [ ] Document API"]
```

### 4.3 Numbered List Insertion

**Intent**: Insert items with automatic renumbering

```markdown
1. First step
2. Second step
[INSERT HERE: "3. Third step"]
4. Fourth step (should become 4 automatically)
```

## 5. Table Use Cases

### 5.1 Add Table Row

**Intent**: Insert new row in markdown table

```markdown
| Name | Status |
|------|--------|
| Alice | Active |
[INSERT HERE: "| Bob | Pending |"]
| Charlie | Done |
```

### 5.2 Add Table Column

**Intent**: More complex - add column to existing table

```markdown
| Name | Status [INSERT COLUMN: "| Priority"] |
|------|--------[INSERT: "|----------|"] |
| Alice | Active [INSERT: "| High"] |
```

## 6. Code Block Use Cases

### 6.1 Insert Within Code Block

**Intent**: Add code maintaining language context

```javascript
function process() {
  console.log("Start");
  [INSERT HERE: "// Processing logic"]
  console.log("End");
}
```

### 6.2 Insert Between Code Blocks

**Intent**: Add explanation between code examples

```python
# Example 1
print("Hello")
```

[INSERT HERE: "The above prints a greeting. Now let's try with a name:"]

```python
# Example 2
print("Hello, Alice")
```

## 7. Edge Cases and Complex Scenarios

### 7.1 Multiple Matching Headings

**Challenge**: Document has multiple "## Notes" sections
**Solution Options**:

- Use occurrence index: `{heading: "## Notes", occurrence: 2}`
- Use additional context: `{heading: "## Notes", afterPattern: "Meeting"}`
- Use full path: `{heading: "## Project A/## Notes"}`

### 7.2 Dynamic Section Boundaries

**Challenge**: Section end is not clearly defined

```markdown
## Tasks
- Task 1
- Task 2

Some random note here

Another paragraph
## Next Section
```

**Questions**: Where does the Tasks section end?

### 7.3 Mixed Content Types

**Challenge**: Section contains multiple content types

```markdown
## Project Update
Status: Green

Progress:
- Frontend: 90%
- Backend: 60%

Next steps include deployment planning.

| Phase | Date |
|-------|------|
| Beta | Jan 20 |
```

### 7.4 Formatting Preservation

**Challenge**: Maintaining consistent formatting

- Indentation levels
- List markers (-, *, +, 1.)
- Spacing conventions
- Line endings

### 7.5 Special Characters and Escaping

**Challenge**: Content or patterns contain special characters

```markdown
## FAQ: What's New?
[INSERT after heading containing '?']

Code: `status = "in-progress"`
[INSERT in line containing backticks]
```

## 8. Intent Clarification Strategies

### 8.1 Explicit Intent Parameters

```javascript
{
  target: { heading: "## Tasks" },
  intent: "append-to-list" | "end-of-section" | "after-heading" | "smart"
}
```

### 8.2 Context Clues

```javascript
{
  target: { heading: "## Tasks" },
  content: "- [ ] New task",  // Dash indicates list continuation
  mergeWithExisting: true
}
```

### 8.3 Boundary Markers

```javascript
{
  target: { 
    heading: "## Tasks",
    untilPattern: "## " // Stop at next heading
  }
}
```

## 9. Implementation Priorities

### Phase 1 - Core Improvements

1. Smart list detection and continuation
2. Section boundary detection
3. Proper spacing for different content types

### Phase 2 - Advanced Features

1. Multiple match handling
2. Complex pattern matching
3. Format preservation

### Phase 3 - Intelligence Layer

1. Content-aware insertion
2. Format auto-detection
3. Merge strategies

## 10. User Experience Considerations

### 10.1 Sensible Defaults

- List items continue lists
- Paragraphs get proper spacing
- Code maintains indentation

### 10.2 Override Options

- Force specific spacing
- Ignore format detection
- Manual positioning

### 10.3 Error Prevention

- Warn about ambiguous targets
- Validate format consistency
- Preview changes option

## Issue #29 Acceptance Criteria Use Cases

These specific use cases were mentioned in the acceptance criteria and must be fully supported:

### AC1: Adding Daily Notes Entries Under Specific Sections

**Scenario**: User wants to add entries to their daily note under the appropriate heading

```markdown
# 2024-01-15

## Morning Thoughts
Had a great idea about the project architecture.

## Today's Tasks
- [x] Morning standup
- [ ] Code review
[WANT TO INSERT: "- [ ] Deploy to staging"]

## Meeting Notes
[EMPTY - might want to add content here]

## Reflections
```

**Requirements**:

- Find the right section (e.g., "Today's Tasks")
- Append to existing task list maintaining format
- Handle empty sections gracefully
- Preserve checkbox format

### AC2: Inserting Meeting Notes Under Relevant Project Headings

**Scenario**: Add meeting notes to a project document under the correct heading

```markdown
# Project Alpha

## Overview
This project aims to...

## Timeline
Q1 2024 - Q2 2024

## Meeting Notes
### 2024-01-10
Discussed initial requirements

[WANT TO INSERT: "### 2024-01-15\nReviewed architecture decisions..."]

## Resources
```

**Requirements**:

- Insert at end of Meeting Notes section
- Maintain heading hierarchy
- Add proper spacing between meetings
- Handle date-based subheadings

### AC3: Appending Task Items to Existing Task Lists

**Scenario**: Add new tasks to an existing task list

```markdown
## Sprint Tasks
- [x] Setup CI/CD pipeline
- [x] Create database schema
- [ ] Write API endpoints
- [ ] Add authentication
[WANT TO INSERT: "- [ ] Write tests\n- [ ] Update documentation"]

## Completed Tasks
```

**Requirements**:

- Detect task list format (checkbox)
- Continue at the end of the current list
- Stop before next section/heading
- Maintain list marker consistency

### AC4: Adding References or Citations in Appropriate Document Sections

**Scenario**: Insert citations or references in a research note

```markdown
# Research Note

## Summary
The study shows significant improvements...

## Methodology
We used a controlled experiment... [1]

## Results
The data indicates... [2]

## References
[1] Smith et al., 2023
[2] Johnson, 2024
[WANT TO INSERT: "[3] Williams & Brown, 2024"]

## Appendix
```

**Requirements**:

- Detect reference format
- Continue numbering sequence
- Insert at end of References section
- Handle various citation formats

### Implementation Priority for AC Use Cases

1. **Task List Appending** (AC3) - Most common use case
2. **Daily Notes Sections** (AC1) - Core LifeOS workflow
3. **Meeting Notes** (AC2) - Project management need  
4. **References** (AC4) - Academic/research use case

## Conclusion

The insert_content tool needs to evolve from simple line-based insertion to understanding document structure and user intent. The key is balancing intelligent defaults with explicit control options. The acceptance criteria use cases provide clear targets for the most important improvements needed.
