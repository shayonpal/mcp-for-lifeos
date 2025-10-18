# Changelog

All notable changes to the LifeOS MCP Server will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed
- **Test Isolation Bug - Production Vault Pollution** (2025-08-30): Fixed tests writing to production Obsidian vault
  - Added `resetSingletons()` method to VaultUtils to clear cached singleton instances during tests
  - VaultUtils singleton instances (templateManager, obsidianSettings) were persisting with production paths
  - All test files now call `VaultUtils.resetSingletons()` after modifying LIFEOS_CONFIG
  - Ensures complete test isolation with temporary directories instead of production vault
  - Prevents test artifacts from appearing in live Obsidian vault during test runs

### Added
- **MCP Tool Annotations for Read/Write Classification** (MCP-35, 2025-10-18 04:15): Added standardized MCP protocol annotations to all 27 tools for enhanced AI understanding
  - Annotated 24 read-only tools with `readOnlyHint: true` for safe, non-mutating operations
  - Annotated 3 write tools (`create_note`, `create_note_smart`, `edit_note`) with `readOnlyHint: false`
  - Added `idempotentHint: true` to 1 conditional write tool (`get_daily_note`) indicating safe repeated execution
  - Added `openWorldHint: true` to 26 tools indicating file system interaction and potential new information discovery
  - Read-only tools include: search, list, read_note, get_daily_note, get_server_version, get_yaml_rules, list_yaml_properties, list_yaml_property_values, diagnose_vault, and all legacy tools
  - Write tools clearly marked: create_note (false), create_note_smart (false), edit_note (false)
  - Benefits: AI can confidently identify safe read operations, better tool selection accuracy, clearer API surface for developers
  - Improves Claude Desktop integration with explicit operation safety guarantees
  - Enhances tool discoverability and usage patterns for AI tool callers
  - Provides foundation for future safety-critical AI workflows requiring operation classification
- **get_server_version Tool Documentation** (2025-08-29): Created comprehensive documentation for the server information and discovery tool
  - Added detailed docs/tools/get_server_version.md with complete server capabilities and version information
  - Documents includeTools parameter for optional complete tool inventory with descriptions
  - Covers server version semantics, template availability count, vault path configuration, and capabilities summary
  - Includes comprehensive version history from 1.0.0 to 1.7.0 with feature introduction timeline and breaking changes
  - Documents configuration status reporting (vault path, YAML rules, analytics, web interface) and discovery capabilities
  - Provides usage examples for debugging, compatibility checks, feature discovery, and initial handshake workflows
  - Covers implementation details with SERVER_VERSION constant, DynamicTemplateEngine integration, and tool registry access
  - Documents tool list format with categories (Search, Creation, Organization, Analysis, Maintenance, Information)
  - Includes integration points for Claude Desktop, Raycast, API version verification, and client capability negotiation
  - Documents error handling, performance considerations, security aspects, and troubleshooting strategies
  - Covers semantic versioning interpretation, backward compatibility notes, and deprecation tracking
- **diagnose_vault Tool Documentation** (2025-08-29): Created comprehensive documentation for the vault health check tool
  - Added detailed docs/tools/diagnose_vault.md with complete diagnostic capabilities and troubleshooting guide
  - Documents parameters (checkYaml, maxFiles) with performance considerations and default limits
  - Covers YAML frontmatter validation, file access verification, and bulk scanning capabilities
  - Includes diagnostic checks for syntax validation, structure verification, value type checking, and encoding validation
  - Documents common issues detection (missing delimiters, invalid indentation, unescaped characters, mixed types, null values)
  - Provides 6 usage examples from quick health checks to full vault audits with performance optimization strategies
  - Documents comprehensive error types (YAML parse, file read, encoding, structure, value type) with specific fixes
  - Includes troubleshooting guide with step-by-step repair strategies and prevention best practices
  - Covers implementation details with VaultUtils.readNote(), parseWithFallback(), and iCloud-aware retry mechanisms
  - Documents analytics integration, related tool workflows, and maintenance scheduling recommendations
