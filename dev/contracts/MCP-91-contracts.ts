/**
 * MCP-91 Implementation Contracts
 *
 * Contracts for eliminating VaultUtils facade and establishing direct domain imports.
 *
 * Phases:
 * 1. Method Relocation
 * 2. Test Helper Creation
 * 3. Import Site Updates
 * 4. vault-utils.ts Deletion
 * 5. Documentation Updates
 * 6. Memory Consolidation
 * 7. Validation
 */

import { LifeOSNote, SearchOptions } from "../../src/shared/index.js";

// ============================================================================
// PHASE 1: METHOD RELOCATION CONTRACTS
// ============================================================================

/**
 * Link Utilities Module Contract
 * Target: src/modules/links/link-text-builder.ts (NEW FILE)
 */
export interface LinkTextBuilderContract {
  /**
   * Build new wikilink text from old path and new path
   *
   * MUST:
   * - Strip .md extension from paths
   * - Handle both [[link]] and [[link|alias]] formats
   * - Preserve existing aliases
   * - Return properly formatted wikilink
   *
   * MUST NOT:
   * - Modify file system
   * - Parse note content
   * - Depend on VaultUtils
   */
  buildNewLinkText(
    oldPath: string,
    newPath: string,
    existingLinkText: string
  ): string;

  /**
   * Update wikilinks in note content
   *
   * MUST:
   * - Find all wikilinks matching pattern
   * - Replace with new link text
   * - Preserve note content structure
   * - Handle edge cases (no links, malformed links)
   *
   * MUST NOT:
   * - Modify YAML frontmatter
   * - Write to file system (return updated content only)
   * - Depend on VaultUtils
   */
  updateNoteLinks(
    content: string,
    oldPath: string,
    newPath: string
  ): string;
}

/**
 * Search Utilities Module Contract
 * Target: Enhance existing SearchEngine in src/modules/search/search-engine.ts
 */
export interface SearchUtilitiesContract {
  /**
   * Find note by exact title match
   *
   * MUST:
   * - Use SearchEngine.quickSearch internally
   * - Return absolute path or throw error
   * - Handle frontmatter title vs filename title
   * - Provide actionable error with search suggestion
   *
   * MUST NOT:
   * - Return relative paths
   * - Return multiple matches (throw if ambiguous)
   * - Depend on VaultUtils
   */
  findNoteByTitle(title: string): Promise<string>;

  /**
   * Search notes with filtering options
   *
   * MUST:
   * - Support contentType, tags, category filtering
   * - Use getAllNotes() for enumeration
   * - Return LifeOSNote array with parsed frontmatter
   * - Apply filters in consistent order
   *
   * MUST NOT:
   * - Modify vault files
   * - Cache results (stateless)
   * - Depend on VaultUtils
   */
  searchNotes(options: SearchOptions): LifeOSNote[];

  /**
   * Find notes by glob pattern
   *
   * MUST:
   * - Use glob library for pattern matching
   * - Return absolute paths
   * - Sort results alphabetically
   * - Handle empty results gracefully
   *
   * MUST NOT:
   * - Parse note content
   * - Filter by frontmatter (pure glob matching)
   * - Depend on VaultUtils
   */
  findNotes(pattern: string): Promise<string[]>;

  /**
   * Get all notes in vault
   *
   * MUST:
   * - Enumerate all .md files recursively
   * - Parse YAML frontmatter for each note
   * - Return LifeOSNote array with metadata
   * - Handle notes without frontmatter
   *
   * MUST NOT:
   * - Apply filtering (return all notes)
   * - Cache results between calls
   * - Depend on VaultUtils
   */
  getAllNotes(): LifeOSNote[];
}

/**
 * Metadata Utilities Module Contract
 * Target: src/shared/metadata-utils.ts (NEW FILE)
 */
