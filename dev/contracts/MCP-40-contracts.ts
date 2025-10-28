/**
 * Implementation contracts for Linear Issue: MCP-40
 * Issue: Add TypeScript interfaces for tool inputs to improve type safety
 *
 * These contracts define TypeScript interfaces for 3 MCP tools that currently
 * lack type definitions, improving compile-time type safety and IDE autocomplete.
 *
 * DESIGN DECISIONS:
 * - Extend existing src/types.ts rather than creating new file
 * - Reuse Tool Router interfaces (UniversalSearchOptions, SmartCreateNoteOptions, UniversalListOptions)
 * - Use "Input" suffix for new interfaces (e.g., EditNoteInput)
 * - Create separate interfaces for nested objects (e.g., InsertContentTarget)
 * - Add JSDoc @see comments linking to JSON Schema definitions
 * - Manual maintenance acceptable (no schema generation tooling)
 *
 * @see Linear Issue: https://linear.app/agilecode-studio/issue/MCP-40
 * @see Planning: Phase 01-plan completed with tech-expert and codex validation
 */

// ============================================================================
// FILE ORGANIZATION CONTRACT
// ============================================================================

/**
 * Contract: Extend src/types.ts with new interfaces
 *
 * Current state: src/types.ts has 72 lines with:
 * - LifeOSConfig, YAMLFrontmatter, LifeOSNote
 * - SearchOptions, NoteTemplate
 * - CONTENT_TYPES, FOLDERS constants
 *
 * New additions: 6 interfaces (~68 lines)
 * Final size: ~140 lines
 *
 * Organization:
 * 1. Add TODO comment about future split
 * 2. Add section marker: "// ============================================================================"
 * 3. Add header comment: "// TOOL INPUT INTERFACES"
 * 4. Add interfaces in logical groups (edit, insert, move)
 */

// TODO: Plan eventual split to types/tool-inputs.ts if file becomes unwieldy

// ============================================================================
// TOOL INPUT INTERFACES
// ============================================================================

/**
 * Input interface for edit_note tool
 * @see src/index.ts line 456 for JSON Schema definition
 */
export interface EditNoteInput {
  /** Path to the note file (absolute or relative to vault) */
  path?: string;

  /** Note title (alternative to path) */
  title?: string;

  /** New content (optional - preserves existing if not provided) */
  content?: string;

  /** Frontmatter fields to update (merged with existing) */
  frontmatter?: EditNoteFrontmatter;

  /** Update mode: merge (default) or replace frontmatter */
  mode?: 'merge' | 'replace';
}

/**
 * Frontmatter structure for edit_note tool
 * Subset of YAMLFrontmatter with editable fields only
 */
export interface EditNoteFrontmatter {
  /** Content type */
  contentType?: string;

  /** Category */
  category?: string;

  /** Sub-category */
  subCategory?: string;

  /** Tags array */
  tags?: string[];

  /** Source URL */
  source?: string;

  /** People mentioned */
  people?: string[];
}

/**
 * Input interface for insert_content tool
 * @see src/index.ts line 776 for JSON Schema definition
 */
export interface InsertContentInput {
  /** Path to the note file (absolute or relative to vault) */
  path?: string;

  /** Note title (alternative to path) */
  title?: string;

  /** Content to insert (required) */
  content: string;

  /** Target location for insertion (required) */
  target: InsertContentTarget;

  /** Where to insert content relative to target (default: after) */
  position?: 'before' | 'after' | 'append' | 'prepend' | 'end-of-section';

  /** Ensure proper line breaks around inserted content (default: true) */
  ensureNewline?: boolean;
}

/**
 * Target location structure for insert_content tool
 * One of the following must be specified
 */
export interface InsertContentTarget {
  /** Heading text to target (e.g., "## Today's Tasks") */
  heading?: string;

  /** Block reference ID to target (e.g., "^block-id") */
  blockRef?: string;

  /** Text pattern to search for */
  pattern?: string;

  /** Specific line number (1-based) */
  lineNumber?: number;
}

/**
 * Input interface for move_items tool
 * @see src/index.ts line 733 for JSON Schema definition
 */
export interface MoveItemsInput {
  /** Array of items to move (use this OR item, not both) */
  items?: MoveItemType[];

  /** Single item path to move (use this OR items, not both) */
  item?: string;