- **move_items Tool Documentation** (2025-08-29): Created comprehensive documentation for the file organization tool
  - Added detailed docs/tools/move_items.md with complete parameter reference and dual operation mode documentation
  - Documents single vs batch operations using "item" parameter vs "items" array with path and optional type specification
  - Covers auto-detection of item types (note vs folder), destination folder creation, overwrite protection, and folder merging
  - Includes detailed parameter documentation (destination, createDestination, overwrite, mergeFolders) with safety defaults
  - Documents link preservation during moves with automatic internal link updates and reference maintenance
  - Provides PARA method integration for LifeOS organization (Projects, Areas, Resources, Archive) with workflow examples
  - Includes 15+ usage examples covering single moves, batch operations, inbox processing, project archival, and seasonal cleanup
  - Documents comprehensive error handling for source not found, permission denied, name conflicts, circular moves, and invalid paths
  - Covers implementation details with VaultUtils.moveItem() core handler, mergeFolders() recursive processing, and safety mechanisms
  - Includes best practices for organization planning, safety-first approach, PARA method workflows, and performance optimization
  - Documents related tool integration with list, search, create_note tools and comprehensive troubleshooting guide
- **get_yaml_rules Tool Documentation** (2025-08-29): Created comprehensive documentation for the YAML rules reference tool
  - Added detailed docs/tools/get_yaml_rules.md with complete configuration and usage documentation
  - Documents parameter-free tool that returns complete YAML frontmatter rules document for reference
  - Covers configuration requirements (yamlRulesPath) and response types (configured, not configured, file not found, errors)
  - Includes YAML rules document structure with field definitions, auto-managed fields, validation rules, and examples
  - Documents integration with create_note, edit_note, create_note_smart for YAML compliance validation
  - Provides auto-managed field protection (created, modified, id) and best practices for schema compliance
  - Includes comprehensive configuration setup guide, troubleshooting, and standard LifeOS rules template
- **insert_content Tool Documentation** (2025-08-29): Created comprehensive documentation for the surgical content insertion tool
  - Added detailed docs/tools/insert_content.md with complete parameter reference and targeting method documentation
- **list_yaml_property_values Tool Documentation** (2025-08-29): Created comprehensive documentation for the YAML property analysis tool
  - Added detailed docs/tools/list_yaml_property_values.md with complete metadata discovery and standardization guidance
  - Documents all parameters (property, includeCount, includeExamples, sortBy, maxExamples) with examples and use cases
  - Covers value type detection (single vs array), sorting options (alphabetical, usage, type), and response structure
  - Includes property name formats (simple, spaces, case-sensitivity, nested), common LifeOS properties analysis
  - Provides extensive usage examples for metadata cleanup, data quality audits, and standardization projects
  - Documents performance considerations, error handling, and best practices for vault organization
  - Includes data quality insights for finding inconsistencies, typos, orphaned values, and popular patterns
  - Documents 4 targeting methods: heading (exact match), block reference (^block-id), pattern search, and line number
  - Covers 5 position options: before, after, append, prepend, end-of-section with smart section boundary detection
  - Includes special emphasis on daily notes "Day's Notes" pattern and proper apostrophe handling in heading matching
  - Documents list-aware insertion maintaining proper formatting and indentation for task lists and nested content
  - Provides 15+ usage examples covering daily journaling, task management, meeting notes, research, and template completion
  - Includes comprehensive error handling, troubleshooting guide, and performance considerations for large documents
- **read_note Tool Documentation** (2025-08-29): Created comprehensive documentation for the note reading tool
  - Added detailed docs/tools/read_note.md with complete parameter reference and path resolution documentation
  - Documents single required parameter (path) with support for absolute, relative, and escaped space formats
  - Covers intelligent path normalization, YAML frontmatter parsing with graceful error handling, and tag normalization
  - Includes formatted output structure with metadata headers, clickable Obsidian links, and content separation
  - Documents error handling for file not found, permission errors, and corrupted YAML with fallback parsing
  - Provides 5+ usage examples covering daily notes, project notes, spaces in paths, and subfolder access
  - Includes implementation details, performance considerations, best practices, and integration with related tools
- **edit_note Tool Documentation** (2025-08-29): Created comprehensive documentation for the note editing tool
  - Added detailed docs/tools/edit_note.md with complete parameter reference and dual update mode documentation
  - Documents merge mode (default, preserves existing fields) vs replace mode (complete frontmatter replacement)
  - Covers flexible note selection by path or title with automatic path resolution and space handling
  - Includes frontmatter field mapping (contentType→"content type", subCategory→"sub-category") and custom field support
  - Documents YAML rules compliance with auto-managed field protection (created, modified, id) and validation
  - Provides 15+ usage examples covering content updates, metadata changes, and advanced operations
  - Includes comprehensive error handling, best practices, security considerations, and tool integration guidance
