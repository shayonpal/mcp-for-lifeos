# Changelog

All notable changes to the LifeOS MCP Server will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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