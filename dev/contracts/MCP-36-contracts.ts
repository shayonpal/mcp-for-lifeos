/**
 * Implementation Contracts for Linear Issue: MCP-36
 * Issue: Enhance tool descriptions with WHEN TO USE examples and return format documentation
 *
 * These contracts define the expected structure and content requirements for
 * enhanced MCP tool descriptions. This is a METADATA-ONLY enhancement with
 * zero runtime behavior changes.
 *
 * **Implementation Scope**: Inline modification of tool.description strings in src/index.ts
 * **Validation Method**: Manual review + TypeScript compilation + Manual testing in Claude Desktop
 * **Files Modified**: src/index.ts (7 tool descriptions only)
 */

// ============================================================================
// DESCRIPTION STRUCTURE CONTRACT
// ============================================================================

/**
 * Enhanced tool description structure pattern (plain text, NOT markdown)
 *
 * All 7 consolidated tools MUST follow this exact structure:
 *
 * Line 1: [Primary purpose sentence] [Consolidation note if applicable]
 * Line 2: (blank line for spacing)
 * Line 3: WHEN TO USE:
 * Line 4-6: - [Scenario 1]: [specific parameters/approach]
 * Line 5-7: - [Scenario 2]: [specific parameters/approach]
 * Line 6-8: - [Scenario 3]: [specific parameters/approach]
 * Line 7-9: (blank line for spacing)
 * Line 8-10: RETURNS: [Response structure with key fields]
 *
 * Character Target: 200-400 characters (4-8 lines)
 * Format: Plain text with strategic newlines (NO markdown formatting)
 */
export interface EnhancedToolDescriptionContract {
  /** Primary purpose sentence describing what the tool does */
  purposeStatement: string;

  /** Optional consolidation note explaining which legacy tools this replaces */
  consolidationNote?: string;

  /** Array of 2-3 concrete usage scenarios with specific parameters */
  whenToUseScenarios: WhenToUseScenario[];

  /** Description of the response structure and key fields returned */
  returnsDescription: string;

  /** Total character count (must be 200-400) */
  characterCount: number;
}

/**
 * Individual "WHEN TO USE" scenario structure
 */
export interface WhenToUseScenario {
  /** Brief description of the scenario/use case */
  scenario: string;

  /** Specific parameters or approach to use for this scenario */
  parameters: string;
}

// ============================================================================
// TOOL-SPECIFIC CONTRACTS
// ============================================================================

/**
 * Contract for `search` tool enhanced description
 * Source: docs/tools/search.md (TL;DR line 11, usage examples lines 150-250)
 */
export interface SearchToolDescriptionContract extends EnhancedToolDescriptionContract {
  toolName: "search";

  whenToUseScenarios: [
    {
      scenario: "Find notes by content/metadata";
      parameters: 'mode="advanced", query="meeting notes"';
    },
    {
      scenario: "Recent activity discovery";
      parameters: 'mode="recent", days=7';
    },
    {
      scenario: "File pattern matching";
      parameters: 'mode="pattern", pattern="**/*recipe*.md"';
    }
  ];

  returnsDescription: "Array of SearchResult objects with path, title, excerpt, relevance score, and frontmatter metadata";
}

/**
 * Contract for `create_note_smart` tool enhanced description
 * Source: docs/tools/create_note_smart.md (TL;DR lines 8-10, template detection lines 45-80)
 */
export interface CreateNoteSmartDescriptionContract extends EnhancedToolDescriptionContract {
  toolName: "create_note_smart";

  whenToUseScenarios: [
    {
      scenario: "Restaurant/person/article auto-detection";
      parameters: 'auto_template=true, title includes keywords';
    },
    {
      scenario: "Explicit template selection";
      parameters: 'template="tpl-restaurant", customData={...}';
    },
    {
      scenario: "Manual note creation without templates";
      parameters: "auto_template=false, content provided";
    }
  ];

  returnsDescription: "Success message with created note path and applied template name";
}

/**
 * Contract for `list` tool enhanced description
 * Source: docs/tools/list.md (TL;DR, type-specific examples)
 */
export interface ListToolDescriptionContract extends EnhancedToolDescriptionContract {
  toolName: "list";

  whenToUseScenarios: [
    {
      scenario: "Browse vault folder structure";
      parameters: 'type="folders", path="Projects"';
    },
    {
      scenario: "Discover available templates";
      parameters: 'type="templates"';
    },
    {
      scenario: "List daily notes";
      parameters: 'type="daily_notes", limit=10';
    }
  ];

  returnsDescription: "Type-specific arrays: folder paths, template list, daily note paths, or YAML property names";
}