export interface MetadataUtilitiesContract {
  /**
   * Get local date at midnight
   *
   * MUST:
   * - Parse YYYY-MM-DD strings as local midnight
   * - Reset time to 00:00:00 in local timezone
   * - Handle Date objects, strings, and undefined
   * - Return Date object (not ISO string)
   *
   * MUST NOT:
   * - Introduce timezone shifts (no UTC conversion)
   * - Modify input date object
   * - Depend on VaultUtils
   */
  getLocalDate(dateInput?: Date | string): Date;

  /**
   * Normalize tags to string array
   *
   * MUST:
   * - Handle string, string[], undefined, null inputs
   * - Split comma-separated strings
   * - Trim whitespace from each tag
   * - Return empty array for invalid input
   *
   * MUST NOT:
   * - Validate tag format (preserve user input)
   * - Remove duplicates (preserve user intent)
   * - Depend on VaultUtils
   */
  normalizeTagsToArray(tags: any): string[];

  /**
   * Check if note content type matches search type
   *
   * MUST:
   * - Handle case-insensitive matching
   * - Support undefined/null values
   * - Return boolean
   *
   * MUST NOT:
   * - Throw errors (return false for invalid input)
   * - Depend on VaultUtils
   *
   * @internal - Search module helper
   */
  matchesContentType(
    noteContentType: string | undefined,
    searchContentType: string | undefined
  ): boolean;

  /**
   * Check if note has any of the search tags
   *
   * MUST:
   * - Handle array inputs
   * - Support case-sensitive matching
   * - Return boolean
   * - Handle empty/undefined arrays
   *
   * MUST NOT:
   * - Throw errors (return false for invalid input)
   * - Depend on VaultUtils
   *
   * @internal - Search module helper
   */
  hasAnyTag(
    noteTags: string[] | undefined,
    searchTags: string[] | undefined
  ): boolean;
}

// ============================================================================
// PHASE 2: TEST HELPER CONTRACTS
// ============================================================================

/**
 * Test Utilities Contract
 * Target: tests/helpers/test-utils.ts (NEW FILE or enhance existing)
 */
export interface TestUtilitiesContract {
  /**
   * Reset singleton instances for test isolation
   *
   * MUST:
   * - Reset TemplateManager instance to null
   * - Reset ObsidianSettings instance to null
   * - Reset DateResolver instance to null
   * - Force re-initialization on next access
   *
   * MUST NOT:
   * - Be called in production code
   * - Affect other tests running in parallel
   * - Throw errors
   *
   * @testonly
   */
  resetTestSingletons(): void;
}

// ============================================================================
// PHASE 3: IMPORT SITE UPDATE CONTRACTS
// ============================================================================

/**
 * Import Pattern Contract
 *
 * Defines how VaultUtils static method calls should be transformed to
 * direct domain function calls.
 */
export interface ImportTransformationContract {
  /**
   * Before: VaultUtils.readNote(path)
   * After: readNote(path)
   * Module: src/modules/files/note-crud.ts
   */
  noteCrudOperations: {
    readNote: "(path: string) => Promise<LifeOSNote>";
    writeNote: "(path: string, content: string) => Promise<void>";
    createNote: "(options: CreateNoteOptions) => Promise<string>";
    updateNote: "(path: string, updates: NoteUpdates) => Promise<void>";
  };

  /**
   * Before: VaultUtils.getDailyNote(date)
   * After: getDailyNote(date)
   * Module: src/modules/files/daily-note-service.ts
   */
  dailyNoteOperations: {
    getDailyNote: "(date?: string) => Promise<string>";
    createDailyNote: "(date?: string) => Promise<string>";
  };

  /**
   * Before: VaultUtils.insertContent(...)
   * After: insertContent(...)
   * Module: src/modules/files/content-insertion.ts
   */
  contentOperations: {
    insertContent: "(options: InsertContentOptions) => Promise<void>";
  };

  /**
   * Before: VaultUtils.moveItem(...)
   * After: moveItem(...)
   * Module: src/modules/files/folder-operations.ts
   */
  folderOperations: {
    moveItem: "(source: string, destination: string) => Promise<void>";
  };

