/**
 * TypeScript Contracts for MCP-121: Expose Parsed Instruction Guidance to LLM Clients
 *
 * This file defines interfaces and behavioral contracts for surfacing parsed
 * custom-instruction rules as guidance metadata in MCP tool responses, enabling
 * LLM clients to understand note formatting requirements.
 *
 * SCOPE: Extend InstructionApplicationResult + inject guidance metadata in tool responses
 * DEPENDS ON: MCP-150 (InstructionProcessor APIs)
 * INTEGRATION: Tool handlers (note-handlers.ts, consolidated-handlers.ts, utility-handlers.ts)
 */

// ============================================================================
// GUIDANCE METADATA CONTRACTS
// ============================================================================

/**
 * Concise guidance metadata derived from parsed instruction rules
 * Designed for LLM client consumption with token efficiency
 *
 * Token Budget: ~50-150 tokens per response
 * Fields capped to prevent token bloat:
 * - requiredYAML: max 5 fields
 * - headings: max 3 headings
 * - appliedRules: max 10 rules
 */
export interface NoteGuidanceMetadata {
  /**
   * Note type identifier (e.g., 'daily', 'recipe', 'article', 'person')
   * Derived from InstructionContext.noteType or template detection
   */
  noteType?: string;

  /**
   * Required YAML frontmatter fields for this note type
   * Capped at 5 most important fields to control token usage
   * Example: ['tags', 'date created', 'content type']
   */
  requiredYAML?: string[];

  /**
   * Expected content structure headings
   * Capped at 3 most important headings to control token usage
   * Example: ["Day's Notes", "Tasks", "Reflections"]
   */
  headings?: string[];

  /**
   * Temporal formatting hints (e.g., date format requirements)
   * Concise string guidance for date/time handling
   * Example: "Use YYYY-MM-DD format for daily notes"
   */
  temporalHints?: string;

  /**
   * Applied instruction rules (for debugging/transparency)
   * Capped at 10 most relevant rules to control token usage
   * Example: ['yaml:defaults', 'content:structure', 'naming:format']
   */
  appliedRules?: string[];

  /**
   * Server timezone information for temporal context
   * Format: "Region/City (Abbreviation)"
   * Example: "America/Toronto (EST)"
   */
  timezone?: string;

  /**
   * Optional style guide identifier reference
   * Used for consistent guidance across note types
   * Example: "daily-notes-v1", "recipe-format-v2"
   */
  styleGuideId?: string;
}

// ============================================================================
// EXTENDED INSTRUCTION RESULT CONTRACT
// ============================================================================

/**
 * Extended InstructionApplicationResult to include optional guidance
 *
 * Design Decision (from planning phase):
 * - Guidance included in same result object (not separate helper call)
 * - Simpler handler integration (single method call)
 * - Centralized error handling (guidance failures don't affect tools)
 * - Natural cache coherence (guidance cached with instructions)
 *
 * This extends the existing interface from src/modules/config/instruction-processor.ts
 */
export interface ExtendedInstructionApplicationResult {
  /** The context after instruction application */
  context: any; // InstructionContext type from instruction-processor.ts

  /**
   * Whether any modifications were applied
   * Indicates rules were detected and applied to context
   */
  modified: boolean;

  /**
   * Applied instruction rules (for debugging)
   * Always present, empty array if no rules applied
   */
  appliedRules: string[];

  /**
   * NEW: Optional guidance metadata for LLM clients
   *
   * Population Strategy:
   * - Only populated when modified=true (rules were applied)
   * - Returns undefined when:
   *   - No instructions configured
   *   - Instructions don't apply to this operation
   *   - Guidance extraction fails (logged, not thrown)
   *
   * Error Handling:
   * - buildGuidance() wrapped in try/catch inside InstructionProcessor
   * - Failures log error and return undefined
   * - Never blocks tool execution
   */
  guidance?: NoteGuidanceMetadata;
}

// ============================================================================
// TOOL RESPONSE METADATA CONTRACT
// ============================================================================

/**
 * Tool response metadata structure with guidance injection
 *
 * Conforms to MCP protocol's optional metadata field pattern
 * Handlers extract guidance from InstructionApplicationResult and inject here
 */
export interface ToolResponseMetadata {
  /**
   * Server version (existing field from addVersionMetadata)
   */
  version?: string;

  /**
   * Server name (existing field from addVersionMetadata)
   */
  serverName?: string;

  /**
   * Tool mode (existing field from addVersionMetadata)
   */
  toolMode?: string;