/**
 * Contract for `read_note` tool enhanced description
 * Source: docs/tools/read_note.md ("When to Use read_note" section lines 211-227)
 */
export interface ReadNoteDescriptionContract extends EnhancedToolDescriptionContract {
  toolName: "read_note";

  whenToUseScenarios: [
    {
      scenario: "Before editing";
      parameters: "Read to understand current state";
    },
    {
      scenario: "Content export";
      parameters: "Extract for external processing";
    },
    {
      scenario: "Metadata verification";
      parameters: "Check frontmatter fields and tags";
    }
  ];

  returnsDescription: "Formatted text with complete YAML frontmatter, Obsidian link, and full note content";
}

/**
 * Contract for `edit_note` tool enhanced description
 * Source: docs/tools/edit_note.md (update modes, common use cases, frontmatter mapping)
 */
export interface EditNoteDescriptionContract extends EnhancedToolDescriptionContract {
  toolName: "edit_note";

  whenToUseScenarios: [
    {
      scenario: "Update frontmatter fields";
      parameters: 'frontmatter={tags: [...]}, mode="merge"';
    },
    {
      scenario: "Replace entire note content";
      parameters: "content provided, mode optional";
    },
    {
      scenario: "Selective field editing";
      parameters: 'frontmatter updates specific fields only';
    }
  ];

  returnsDescription: "Success message with summary of updated frontmatter fields and content changes";
}

/**
 * Contract for `insert_content` tool enhanced description
 * Source: docs/tools/insert_content.md (targeting methods, position options, daily notes)
 */
export interface InsertContentDescriptionContract extends EnhancedToolDescriptionContract {
  toolName: "insert_content";

  whenToUseScenarios: [
    {
      scenario: "Append to daily notes";
      parameters: 'target={heading: "Day\'s Notes"}, position="end-of-section"';
    },
    {
      scenario: "Insert after specific heading";
      parameters: 'target={heading: "## Tasks"}, position="after"';
    },
    {
      scenario: "Target by text pattern";
      parameters: 'target={pattern: "TODO"}, position="before"';
    }
  ];

  returnsDescription: "Success message with insertion location (heading/line) and content preview";
}

/**
 * Contract for `get_daily_note` tool enhanced description
 * Source: docs/tools/get_daily_note.md (date parsing examples, response formats)
 */
export interface GetDailyNoteDescriptionContract extends EnhancedToolDescriptionContract {
  toolName: "get_daily_note";

  whenToUseScenarios: [
    {
      scenario: "Today's daily note";
      parameters: 'date omitted or date="today"';
    },
    {
      scenario: "Relative date references";
      parameters: 'date="yesterday" or date="tomorrow"';
    },
    {
      scenario: "Natural language dates";
      parameters: 'date="last Monday" or date="2025-10-15"';
    }
  ];

  returnsDescription: "Daily note path, creation status (created/existed), and applied template name";
}

// ============================================================================
// IMPLEMENTATION CONSTRAINTS
// ============================================================================

/**
 * Implementation rules that MUST be followed
 */
export const IMPLEMENTATION_CONSTRAINTS = {
  /** Only these 7 tools receive enhanced descriptions */
  TOOLS_TO_ENHANCE: [
    "search",
    "create_note_smart",
    "list",
    "read_note",
    "edit_note",
    "insert_content",
    "get_daily_note"
  ] as const,

  /** Legacy alias tools MUST NOT be modified (intentionally minimal) */
  TOOLS_TO_PRESERVE: [
    "search_notes",
    "advanced_search",
    "quick_search",
    "search_by_content_type",
    "search_recent",
    "find_notes_by_pattern",
    "create_note_from_template",
    "list_folders",
    "list_daily_notes",
    "list_templates",
    "list_yaml_properties"
    // ... 9 more legacy aliases
  ] as const,

  /** File to modify */
  TARGET_FILE: "src/index.ts" as const,

  /** Character limits for descriptions */
  MIN_CHARACTERS: 200,
  MAX_CHARACTERS: 400,

  /** Line count range */
  MIN_LINES: 4,
  MAX_LINES: 8,

  /** Required structure elements */
  REQUIRED_ELEMENTS: {
    purposeStatement: true,
    whenToUseSection: true,
    scenarios: { min: 2, max: 3 },
    returnsSection: true
  },

  /** Formatting rules */
  FORMATTING: {
    useMarkdown: false, // Plain text only
    useNewlines: true, // Strategic spacing
    bulletCharacter: "-", // Hyphens for scenarios
    sectionLabels: ["WHEN TO USE:", "RETURNS:"] as const
  }
} as const;