  /**
   * Before: VaultUtils.getYamlPropertyValues(...)
   * After: getYamlPropertyValues(...)
   * Module: src/modules/files/yaml-operations.ts
   */
  yamlOperations: {
    getYamlPropertyValues: "(property: string) => Promise<string[]>";
    getAllYamlProperties: "() => Promise<YAMLFrontmatter[]>";
  };

  /**
   * Before: VaultUtils.findNoteByTitle(title)
   * After: findNoteByTitle(title) or SearchEngine.findNoteByTitle(title)
   * Module: src/modules/search/search-engine.ts
   */
  searchOperations: {
    findNoteByTitle: "(title: string) => Promise<string>";
    searchNotes: "(options: SearchOptions) => LifeOSNote[]";
    findNotes: "(pattern: string) => Promise<string[]>";
    getAllNotes: "() => LifeOSNote[]";
  };

  /**
   * Before: VaultUtils.buildNewLinkText(...)
   * After: buildNewLinkText(...)
   * Module: src/modules/links/link-text-builder.ts
   */
  linkOperations: {
    buildNewLinkText: "(oldPath: string, newPath: string, existingLink: string) => string";
    updateNoteLinks: "(content: string, oldPath: string, newPath: string) => string";
  };

  /**
   * Before: VaultUtils.getLocalDate(...)
   * After: getLocalDate(...)
   * Module: src/shared/metadata-utils.ts
   */
  metadataOperations: {
    getLocalDate: "(dateInput?: Date | string) => Date";
    normalizeTagsToArray: "(tags: any) => string[]";
  };

  /**
   * Before: VaultUtils.readFileWithRetry(...)
   * After: readFileWithRetry(...)
   * Module: src/modules/files/file-io.ts (already exists)
   */
  fileIOOperations: {
    readFileWithRetry: "(path: string, options?: any) => Promise<string>";
    writeFileWithRetry: "(path: string, content: string, options?: any) => Promise<void>";
  };
}

// ============================================================================
// PHASE 4: DELETION CONTRACTS
// ============================================================================

/**
 * VaultUtils Deletion Contract
 *
 * Conditions that MUST be met before vault-utils.ts can be deleted
 */
export interface DeletionPrerequisitesContract {
  /**
   * All methods relocated to appropriate modules
   */
  methodsRelocated: {
    linkUtilities: ["buildNewLinkText", "updateNoteLinks"];
    searchUtilities: ["findNoteByTitle", "searchNotes", "findNotes", "getAllNotes"];
    metadataUtilities: ["getLocalDate", "normalizeTagsToArray", "matchesContentType", "hasAnyTag"];
  };

  /**
   * All import sites updated (7 files)
   */
  importSitesUpdated: [
    "src/tool-router.ts",
    "src/server/handlers/utility-handlers.ts",
    "src/server/handlers/note-handlers.ts",
    "src/server/handlers/legacy-alias-handlers.ts",
    "src/server/handlers/consolidated-handlers.ts",
    "src/modules/links/link-updater.ts",
    "src/server/handlers/metadata-handlers.ts"
  ];

  /**
   * Test helper created and all tests updated
   */
  testUtilitiesUpdated: {
    helperCreated: "tests/helpers/test-utils.ts";
    testFilesUpdated: "20+ test files";
  };

  /**
   * All exports updated
   */
  exportsUpdated: {
    filesModuleIndex: "src/modules/files/index.ts - VaultUtils export removed";
    searchModuleIndex: "src/modules/search/index.ts - new functions exported";
    linksModuleIndex: "src/modules/links/index.ts - new functions exported";
    sharedIndex: "src/shared/index.ts - metadata utils exported";
  };

  /**
   * Verification complete
   */
  verificationPassed: {
    typecheck: "npm run typecheck - PASS";
    testSuite: "npm test - 805/808+ PASS";
    circularDeps: "npm run check:circular - PASS";
    noReferences: "rg 'VaultUtils' src/ - NO MATCHES";
  };
}

