# Changelog

All notable changes to the LifeOS MCP Server will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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