  /** Target folder path (relative to vault root) - required */
  destination: string;

  /** Create destination folder if it doesn't exist (default: false) */
  createDestination?: boolean;

  /** Overwrite existing files in destination (default: false) */
  overwrite?: boolean;

  /** When moving folders, merge with existing folder of same name (default: false) */
  mergeFolders?: boolean;
}

/**
 * Item structure for move_items tool batch operations
 */
export interface MoveItemType {
  /** Path to note or folder */
  path: string;

  /** Item type (auto-detected if not specified) */
  type?: 'note' | 'folder';
}

// ============================================================================
// INTEGRATION CONTRACTS
// ============================================================================

/**
 * Tool Router Integration
 *
 * The following tools already have interfaces in src/tool-router.ts:
 * - search → UniversalSearchOptions (existing - DO NOT duplicate)
 * - create_note_smart → SmartCreateNoteOptions (existing - DO NOT duplicate)
 * - list → UniversalListOptions (existing - DO NOT duplicate)
 *
 * New interfaces defined above for:
 * - edit_note → EditNoteInput, EditNoteFrontmatter
 * - insert_content → InsertContentInput, InsertContentTarget
 * - move_items → MoveItemsInput, MoveItemType
 *
 * Legacy tools (11 tools) will be hidden via MCP-60 config flag - no interfaces needed
 */

// ============================================================================
// IMPLEMENTATION CONTRACT
// ============================================================================

/**
 * Phase 1: Create Schema → Interface Mapping Table
 *
 * Tool: edit_note (src/index.ts:456-495)
 * ├─ path?: string → EditNoteInput.path
 * ├─ title?: string → EditNoteInput.title
 * ├─ content?: string → EditNoteInput.content
 * ├─ frontmatter?: object → EditNoteFrontmatter
 * │  ├─ contentType?: string
 * │  ├─ category?: string
 * │  ├─ subCategory?: string
 * │  ├─ tags?: string[]
 * │  ├─ source?: string
 * │  └─ people?: string[]
 * └─ mode?: 'merge' | 'replace' → EditNoteInput.mode
 *
 * Tool: insert_content (src/index.ts:776-818)
 * ├─ path?: string → InsertContentInput.path
 * ├─ title?: string → InsertContentInput.title
 * ├─ content: string (required) → InsertContentInput.content
 * ├─ target: object (required) → InsertContentTarget
 * │  ├─ heading?: string
 * │  ├─ blockRef?: string
 * │  ├─ pattern?: string
 * │  └─ lineNumber?: number
 * ├─ position?: enum → InsertContentInput.position
 * └─ ensureNewline?: boolean → InsertContentInput.ensureNewline
 *
 * Tool: move_items (src/index.ts:733-774)
 * ├─ items?: array → MoveItemsInput.items (MoveItemType[])
 * │  ├─ path: string (required)
 * │  └─ type?: 'note' | 'folder'
 * ├─ item?: string → MoveItemsInput.item
 * ├─ destination: string (required) → MoveItemsInput.destination
 * ├─ createDestination?: boolean → MoveItemsInput.createDestination
 * ├─ overwrite?: boolean → MoveItemsInput.overwrite
 * └─ mergeFolders?: boolean → MoveItemsInput.mergeFolders
 */

/**
 * Phase 2: Add Interfaces to src/types.ts
 *
 * Location: After existing interfaces, before CONTENT_TYPES constant
 *
 * Steps:
 * 1. Add TODO comment (line ~73)
 * 2. Add section marker and header comment
 * 3. Add EditNoteInput interface with JSDoc
 * 4. Add EditNoteFrontmatter interface
 * 5. Add InsertContentInput interface with JSDoc
 * 6. Add InsertContentTarget interface
 * 7. Add MoveItemsInput interface with JSDoc
 * 8. Add MoveItemType interface
 *
 * Validation: npm run typecheck (should pass)
 */

/**
 * Phase 3: Update Tool Handlers in src/index.ts
 *
 * Handler: edit_note (src/index.ts ~line 1700)
 * Current: const args = request.params.arguments as any;
 * Updated: const args = request.params.arguments as EditNoteInput;
 *
 * Handler: insert_content (src/index.ts ~line 2000)
 * Current: const args = request.params.arguments as any;
 * Updated: const args = request.params.arguments as InsertContentInput;
 *
 * Handler: move_items (src/index.ts ~line 2200)
 * Current: const args = request.params.arguments as any;
 * Updated: const args = request.params.arguments as MoveItemsInput;
 *
 * Add import at top of file:
 * import { EditNoteInput, InsertContentInput, MoveItemsInput } from './types.js';
 *
 * Validation after each change: npm run typecheck
 */