  /**
   * NEW: Guidance metadata for note operations
   *
   * Only present when:
   * - Tool operation involves note creation/editing/insertion
   * - Custom instructions configured and applied
   * - Guidance extraction succeeded
   *
   * Backwards Compatibility:
   * - Optional field (clients ignore if unknown)
   * - No impact on existing response structure
   * - Graceful degradation when undefined
   */
  guidance?: NoteGuidanceMetadata;
}

// ============================================================================
// BEHAVIORAL CONTRACTS
// ============================================================================

/**
 * MUST behaviors for MCP-121 implementation:
 *
 * 1. InstructionProcessor.buildGuidance() implementation:
 *    - MUST be private method inside InstructionProcessor class
 *    - MUST transform InstructionContext + appliedRules → NoteGuidanceMetadata
 *    - MUST wrap extraction in try/catch (failures return undefined)
 *    - MUST cap field sizes (requiredYAML max 5, headings max 3, rules max 10)
 *    - MUST log extraction failures without throwing
 *
 * 2. InstructionProcessor.applyInstructions() extension:
 *    - MUST call buildGuidance() after rule application when modified=true
 *    - MUST include guidance in InstructionApplicationResult return value
 *    - MUST NOT throw errors from guidance extraction (graceful degradation)
 *
 * 3. Tool handler integration (create_note, edit_note, get_daily_note, insert_content):
 *    - MUST extract instructionResult.guidance from applyInstructions() result
 *    - MUST inject guidance into metadata field via addVersionMetadata()
 *    - MUST handle undefined guidance gracefully (conditional metadata field)
 *    - MUST NOT require additional error handling (already handled in processor)
 *
 * 4. Hot-reload synchronization:
 *    - MUST rely on existing MCP-92 infrastructure (fs.watch → clearCache)
 *    - MUST NOT add additional caching layers or TTL timers
 *    - MUST ensure guidance updates propagate automatically on file changes
 *
 * 5. Fallback behavior:
 *    - MUST return tool responses without guidance when instructions absent
 *    - MUST return tool responses without guidance when extraction fails
 *    - MUST NEVER block tool execution due to guidance issues
 *
 * 6. Token efficiency:
 *    - MUST cap requiredYAML to 5 most important fields
 *    - MUST cap headings to 3 most important headings
 *    - MUST cap appliedRules to 10 most relevant rules
 *    - MUST keep temporalHints concise (single sentence)
 *    - MUST target 50-150 token budget per guidance payload
 */

/**
 * MUST NOT behaviors for MCP-121 implementation:
 *
 * 1. Instruction processing:
 *    - MUST NOT re-parse instruction files (use InstructionProcessor APIs)
 *    - MUST NOT duplicate config loaders (leverage existing cache)
 *    - MUST NOT add separate TTL caching (use existing getInstructions cache)
 *
 * 2. Error handling:
 *    - MUST NOT throw errors from guidance extraction
 *    - MUST NOT fail tool execution if guidance extraction fails
 *    - MUST NOT surface guidance errors to tool callers
 *
 * 3. Response structure:
 *    - MUST NOT modify existing response fields (content, isError)
 *    - MUST NOT rename existing metadata keys (version, serverName, toolMode)
 *    - MUST NOT alter tool behavior based on guidance presence
 *
 * 4. MCP protocol:
 *    - MUST NOT change tool annotations (readOnlyHint, idempotentHint)
 *    - MUST NOT introduce breaking changes to response schema
 *    - MUST NOT require guidance field in client code (optional)
 */

// ============================================================================
// INTEGRATION CONTRACTS
// ============================================================================

/**
 * Integration points for MCP-121 implementation
 */
export interface IntegrationContract {
  /**
   * Primary module: InstructionProcessor
   * Location: src/modules/config/instruction-processor.ts
   *
   * Extensions Required:
   * - Add buildGuidance() private method
   * - Extend applyInstructions() to populate guidance field
   * - Wrap guidance extraction in try/catch
   */
  instructionProcessor: {
    newMethod: 'buildGuidance(context, parsedRules, appliedRules): NoteGuidanceMetadata | undefined';
    extendedMethod: 'applyInstructions(context): ExtendedInstructionApplicationResult';
    errorHandling: 'try/catch with undefined fallback';
  };

  /**
   * Tool handlers requiring guidance injection
   * Locations: src/server/handlers/
   *
   * Modifications Required:
   * - Extract guidance from InstructionApplicationResult
   * - Pass guidance to addVersionMetadata() in metadata field
   * - Handle undefined guidance gracefully
   */
  toolHandlers: {
    noteHandlers: ['create_note (consolidated)', 'edit_note', 'insert_content'];
    utilityHandlers: ['get_daily_note'];
    pattern: 'addVersionMetadata({ content, metadata: { guidance } })';
  };