// ============================================================================
// ERROR HANDLING CONTRACTS
// ============================================================================

/**
 * Error Handling Contract
 *
 * All relocated methods MUST follow these error patterns
 */
export interface ErrorHandlingContract {
  /**
   * Pattern 1: LIST_AVAILABLE_OPTIONS
   * Use when resource not found but alternatives exist
   */
  listAvailableOptions: {
    template: "{Resource} '{identifier}' not found. Available: {list}. Run {tool} to see all.";
    maxItems: 5;
    maxChars: 500;
  };

  /**
   * Pattern 2: SUGGEST_SEARCH
   * Use when item not found by path/identifier
   */
  suggestSearch: {
    template: "{Item} not found: {identifier}. Run search(query='{suggestion}') to find it.";
    extractFileName: true;
  };

  /**
   * Pattern 3: REFERENCE_DOC_TOOL
   * Use when validation error on schema/rules
   */
  referenceDocTool: {
    template: "{Validation error}. Run {doc_tool}() to see {schema/rules}.";
  };

  /**
   * All errors MUST be actionable and guide user to recovery
   */
  requirements: {
    actionable: "Error message must suggest specific action";
    concise: "Keep under 500 chars total";
    noStackTraces: "User errors should not show stack traces";
    preserveSystemErrors: "File system errors can show technical details";
  };
}

// ============================================================================
// INTEGRATION CONTRACTS
// ============================================================================

/**
 * Integration Points Contract
 *
 * How relocated modules integrate with existing systems
 */
export interface IntegrationContract {
  /**
   * Link utilities integrate with link-updater
   */
  linkUtilitiesIntegration: {
    linkUpdater: "Must call buildNewLinkText and updateNoteLinks";
    transactionSystem: "Link updates must be atomic with rename operations";
    testCoverage: "tests/unit/link-updater-modes.test.ts must pass";
  };

  /**
   * Search utilities integrate with tool-router
   */
  searchUtilitiesIntegration: {
    toolRouter: "Must provide search functionality to MCP tools";
    searchEngine: "Must use SearchEngine.quickSearch for findNoteByTitle";
    testCoverage: "tests/integration/search-operations.test.ts must pass";
  };

  /**
   * Metadata utilities integrate with multiple modules
   */
  metadataUtilitiesIntegration: {
    dailyNoteService: "Must provide getLocalDate for date parsing";
    noteHandlers: "Must provide normalizeTagsToArray for tag processing";
    searchFilters: "Must provide matchesContentType and hasAnyTag helpers";
    testCoverage: "Date-sensitive tests must use parseISO pattern";
  };

  /**
   * Test utilities integrate with test suite
   */
  testUtilitiesIntegration: {
    vaultSetup: "tests/helpers/vault-setup.ts must import resetTestSingletons";
    integrationTests: "All integration tests must reset singletons in beforeEach";
    testIsolation: "Tests must not pollute production vault";
    testCoverage: "805/808+ tests must pass";
  };
}

// ============================================================================
// CRITICAL LOGIC PRESERVATION CONTRACTS
// ============================================================================

/**
 * Critical Logic Preservation Contract
 *
 * These patterns MUST be preserved during refactoring
 */
export interface CriticalLogicContract {
  /**
   * iCloud retry logic MUST remain in file-io.ts
   */
  iCloudRetryLogic: {
    location: "src/modules/files/file-io.ts";
    functions: ["readFileWithRetry", "writeFileWithRetry"];
    testValidation: "tests/unit/atomic-file-operations.test.ts - MUST PASS";
    behavior: "Retry 3 times with exponential backoff on ENOENT/ENOTDIR";
  };

