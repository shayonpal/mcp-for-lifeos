# Insert Content Implementation Plan

## Acceptance Criteria Alignment

Based on Issue #29, the following requirements must be met:

### ✅ Implemented

- [x] New MCP tool for context-aware content insertion (`insert_content`)
- [x] Support for heading-based targeting (H1-H6)
- [x] Support for block reference targeting
- [x] Position options: before, after, append, prepend
- [x] Error handling for invalid targets
- [x] Integration with existing YAML frontmatter preservation
- [x] Documentation and examples

### ⚠️ Needs Enhancement

- [ ] Preserve existing note formatting and structure (partially implemented - needs improvement for list handling)

## Use Cases from Acceptance Criteria

The issue specifically mentions these use cases that must be supported:

1. **Adding daily notes entries under specific sections**
   - Current: Can insert after heading, but spacing needs improvement
   - Needed: Smart detection of daily note structure

2. **Inserting meeting notes under relevant project headings**
   - Current: Works with basic heading targeting
   - Needed: Better section boundary detection

3. **Appending task items to existing task lists**
   - Current: Can append, but doesn't merge with list format
   - Needed: List continuation logic

4. **Adding references or citations in appropriate document sections**
   - Current: Can insert at specific locations
   - Needed: Smart formatting for references

## Key Design Decisions

### 1. API Design Approach

We have several options for the API:

**Option A: Intent-Based**

```typescript
{
  target: { heading: "## Tasks" },
  intent: "append-to-section" | "merge-with-list" | "after-heading",
  content: "- New task"
}
```

**Option B: Context-Aware with Hints**

```typescript
{
  target: { 
    heading: "## Tasks",
    position: "end", // "start" | "end" | "after-content"
    afterContent?: "specific line",
    beforeContent?: "boundary marker"
  },
  content: "- New task"
}
```

**Option C: Smart Auto-Detection**

```typescript
{
  target: { heading: "## Tasks" },
  content: "- New task",
  smart: true, // Analyzes content and context
  hints: {
    treatAsList: true,
    respectSectionBoundary: true
  }
}
```

### 2. Section Boundary Detection

**Approaches:**

1. **Next Heading**: Section ends at next heading of same or higher level
2. **Blank Line Rule**: Section ends at double blank line
3. **Content Type Change**: Section ends when content type changes (list → paragraph)
4. **Explicit Markers**: User provides end pattern

### 3. List Handling Strategy

**Key Questions:**

- How to detect if we're in a list context?
- Should we auto-continue list formatting?
- How to handle nested lists?
- What about mixed list types in same section?

## Implementation Phases

### Phase 1: Foundation (Current + Improvements)

**Goal**: Make current functionality more intelligent

1. **Improve Heading Insertion**
   - Detect if section is empty
   - Better spacing logic
   - Handle immediate content after heading

2. **Basic List Detection**
   - If inserting after heading and content starts with list marker
   - If next non-empty line is a list item
   - Apply appropriate spacing

3. **Section End Detection**
   - Find next heading of same/higher level
   - Option to insert at section end

**Estimated Effort**: 1-2 days

### Phase 2: Smart Context (Priority)

**Goal**: Understand document structure

1. **List Continuation**
   - Detect existing list format
   - Match indentation
   - Continue numbering
   - Preserve checkbox format

2. **Content Type Detection**
   - Paragraph vs list vs code block
   - Apply appropriate spacing rules
   - Maintain formatting consistency

3. **Advanced Positioning**
   - "end-of-section" support
   - "after-last-list-item" support
   - "between-paragraphs" support

**Estimated Effort**: 2-3 days

### Phase 3: Advanced Features

**Goal**: Handle complex scenarios

1. **Multiple Match Handling**
   - Occurrence parameter
   - Additional context matching
   - Path-based targeting

2. **Format Preservation**
   - Indentation detection
   - Marker style matching
   - Spacing conventions

3. **Complex Structures**
   - Tables
   - Code blocks
   - Nested structures

**Estimated Effort**: 3-5 days

## Priority Matrix

| Use Case | Frequency | Complexity | Priority |
|----------|-----------|------------|----------|
| Add to task list | High | Low | P1 |
| Add to end of section | High | Medium | P1 |
| Insert between paragraphs | Medium | Low | P2 |
| Continue numbered list | Medium | Medium | P2 |
| Insert in empty section | Medium | Low | P1 |
| Multiple heading matches | Low | High | P3 |
| Table manipulation | Low | High | P3 |
| Code block insertion | Low | Medium | P3 |

## Recommended First Implementation

### Enhanced Target API

```typescript
target: {
  heading?: string,
  blockRef?: string,
  pattern?: string,
  lineNumber?: number,
  // New additions:
  position?: "after-heading" | "end-of-section" | "smart",
  sectionBoundary?: "next-heading" | "blank-lines" | string, // pattern
}
```

### Smart Defaults

1. If content starts with list marker and section has lists → continue list
2. If section is empty → minimal spacing
3. If inserting paragraph → ensure blank line separation
4. Detect and preserve indentation

### Example Usage

```typescript
// Add task to end of task list
insert_content({
  title: "Daily Note",
  target: { 
    heading: "## Tasks",
    position: "end-of-section"
  },
  content: "- [ ] New task"
})

// Add paragraph after heading
insert_content({
  title: "Project Doc",
  target: { 
    heading: "## Overview",
    position: "after-heading"
  },
  content: "This section provides context."
})

// Smart insertion (auto-detect)
insert_content({
  title: "Meeting Notes",
  target: { 
    heading: "## Action Items",
    position: "smart"  // Detects list and appends
  },
  content: "- Follow up with client"
})
```

## Next Steps

1. **Decide on API approach** (A, B, or C above)
2. **Implement Phase 1** improvements
3. **Test with real-world scenarios**
4. **Iterate based on usage patterns**
5. **Document behavior clearly**

## Success Criteria

- Users can intuitively add content where they expect
- Common cases (lists, paragraphs) work without configuration
- Advanced cases are possible with explicit parameters
- Formatting is preserved and consistent
- Edge cases fail gracefully with clear errors