// ============================================================================
// TESTING CONTRACT
// ============================================================================

/**
 * Test Strategy (Post-Implementation Validation)
 *
 * Compile-time Validation:
 * - npm run typecheck confirms all interfaces compile
 * - No TypeScript errors in src/types.ts or src/index.ts
 *
 * Test Fixture Handling:
 * - Current test pass rate: 89.6% (28 failures in Test Infrastructure Stabilization)
 * - MCP-40 affects different code areas (tool handlers) than failing tests
 * - Expect no new test failures
 * - If fixtures break: update to use typed interfaces OR explicit casting
 *
 * Manual Testing (by Claude via MCP server):
 * - Rebuild project: npm run build
 * - Restart MCP session
 * - Test edit_note with various input combinations
 * - Test insert_content with heading, pattern, lineNumber targets
 * - Test move_items with single item and batch operations
 * - Verify autocomplete and type safety in IDE
 */

// ============================================================================
// BEHAVIORAL CONTRACTS
// ============================================================================

/**
 * MUST:
 * - Match JSON Schema definitions exactly (field names, types, optionality)
 * - Include JSDoc comments with @see tags to schema locations
 * - Use consistent naming (Input suffix, PascalCase)
 * - Maintain optional vs required field semantics from JSON Schema
 * - Pass npm run typecheck without errors
 *
 * MUST NOT:
 * - Duplicate Tool Router interfaces (UniversalSearchOptions, etc.)
 * - Change runtime behavior (type-only changes)
 * - Add new dependencies
 * - Modify JSON Schema definitions
 * - Create interfaces for legacy tools (will be hidden via MCP-60)
 *
 * SHOULD:
 * - Create nested interfaces for complex objects
 * - Add TODO comment for future file split consideration
 * - Use section markers for organization
 * - Document interface purpose in JSDoc
 * - Link to JSON Schema with line numbers
 */

// ============================================================================
// SCHEMA DRIFT MITIGATION
// ============================================================================

/**
 * Manual Maintenance Strategy
 *
 * Problem: JSON Schema may change but interfaces not updated
 *
 * Mitigations:
 * 1. JSDoc @see tags create traceable links to schema locations
 * 2. Schema → interface mapping table documented in contracts
 * 3. npm run typecheck catches type mismatches
 * 4. Code review checklist: schema changes must update interfaces
 * 5. Pre-commit hook option: script to compare schema keys vs interface keys
 *
 * Future Enhancement:
 * - Optional script in /scripts/ for manual regeneration from JSON Schema
 * - Only add if manual updates become burdensome
 */

// ============================================================================
// VALIDATION CHECKLIST
// ============================================================================

/**
 * Contract Completeness Checklist:
 *
 * ✅ All input parameters defined with types
 * ✅ Output structure specification (N/A - type safety on inputs only)
 * ✅ Error conditions documented (N/A - no error handling changes)
 * ✅ Integration points identified (Tool Router, src/types.ts, src/index.ts)
 * ✅ MCP protocol compliance (type-only, no protocol changes)
 * ✅ Extends existing interfaces where appropriate (reuses Tool Router interfaces)
 * ✅ JSDoc comments explain purpose and behavior
 * ✅ Nested object interfaces created (EditNoteFrontmatter, InsertContentTarget, MoveItemType)
 * ✅ File organization strategy defined (extend types.ts with TODO for future split)
 * ✅ Schema drift mitigation documented
 * ✅ Testing strategy defined
 */

/**
 * Dependencies Validation:
 * - No new packages required ✅
 * - No updates to existing packages ✅
 * - TypeScript version: 5.0.0 (current) ✅
 */

/**
 * Strategic Alignment:
 * - Current Focus: MCP-40 is next in queue after MCP-39 ✅
 * - Cycle 8 theme: MCP Improvements (aligned) ✅
 * - No ADR conflicts (no architectural decisions) ✅
 * - Related work: MCP-60 (hide legacy tools) follows this ✅
 */