  /**
   * YAML validation rules MUST remain in yaml-operations.ts
   */
  yamlValidationRules: {
    location: "src/modules/files/yaml-operations.ts";
    functions: ["getYamlPropertyValues", "getAllYamlProperties"];
    testValidation: "tests/integration/vault-configurations.test.ts - MUST PASS";
    behavior: "Parse frontmatter, handle missing YAML, validate schema";
  };

  /**
   * Link update logic MUST preserve wikilink format
   */
  linkUpdateLogic: {
    location: "src/modules/links/link-text-builder.ts (after relocation)";
    functions: ["buildNewLinkText", "updateNoteLinks"];
    testValidation: "tests/integration/rename-note.integration.test.ts - MUST PASS";
    behavior: "Preserve [[link]] and [[link|alias]] formats, strip .md extensions";
  };

  /**
   * Singleton managers MUST maintain lazy initialization
   */
  singletonManagers: {
    managers: ["TemplateManager", "ObsidianSettings", "DateResolver"];
    behavior: "Lazy initialization on first access, singleton pattern";
    testReset: "resetTestSingletons() must clear all instances";
  };

  /**
   * Date parsing MUST NOT introduce timezone shifts
   */
  dateParsingLogic: {
    location: "src/shared/metadata-utils.ts (after relocation)";
    function: "getLocalDate";
    testValidation: "Date-sensitive tests with YYYY-MM-DD strings";
    behavior: "Parse YYYY-MM-DD as local midnight, no UTC conversion";
    criticalPattern: "Use parseISO() from date-fns or append T00:00:00";
  };
}

// ============================================================================
// BEHAVIORAL CONTRACTS (MUST / MUST NOT)
// ============================================================================

/**
 * Global Behavioral Contracts
 *
 * Rules that apply across all phases of implementation
 */
export interface BehavioralContract {
  MUST: {
    /**
     * Test suite MUST remain green throughout implementation
     */
    maintainGreenTests: "805/808+ tests passing after each phase";

    /**
     * TypeScript MUST compile without errors
     */
    typecheck: "npm run typecheck - zero errors after each phase";

    /**
     * Each method MUST be moved atomically
     * (copy to new location, update references, delete from old location)
     */
    atomicMigration: "No partial states - complete one method before next";

    /**
     * All relocated methods MUST be exported from module index.ts
     */
    moduleExports: "Update index.ts exports immediately after creating new files";

    /**
     * Import sites MUST be updated file-by-file
     * (not all at once - allows incremental verification)
     */
    incrementalImportUpdates: "Update and test one consumer file at a time";

    /**
     * Documentation MUST be updated to reflect new architecture
     */
    documentationUpdates: "18 files require updates - complete in Phase 5";

    /**
     * Critical logic MUST be preserved
     */
    preserveCriticalLogic: "iCloud retry, YAML validation, link updates, date parsing";

    /**
     * Commit messages MUST reference MCP-91 and describe changes
     */
    commitMessages: "Clear, descriptive commits with issue reference";
  };

  MUST_NOT: {
    /**
     * MUST NOT break test suite
     */
    breakTests: "If tests fail, rollback immediately and fix";

    /**
     * MUST NOT introduce circular dependencies
     */
    circularDeps: "Run npm run check:circular after each module creation";

    /**
     * MUST NOT skip TypeScript errors
     */
    ignoreTypeErrors: "Fix all type errors before moving to next phase";

    /**
     * MUST NOT delete VaultUtils until all references removed
     */
    prematureDeletion: "Delete vault-utils.ts ONLY after Phase 3 complete";

    /**
     * MUST NOT update documentation before implementation
     */
    prematureDocumentation: "Documentation updates happen in Phase 5";

    /**
     * MUST NOT pollute production vault during tests
     */
    testPollution: "All tests must use temp directories with proper cleanup";

    /**
     * MUST NOT introduce breaking changes to internal APIs
     */
    breakingChanges: "Function signatures must match existing contracts";

    /**
     * MUST NOT rush - proceed phase by phase
     */
    skipPhases: "Complete each phase fully before moving to next";
  };
}