// ============================================================================
// VALIDATION CONTRACTS
// ============================================================================

/**
 * Validation checklist for implementation review
 */
export interface DescriptionValidationChecklist {
  /** All 7 tools have enhanced descriptions */
  allToolsEnhanced: boolean;

  /** All descriptions follow identical structure pattern */
  consistentStructure: boolean;

  /** All descriptions within 200-400 character range */
  characterCountValid: boolean;

  /** All descriptions have 2-3 "WHEN TO USE" scenarios */
  scenariosValid: boolean;

  /** All descriptions have "RETURNS" section */
  returnsDocumented: boolean;

  /** All descriptions use plain text (no markdown) */
  plainTextOnly: boolean;

  /** Legacy alias descriptions unchanged */
  legacyAliasesPreserved: boolean;

  /** TypeScript compilation successful */
  typeCheckPassed: boolean;
}

// ============================================================================
// CONTENT EXTRACTION CONTRACTS
// ============================================================================

/**
 * Source documentation mapping for content extraction
 */
export const CONTENT_SOURCES = {
  search: {
    file: "docs/tools/search.md",
    tldr: { startLine: 11, endLine: 11 },
    usageExamples: { startLine: 150, endLine: 250 },
    responseFormat: { section: "Response Format" }
  },
  create_note_smart: {
    file: "docs/tools/create_note_smart.md",
    tldr: { startLine: 8, endLine: 10 },
    templateDetection: { startLine: 45, endLine: 80 },
    responseFormat: { section: "Response Format" }
  },
  list: {
    file: "docs/tools/list.md",
    tldr: { section: "TL;DR" },
    typeExamples: { section: "Parameters" },
    responseFormat: { section: "Response Format" }
  },
  read_note: {
    file: "docs/tools/read_note.md",
    whenToUse: { startLine: 211, endLine: 227 }, // Ideal template pattern
    responseFormat: { section: "Response Format" }
  },
  edit_note: {
    file: "docs/tools/edit_note.md",
    updateModes: { section: "Update Modes" },
    commonUseCases: { section: "Common Use Cases" },
    responseFormat: { section: "Response Format" }
  },
  insert_content: {
    file: "docs/tools/insert_content.md",
    targetingMethods: { section: "Targeting Methods" },
    positionOptions: { section: "Position Options" },
    responseFormat: { section: "Response Format" }
  },
  get_daily_note: {
    file: "docs/tools/get_daily_note.md",
    dateParsing: { section: "Date Parsing" },
    responseFormat: { section: "Response Format" }
  }
} as const;

// ============================================================================
// TESTING CONTRACTS
// ============================================================================

/**
 * Testing requirements for enhanced descriptions
 */
export interface TestingRequirements {
  /** TypeScript compilation must pass */
  typeCheck: {
    command: "npm run typecheck";
    expectedResult: "zero errors";
  };

  /** Manual testing in Claude Desktop */
  claudeDesktop: {
    scenarios: [
      "Verify tool selection accuracy with real-world prompts",
      "Confirm AI understands return formats",
      "Test improved tool selection vs alternatives"
    ];
  };

  /** Optional performance testing */
  optional: {
    accuracyTest: {
      command: "npm run test:claude-desktop:accuracy";
      purpose: "Measure AI tool selection improvement before/after";
    };
  };
}

// ============================================================================
// BEHAVIORAL CONTRACTS
// ============================================================================

/**
 * Expected behaviors and guarantees for this implementation
 *
 * MUST:
 * - Modify only tool.description strings in src/index.ts
 * - Follow identical structure pattern for all 7 enhanced descriptions
 * - Extract content from docs/tools/*.md to prevent documentation drift
 * - Use plain text formatting with strategic newlines (NO markdown)
 * - Stay within 200-400 character target per description
 * - Include 2-3 concrete "WHEN TO USE" scenarios with specific parameters
 * - Document "RETURNS" response structure with key fields
 * - Preserve all legacy alias descriptions unchanged
 *
 * MUST NOT:
 * - Modify tool names, inputSchema, or annotations
 * - Change any tool runtime behavior or handler logic
 * - Modify legacy alias tool descriptions
 * - Create new files (except this contracts file)
 * - Add markdown formatting (bold, bullets, code blocks)
 * - Exceed 400 character limit per description
 * - Change tool functionality in any way
 *
 * GUARANTEES:
 * - Zero runtime behavior changes
 * - Full MCP protocol compliance
 * - TypeScript compilation success
 * - Backward compatibility maintained
 * - Universal client compatibility (Claude Desktop, Raycast)
 */