  /**
   * Type definitions requiring updates
   * Location: src/shared/types.ts
   *
   * Additions Required:
   * - Export NoteGuidanceMetadata interface
   * - Document guidance field in existing types
   */
  typeDefinitions: {
    newInterfaces: ['NoteGuidanceMetadata'];
    extendedInterfaces: ['InstructionApplicationResult (add guidance field)'];
  };

  /**
   * Documentation requiring updates
   * Locations: docs/
   *
   * Updates Required:
   * - CUSTOM-INSTRUCTIONS.md: Add guidance contract section
   * - tools/create_note.md: Add metadata.guidance examples
   * - tools/read_note.md: Add metadata.guidance examples
   */
  documentation: {
    guides: ['docs/guides/CUSTOM-INSTRUCTIONS.md'];
    toolDocs: ['docs/tools/create_note.md', 'docs/tools/read_note.md'];
    examplesRequired: ['Guidance payload structure', 'Hot-reload behavior'];
  };
}

// ============================================================================
// TESTING CONTRACTS
// ============================================================================

/**
 * Test coverage requirements for MCP-121
 */
export interface TestingContract {
  /**
   * Unit tests for guidance extraction
   * Location: tests/unit/instruction-processor.test.ts
   *
   * Critical Scenarios:
   * 1. Valid rules with all guidance fields populated
   * 2. Unknown note types (fallback to generic guidance)
   * 3. Malformed JSON in instruction rules
   * 4. Empty instructions (guidance undefined)
   * 5. Partial rules (some fields missing)
   * 6. Field capping (requiredYAML > 5, headings > 3, rules > 10)
   * 7. Timezone formatting
   * 8. Error during guidance extraction (graceful undefined)
   */
  unitTests: {
    file: 'tests/unit/instruction-processor.test.ts';
    newTestSuite: 'buildGuidance() method';
    scenarios: string[];
  };

  /**
   * Integration tests for metadata propagation
   * Location: tests/integration/
   *
   * Critical Scenarios:
   * 1. create_note with instructions → guidance in response
   * 2. edit_note with instructions → guidance in response
   * 3. get_daily_note with instructions → guidance in response
   * 4. insert_content with instructions → guidance in response
   * 5. Hot-reload: file change → clearCache → updated guidance
   * 6. No instructions configured → no guidance field
   * 7. Instructions malformed → tool succeeds, no guidance
   */
  integrationTests: {
    newTestFile: 'tests/integration/guidance-metadata.test.ts';
    scenarios: string[];
    hotReloadValidation: 'Verify MCP-92 clearCache propagates guidance updates';
  };

  /**
   * Manual testing with Claude Desktop
   * Required Validation:
   * 1. Create daily note → observe guidance in Claude's context
   * 2. Edit note with custom instructions → verify guidance updates
   * 3. Modify instruction file → verify hot-reload updates guidance
   * 4. No instructions → verify tool works without guidance
   */
  manualTesting: {
    platform: 'Claude Desktop';
    scenarios: string[];
  };
}

// ============================================================================
// VALIDATION STRATEGY
// ============================================================================

/**
 * Compile-time validation via TypeScript type checking
 *
 * Run: npm run typecheck
 *
 * Validates:
 * - ExtendedInstructionApplicationResult conforms to contract
 * - NoteGuidanceMetadata fields correctly typed
 * - Tool handlers correctly extract and inject guidance
 * - No breaking changes to existing interfaces
 */
export const VALIDATION_COMMAND = 'npm run typecheck';

/**
 * Implementation phase checklist
 *
 * All implementations MUST:
 * 1. Import contracts from this file
 * 2. Conform to defined interfaces
 * 3. Follow behavioral contracts (MUST/MUST NOT)
 * 4. Pass typecheck validation
 * 5. Include unit tests covering all scenarios
 * 6. Include integration tests for metadata propagation
 * 7. Update documentation with guidance contract
 */
export const IMPLEMENTATION_CHECKLIST = [
  'Import NoteGuidanceMetadata from MCP-121-contracts.ts',
  'Extend InstructionApplicationResult with guidance field',
  'Implement buildGuidance() with try/catch and field capping',
  'Modify applyInstructions() to populate guidance',
  'Update tool handlers to extract and inject guidance',
  'Add unit tests for guidance extraction',
  'Add integration tests for metadata propagation',
  'Update CUSTOM-INSTRUCTIONS.md with guidance contract',
  'Update tool docs with metadata.guidance examples',
  'Verify hot-reload updates guidance automatically',
  'Run npm run typecheck to validate conformance'
];