// ============================================================================
// VALIDATION CONTRACTS
// ============================================================================

/**
 * Validation Contract
 *
 * Verification steps required at each phase
 */
export interface ValidationContract {
  /**
   * After Phase 1: Method Relocation
   */
  phase1Validation: {
    filesCreated: [
      "src/modules/links/link-text-builder.ts",
      "src/shared/metadata-utils.ts",
      "tests/helpers/test-utils.ts"
    ];
    functionsExported: "All relocated functions exported from module index.ts";
    searchEnhanced: "SearchEngine has new public methods";
    typecheck: "npm run typecheck - PASS";
    testSuite: "npm test - 805/808+ PASS";
  };

  /**
   * After Phase 2: Test Helper Creation
   */
  phase2Validation: {
    helperCreated: "tests/helpers/test-utils.ts with resetTestSingletons()";
    testFilesUpdated: "20+ test files import from new helper";
    testIsolationWorks: "Singletons reset properly in tests";
    testSuite: "npm test - 805/808+ PASS";
  };

  /**
   * After Phase 3: Import Site Updates
   */
  phase3Validation: {
    allConsumersUpdated: "7 import sites use direct domain imports";
    noVaultUtilsReferences: "rg 'VaultUtils\\.' src/ - zero matches (except comments)";
    typecheck: "npm run typecheck - PASS";
    testSuite: "npm test - 805/808+ PASS";
  };

  /**
   * After Phase 4: vault-utils.ts Deletion
   */
  phase4Validation: {
    fileDeleted: "src/modules/files/vault-utils.ts removed";
    exportRemoved: "src/modules/files/index.ts - no VaultUtils export";
    noReferences: "rg 'vault-utils' src/ - zero matches";
    typecheck: "npm run typecheck - PASS";
    testSuite: "npm test - 805/808+ PASS";
    circularDeps: "npm run check:circular - PASS";
  };

  /**
   * After Phase 5: Documentation Updates
   */
  phase5Validation: {
    toolDocsUpdated: "11 tool documentation files reflect new imports";
    architectureUpdated: "ARCHITECTURE.md, ADRs updated";
    newGuideCreated: "docs/guides/DOMAIN-MODULES.md exists";
    currentFocusUpdated: "docs/CURRENT-FOCUS.md shows MCP-91 complete";
    changelogUpdated: "CHANGELOG.md has MCP-91 entry";
    linksValid: "All cross-references in docs are valid";
  };

  /**
   * After Phase 6: Memory Consolidation
   */
  phase6Validation: {
    memoriesUpdated: "vault_integration_patterns.md, code_quality_patterns.md updated";
    noVaultUtilsInMemories: ".serena/memories/*.md - no outdated VaultUtils references";
    memoryValidation: ".serena/scripts/validate-memories.sh - PASS";
  };

  /**
   * Final Validation (Phase 7)
   */
  finalValidation: {
    typecheck: "npm run typecheck - PASS";
    testSuite: "npm test - 805/808+ PASS (ideally 808/808)";
    circularDeps: "npm run check:circular - PASS";
    linting: "markdownlint-cli2 docs/**/*.md - PASS";
    noVaultUtilsAnywhere: "rg 'VaultUtils' . --type ts --type md - minimal matches (legacy comments OK)";
    criticalLogicPreserved: {
      iCloudRetry: "tests/unit/atomic-file-operations.test.ts - PASS";
      yamlValidation: "tests/integration/vault-configurations.test.ts - PASS";
      linkUpdates: "tests/integration/rename-note.integration.test.ts - PASS";
      dateHandling: "Date-sensitive tests - PASS";
    };
  };
}

// ============================================================================
// MODULE RESPONSIBILITY CONTRACTS
// ============================================================================

/**
 * Module Responsibility Contract
 *
 * Defines clear boundaries for each module after MCP-91
 */