- **create_note Tool Documentation** (2025-08-29): Created comprehensive documentation for the manual note creation tool
  - Added detailed docs/tools/create_note.md with complete parameter reference and usage examples
  - Documents manual YAML frontmatter control with template support and discovery mode capabilities
  - Covers template variable injection through customData parameter and custom folder placement
  - Includes comparison with create_note_smart tool highlighting when to use each approach
  - Provides detailed YAML frontmatter structure documentation and PARA method folder organization
  - Documents template discovery mode (useTemplate=true) and 11 available templates with descriptions
  - Includes comprehensive error handling, performance considerations, and troubleshooting guide
- **get_daily_note Tool Documentation** (2025-08-29): Created comprehensive documentation for the daily note management tool
  - Added detailed docs/tools/get_daily_note.md with extensive natural language date parsing capabilities
  - Documents intelligent date resolution supporting "today", "yesterday", "next Monday", relative dates, and multiple formats
  - Covers auto-creation features with createIfMissing and confirmCreation parameters for user control
  - Includes comprehensive date parsing examples (ISO, US, European formats, natural language, relative dates)
  - Documents PARA method folder organization and template-based note creation system
  - Provides detailed error handling for invalid dates, file system issues, and template processing
  - Includes timezone-aware date handling and performance optimization details
- **List Tool Documentation** (2025-08-29): Created comprehensive documentation for the universal list tool
  - Added detailed docs/tools/list.md with complete parameter reference and usage examples
  - Documents auto-detection logic for folders, daily_notes, templates, and yaml_properties list types
  - Covers tool consolidation strategy replacing 4 legacy listing tools (list_folders, list_daily_notes, list_templates, list_yaml_properties)
  - Includes migration guide from legacy tools with direct parameter mapping examples
  - Provides detailed response formats for each list type and routing behavior documentation
  - Documents PARA methodology support for folder listing and template discovery system
- **create_note_smart Tool Documentation** (2025-08-29): Created comprehensive documentation for the smart note creation tool
  - Added detailed docs/tools/create_note_smart.md with complete parameter reference and usage examples
  - Documents automatic template detection logic based on title keywords (restaurant, person, article, etc.)
  - Covers tool consolidation strategy combining create_note and create_note_from_template functionality
  - Includes migration guide from legacy tools and routing behavior documentation
  - Provides practical examples with custom data injection and template variable processing
  - Documents 11 available templates with detection triggers and use cases
- **Search Tool Documentation** (2025-08-29): Created comprehensive documentation for the universal search tool
  - Added detailed docs/tools/search.md with complete parameter reference
  - Covers all search modes (auto, advanced, quick, content_type, recent, pattern)
  - Includes auto-detection logic, migration guide from legacy tools
  - Documents intelligent fallback mechanisms and performance optimizations
  - Provides practical usage examples and best practices for AI tool callers

