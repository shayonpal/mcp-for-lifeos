# Changelog

All notable changes to the LifeOS MCP Server will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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