export interface ModuleResponsibilityContract {
  /**
   * src/modules/files/ - File and vault operations
   */
  filesModule: {
    responsibilities: [
      "CRUD operations (read, write, create, update notes)",
      "Daily note service (get, create daily notes)",
      "File I/O with iCloud retry logic",
      "YAML operations (parse, validate, query frontmatter)",
      "Content insertion (targeted content injection)",
      "Folder operations (move, organize files)"
    ];
    exports: [
      "readNote",
      "writeNote",
      "createNote",
      "updateNote",
      "getDailyNote",
      "createDailyNote",
      "insertContent",
      "moveItem",
      "getYamlPropertyValues",
      "getAllYamlProperties",
      "readFileWithRetry",
      "writeFileWithRetry"
    ];
    dependencies: ["shared/", "templates/"];
  };

  /**
   * src/modules/search/ - Search and discovery
   */
  searchModule: {
    responsibilities: [
      "Full-text search with scoring",
      "Quick title-based search",
      "Glob pattern matching",
      "Note enumeration with frontmatter",
      "Search filtering (tags, contentType, category)"
    ];
    exports: [
      "SearchEngine (class)",
      "findNoteByTitle",
      "searchNotes",
      "findNotes",
      "getAllNotes"
    ];
    dependencies: ["shared/", "files/ (for note reading)"];
  };

  /**
   * src/modules/links/ - Wikilink management
   */
  linksModule: {
    responsibilities: [
      "Wikilink scanning and parsing",
      "Link text construction",
      "Link replacement in notes",
      "Vault-wide link updates (with transactions)"
    ];
    exports: [
      "LinkScanner (class)",
      "updateVaultLinks",
      "buildNewLinkText",
      "updateNoteLinks"
    ];
    dependencies: ["shared/", "files/", "transactions/"];
  };

  /**
   * src/shared/ - Shared utilities
   */
  sharedModule: {
    responsibilities: [
      "Path normalization",
      "Date utilities (parsing, formatting)",
      "Tag normalization",
      "Content type matching",
      "Regex patterns",
      "Type definitions"
    ];
    exports: [
      "normalizePath",
      "getLocalDate",
      "normalizeTagsToArray",
      "matchesContentType",
      "hasAnyTag",
      "LIFEOS_CONFIG",
      "Type definitions"
    ];
    dependencies: ["None (leaf module)"];
  };

  /**
   * tests/helpers/ - Test utilities
   */
  testHelpersModule: {
    responsibilities: [
      "Singleton reset for test isolation",
      "Test vault setup",
      "Test fixtures",
      "Common test utilities"
    ];
    exports: [
      "resetTestSingletons",
      "setupTestVault",
      "Test fixtures"
    ];
    dependencies: ["All modules (for testing)"];
    visibility: "@testonly - never imported by production code";
  };
}

// ============================================================================
// EXPORT
// ============================================================================

/**
 * Complete MCP-91 Contract Suite
 *
 * All contracts that govern the implementation of VaultUtils elimination
 */
export interface MCP91CompleteContract {
  linkTextBuilder: LinkTextBuilderContract;
  searchUtilities: SearchUtilitiesContract;
  metadataUtilities: MetadataUtilitiesContract;
  testUtilities: TestUtilitiesContract;
  importTransformation: ImportTransformationContract;
  deletionPrerequisites: DeletionPrerequisitesContract;
  errorHandling: ErrorHandlingContract;
  integration: IntegrationContract;
  criticalLogic: CriticalLogicContract;
  behavioral: BehavioralContract;
  validation: ValidationContract;
  moduleResponsibility: ModuleResponsibilityContract;
}

/**
 * Contract-driven development ensures:
 * ✅ Clear interfaces defined before implementation
 * ✅ All stakeholders agree on behavior
 * ✅ Test contracts guide test creation
 * ✅ Integration contracts prevent breaking changes
 * ✅ Behavioral contracts enforce best practices
 * ✅ Validation contracts ensure quality gates
 */