### Fixed
- **JSONL Append-Only Analytics (MCP-21)** (2025-08-30 07:59): Complete overhaul of analytics system for multi-instance safety
  - Replaced JSON file format with JSONL (JSON Lines) for atomic append operations  
  - Eliminates data loss when multiple MCP server instances run concurrently
  - Added instance identification (UUID, process ID, hostname) for debugging
  - Performance improvements: sub-5ms write latency, 1200+ operations per second
  - Automatic migration from legacy JSON format with full backward compatibility
  - Comprehensive test coverage with 27 new tests validating concurrent operations
  - Builds upon earlier critical analytics data loss fix (#83)
- **Critical Test Isolation Bug** (MCP-20, 2025-08-29): Fixed insert-content.test.ts writing to production Obsidian vault
  - Replaced direct LIFEOS_CONFIG.vaultPath usage with temporary directory pattern
  - Added proper imports: tmpdir from 'os', randomBytes from 'crypto', fs.promises
  - Implemented beforeEach/afterEach hooks with config backup/restore
  - Follows established pattern from other test files (daily-note-simple.test.ts, etc.)
  - All 14 tests in insert-content.test.ts now pass
  - Verified no test artifacts in production vault

### Removed
- **Empty Support Directory** (2025-08-28): Removed unused `Support/Raycast/script-commands` directory structure
  - Directory was created as placeholder for Raycast Script Commands but never populated
  - Project uses MCP protocol integration with Raycast instead of Script Commands
  - Cleaning up unused directory structure to reduce confusion

## [1.8.0] - 2025-06-28

### Fixed
- **Critical Analytics Data Loss Bug** (#83): Fix analytics system losing historical data on server restart
  - Analytics system now properly loads existing metrics from disk on startup
  - Historical usage data is preserved across MCP server restarts 
  - New metrics are appended to existing data instead of overwriting
  - Prevents permanent loss of analytics trends and insights
- **ES Module Compatibility** (#83): Fix require() usage causing MCP server startup failures
  - Replace require('path').join() with ES module compatible new URL() syntax
  - Ensure analytics directory creation works correctly in all environments
  - Resolve import errors that prevented MCP server from starting
- **Daily Note Template Inconsistency** (#86): Fix tp-daily template not being applied consistently
  - Implemented comprehensive template management system with 24-hour caching
  - Daily notes now automatically use the template specified in `.obsidian/daily-notes.json`
  - Added Templater syntax processing for `<% tp.date.now() %>` and `<% tp.file.title %>`
  - Replaced hardcoded daily note content with dynamic template integration
  - Added fallback to minimal template when user template is unavailable
  - Supports relative date formats (yesterday, tomorrow, +1, -3) in date resolution
- **Date Resolution Diagnostics** (#87): Enhanced logging for date resolution debugging
  - Added detailed logging throughout DateResolver parsing pipeline
  - get_daily_note tool now logs date resolution steps
  - Helps diagnose intermittent timezone-related issues
- **Tasks Missing Creation Date** (#89): Fix tasks inserted via MCP server missing creation date notation
  - Tasks now automatically include creation date in Obsidian Tasks Plugin format (➕ YYYY-MM-DD)
  - Intelligent detection preserves existing creation dates to avoid duplication
  - Maintains proper property order as per Obsidian Tasks Plugin specification
  - Works seamlessly with daily note workflows and all insert_content operations
- **Section Targeting Improvements** (#88): Enhanced heading detection for insert_content tool
  - Added detailed logging for heading searches and failures
  - Improved error messages with heading suggestions when target not found
  - Lists available headings to help identify case sensitivity issues
  - Updated tool description to clarify "Day's Notes" heading usage
  - Prevents confusion about exact heading requirements
- **Task Insertion Order Verification** (#90): Investigated and verified correct task insertion behavior
  - Confirmed tasks are correctly appended at bottom of existing lists
  - Added 4 comprehensive integration tests for task insertion scenarios
  - Works correctly with empty sections, mixed content, and existing tasks
  - Issue may have been resolved by fixes #86-89 or confused with duplicate file issue

### Added
- **Automatic Task Creation Dates**: Tasks inserted via `insert_content` tool now automatically receive creation date notation
  - Implements Obsidian Tasks Plugin format with ➕ YYYY-MM-DD notation
  - Maintains proper property order: ➕ created, 🛫 start, ⏳ scheduled, 📅 due, 🔁 recurrence
  - Preserves existing creation dates without modification
  - Applies to all task insertions including daily notes workflow
  - See `examples/task-creation-date-example.md` for usage details
- **Template System Integration** (#86): Comprehensive template support for daily notes and general note creation
  - `TemplateManager` class with 24-hour template caching for performance
  - `ObsidianSettings` class for reading Obsidian configuration files
  - `TemplateParser` for processing Templater syntax in templates
  - `DateResolver` service for centralized date parsing and formatting
  - Template parameters added to `create_note` and `get_daily_note` tools
  - `useTemplate` flag in create_note to list available templates
  - `confirmCreation` parameter in get_daily_note for user confirmation flow
  - Automatic template discovery from Obsidian templates folder
  - Unit and integration tests for template functionality
- **Timezone Edge Case Tests** (#87): Comprehensive test coverage for date resolution
  - Tests for midnight boundary crossings across timezones
  - DST transition handling tests
  - Extreme timezone difference tests (UTC+14 to UTC-11)
  - User scenario simulations for late night/early morning sessions
- **Section Targeting Tests** (#88): Test coverage for heading-based content insertion
  - Unit tests for exact heading matching including "Day's Notes"
  - Integration tests for daily note task workflows
  - Tests to prevent duplicate file creation
  - Edge case tests for heading variations and case sensitivity

### Enhanced
- **Individual Tool Analytics**: Added analytics tracking to non-consolidated tools
  - get_daily_note tool now records execution metrics
  - Provides complete usage insights across all tool types
  - Maintains performance with <1ms overhead per tool call

### Planning - v2.0.0 Major Release
- Analytics-driven tool optimization based on real usage data
- Enhanced AI caller experience with production insights
- Potential breaking changes for optimal performance
- Advanced analytics features and dashboard enhancements

## [1.7.0] - 2025-06-05

### Added

- **Personal Development Analytics System** (#76): Lightweight telemetry for routing decisions and tool usage insights
  - Zero-maintenance HTML + Chart.js dashboard for visual analytics
  - <1ms overhead analytics collection with UsageMetrics interface
  - Tool usage frequency tracking and routing accuracy measurement
  - Performance insights: execution times, cache hit rates, retry patterns
  - Default enabled with opt-out configuration (DISABLE_USAGE_ANALYTICS=true)
  - Configurable dashboard port (default 19832) via ANALYTICS_DASHBOARD_PORT
  - Automatic data export every 5 minutes with graceful shutdown flushing
  - Real-time visual insights: tool distribution, performance bubbles, daily trends
  - Cross-machine sync ready with GitHub-stored default configuration

- **AI Tool Caller Optimization Complete** (#62): Full implementation of tool consolidation and intelligent routing
  - Universal Search Tool with intelligent auto-mode routing (6→1 consolidation)
  - Smart Note Creation with automatic template detection (2→1 consolidation)
  - Universal Listing Tool with auto-detection (4→1 consolidation)
  - Comprehensive backward compatibility with legacy tool aliases
  - Feature flags for gradual rollout and migration support
  - 100% routing accuracy with <123ms performance
  - Production-ready architecture for enhanced AI caller experience

### Added - AI Tool Caller Optimization Phase 2 (Complete in v1.7.0)

- **Tool Parity Integration Tests** (#80): Comprehensive validation framework ensuring consolidated tools match legacy tool outputs
  - Real MCP server testing with side-by-side comparison of legacy vs consolidated tools
  - 25+ test scenarios across search, creation, listing, and error handling categories
  - **95% output parity target** with sophisticated output normalization and comparison
  - Performance regression testing with <500ms maximum acceptable difference
  - Advanced test data generator with comprehensive scenario matrix
  - Standalone test runner (`scripts/test-tool-parity.js`) with category filtering and verbose debugging
  - Jest integration test suite with statistical validation and detailed reporting
  - NPM scripts for targeted testing (`npm run test:tool-parity`, `npm run test:tool-parity:search`)
  - Comprehensive test utilities and validation framework

- **Claude Desktop Integration Tests** (#82): Comprehensive validation framework for AI tool caller optimization
  - Real MCP server integration testing via JSON-RPC communication
  - 20 realistic user scenarios across search, creation, listing, and workflow categories
  - **95% tool selection accuracy achieved** (exceeds 90% target by 5%)
  - Performance validation with 32ms average response time
  - Standalone test runner (`scripts/test-claude-desktop.js`) for quick validation
  - Jest integration test suite with statistical validation
  - NPM scripts for easy test execution (`npm run test:claude-desktop`)
  - Comprehensive test documentation and troubleshooting guide

### Completed - AI Tool Caller Optimization Phase 1

- **AI Tool Caller Optimization**: Major consolidation of 21 tools down to 11 for better AI decision-making (#62)
  - **Universal Search Tool** (`search`): Consolidates 6 search tools with intelligent auto-mode routing (#71, #72)
    - Automatically detects optimal search strategy (quick, advanced, pattern, recent, content-type)
    - Multi-term OR query support by splitting into multiple searches
    - Intelligent fallback when advanced searches return no results
  - **Smart Note Creation** (`create_note_smart`): Consolidates 2 creation tools with auto-template detection (#73)
    - Automatically detects appropriate template based on title keywords
    - Supports all 12 available templates (restaurant, article, person, etc.)
  - **Universal List Tool** (`list`): Consolidates 4 listing tools into 1 (#74)
    - Single tool for folders, daily notes, templates, and YAML properties
  - **iCloud Sync Retry Logic**: Automatic retry with exponential backoff for file operations (#75)
    - Handles common iCloud sync errors (EBUSY, ENOENT, EPERM)
    - Configurable retry attempts and delays
  - **Backward Compatibility Aliases**: All legacy tools continue to work with deprecation warnings (#77)
  - **Output Validation Tests**: Comprehensive validation that consolidated tools match legacy outputs (#81)

### Changed
- **Search Routing Logic**: OR queries now route to quick search instead of advanced for better results
- **Template Detection**: Now uses actual available templates from the system
- **Error Handling**: More resilient file operations for macOS/iCloud environments

### Technical Details
- Implemented ToolRouter class for intelligent tool dispatch
- Added comprehensive output validation tests (#81)
- Improved search fallback strategies based on expert analysis
- Fixed regex handling issues in advanced search

## [1.6.0] - 2025-06-04

### Added
- **Advanced YAML Property Search Features**: Complete implementation of advanced search capabilities (#61)
  - New `includeNullValues` parameter for including notes where YAML properties don't exist or are null
  - Performance caching system with 5-minute TTL for improved search performance on large vaults
  - Enhanced error handling for robust title sorting with mixed data types
  - Cache management methods for memory optimization in long-running sessions
  - Comprehensive test suite validating all acceptance criteria
  - Updated documentation with advanced YAML property examples

### Enhanced
- **Search Performance**: Significant performance improvements for repeated searches
  - Note caching reduces file I/O operations on subsequent searches
  - Memory-efficient cache with automatic cleanup prevents memory leaks
  - Performance optimization tested and validated for vaults with 1000+ notes
- **Result Consistency**: Maintained SearchResult format compatibility across all search tools
- **Documentation**: Updated README.md with comprehensive examples for advanced YAML property matching

## [1.5.0] - 2025-06-04

### Added
- **Natural Language YAML Query Parsing**: AI-powered search capability (#70)
  - Transform conversational queries like "Quebec barbecue restaurants" into structured YAML property searches
  - Intelligent entity extraction for locations, cuisines, categories, and temporal references
  - Support for 50+ geographic entities (countries, provinces/states, cities) and 25+ cuisine types
  - Seamless integration with existing `advanced_search` tool via `naturalLanguage` parameter
  - Query interpretation feedback with confidence scoring and helpful suggestions
  - Graceful fallback to text search when entity recognition confidence is low
  - Real-world vault compatibility with resilient error handling for malformed YAML
  - Custom fallback parser recovers basic metadata from broken frontmatter
  - Silent error handling maintains MCP protocol compatibility
  - Foundation for future AI-powered vault management features

### Enhanced
- **Robust YAML Error Handling**: Production-ready resilience for real-world vaults
  - Custom fallback parser extracts metadata from malformed YAML frontmatter
  - Silent error recovery prevents crashes from template files and broken syntax
  - Graceful handling of Templater expressions and complex YAML structures
  - Maintains search functionality even with partially corrupted notes

## [1.4.0] - 2025-06-04

### Added
- **list_yaml_property_values tool**: Core YAML property value discovery and analysis (#57)
  - Analyzes all unique values used for a specific YAML property across the entire vault
  - Distinguishes between single values and array values for the same property
  - Identifies mixed usage patterns (property used both as single value and array)
  - Accurate deduplication with detailed usage statistics
  - Graceful handling of malformed YAML and missing properties
  - Returns structured JSON results matching the issue specification
  - Foundation for enhanced analytics and search capabilities in upcoming releases
  - Part of the comprehensive YAML Property Management Suite (#56)

### Removed
- **Deprecated Web Interface** (2025-01-06): Removed `public/` folder containing the legacy web interface
  - The built-in HTTP web interface has been deprecated in favor of OpenWebUI integration
  - OpenWebUI provides a more robust, feature-rich interface for mobile and desktop access
  - The HTTP server code remains for potential API usage but static files are no longer needed
  - See docs/02-strategic-docs/OpenWebUI-Integration-Strategy.md for migration details

## [1.3.0] - 2025-06-02

### Added
- **list_yaml_properties tool**: Discover and analyze YAML frontmatter properties across vault (#53)
  - Lists all unique YAML property names used in the vault
  - Optional usage count feature shows how many notes use each property
  - Sorting options: alphabetical or by usage frequency
  - Option to exclude standard LifeOS properties to focus on custom fields
  - Helps identify inconsistent property naming and data quality issues
  - Supports vault analysis and cleanup planning

## [1.2.1] - 2025-06-02

### Added
- **insert_content tool**: Context-aware content insertion within notes (#29)
  - Supports targeting by heading text (e.g., "## Today's Tasks")
  - Supports targeting by block reference (e.g., "^block-id")
  - Supports targeting by text pattern matching
  - Supports targeting by specific line number
  - Configurable position options: before, after, append, prepend, end-of-section
  - Automatic newline handling for proper formatting
  - Preserves existing note structure and frontmatter
  - Works with both file paths and note titles

### Fixed
- **Race condition in insert_content**: Resolved intermittent "Cannot read properties of undefined (reading 'join')" error (#29)
  - Added comprehensive array validation before join operations
  - Simplified end-of-section logic for non-heading targets (converts to 'after')
  - Enhanced bounds checking and defensive programming throughout
  - Maintained complex section-finding logic only for heading targets where conceptually appropriate

## [1.2.0] - 2025-01-29

### Added
- **YAML Rules Integration**: New `get_yaml_rules` tool for referencing custom YAML frontmatter guidelines (#19)
  - Added optional `yamlRulesPath` configuration to reference user's YAML rules document
  - Created YamlRulesManager class with file caching and validation
  - Updated `create_note`, `edit_note`, and `create_note_from_template` tools to reference YAML rules
  - Supports any document format (markdown, YAML, text) for maximum flexibility
  - Gracefully handles missing or unconfigured rules files

- **Comprehensive Deployment Documentation** (#15)
  - Added `docs/DEPLOYMENT.md` - Complete deployment guide with system requirements, installation methods, and client configuration
  - Added `docs/TROUBLESHOOTING.md` - Extensive troubleshooting guide covering common issues and solutions
  - Added automated setup script `scripts/setup.sh` with interactive configuration and validation
  - Auto-generation of client configurations for Claude Desktop, Raycast, and Cursor IDE
  - Command-line options for setup script (--skip-deps, --skip-config, --silent, --help)

- **Professional Project Structure**
  - Moved utility scripts to `scripts/` directory for better organization
  - Added `tests/` directory structure with unit, integration, and fixtures subdirectories
  - Added comprehensive `tests/README.md` with testing guidelines
  - Added GPL v3.0 license (`LICENSE.md`)
  - Updated `package.json` with repository metadata and proper licensing

### Fixed
- **Template Discovery**: Fixed YAML parsing errors for templates with Templater syntax (#17)
  - Added preprocessing to handle Templater expressions before YAML parsing
  - Removed all console output for MCP protocol compatibility
  - All 12 templates now parse successfully without errors
  - Added silent error tracking for debugging template issues

### Changed
- **Project Organization**: Reorganized file structure for better maintainability
  - Scripts consolidated in `scripts/` directory
  - Removed redundant `setup.md` (superseded by comprehensive `docs/DEPLOYMENT.md`)
  - Updated `.gitignore` for new structure and generated files
  - Updated documentation references to reflect new script locations

## [1.1.1] - 2025-01-29

### Fixed
- **move_items tool**: Removed unsupported `oneOf` constraint from schema that was causing API errors

## [1.1.0] - 2025-01-29

### Added
- **move_items tool**: Move notes and folders within the vault (#26)
  - Supports single item moves with `item` parameter
  - Supports batch operations with `items` array parameter
  - Auto-detects whether items are files or folders
  - Options for creating destination folders (`createDestination`)
  - Options for overwriting existing files (`overwrite`)
  - Options for merging folders (`mergeFolders`)
  - Comprehensive error handling and reporting
  - Prevents circular references when moving folders

### Changed
- **File Naming Convention**: Notes now preserve spaces and special characters in filenames (#25)
  - Spaces are no longer replaced with dashes
  - Most special characters are preserved (except square brackets, colons, and semicolons which Obsidian doesn't support)
  - Examples: "My Note Title" creates "My Note Title.md" instead of "My-Note-Title.md"
  - This applies to both `create_note` and `create_note_from_template` tools