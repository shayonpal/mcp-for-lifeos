# diagnose_vault Tool Documentation

## Tool Overview

- **Name**: `diagnose_vault`
- **Purpose**: Diagnose vault issues and check for problematic files
- **Status**: ✅ Active (Vault health check tool)

The `diagnose_vault` tool is a comprehensive health check system for your Obsidian vault. It scans notes for parsing errors, malformed frontmatter, file access issues, and provides detailed diagnostics to help maintain vault integrity.

## TL;DR

Health check for your Obsidian vault. Scans notes for YAML parsing errors, malformed frontmatter, and file access issues. Returns detailed report with problem files and error types. Essential for troubleshooting vault issues after imports, migrations, or template changes. Default scans 100 files for performance - use `maxFiles` to adjust.

## Key Features

- **YAML Frontmatter Validation**: Detects and reports YAML parsing errors in note frontmatter
- **File Access Verification**: Checks file read permissions and access issues
- **Bulk File Scanning**: Efficiently processes multiple notes in a single operation
- **Detailed Error Reporting**: Provides specific error messages for each problematic file
- **Performance Metrics**: Reports scan statistics and processing information
- **Configurable Scan Limits**: Adjustable file limits to balance thoroughness with performance
- **Graceful Error Handling**: Continues scanning even when individual files fail
- **Problem File Identification**: Clear identification of files requiring attention

## Parameters

### Optional Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `checkYaml` | boolean | `true` | Enable YAML parsing validation for frontmatter |
| `maxFiles` | number | `100` | Maximum number of files to scan (performance limit) |

### Parameter Details

**`checkYaml`** (boolean, optional, default: `true`)

- Enables detailed YAML frontmatter validation
- Checks for undefined/null values in frontmatter
- Validates YAML structure and syntax
- Set to `false` to skip YAML validation and focus on file access only

**`maxFiles`** (number, optional, default: `100`)

- Limits the number of files processed in a single scan
- Default of 100 provides good performance for regular health checks
- Increase for comprehensive vault audits
- Large values may impact performance on extensive vaults

## Diagnostic Checks Performed

### YAML Parsing Validation

When `checkYaml` is enabled (default), the tool performs:

- **Syntax Validation**: Ensures YAML frontmatter follows proper syntax
- **Structure Verification**: Checks for proper `---` delimiter placement
- **Value Type Checking**: Identifies undefined or null values in frontmatter
- **Encoding Validation**: Detects character encoding issues
- **Delimiter Completeness**: Ensures opening and closing `---` markers are present

### File Access Verification

For all scanned files, the tool checks:

- **File Existence**: Verifies files exist at expected paths
- **Read Permissions**: Ensures files can be accessed and read
- **File System Issues**: Detects iCloud sync problems or file locks
- **Path Resolution**: Handles spaces and special characters in file paths
- **Content Parsing**: Tests basic content extraction capabilities

### Frontmatter Structure Analysis

Advanced YAML checks include:

- **Required Field Validation**: Checks for LifeOS-compliant field structure
- **Data Type Consistency**: Ensures field types match expected formats
- **Array/String Validation**: Validates list and string field formatting
- **Special Character Handling**: Identifies unescaped special characters
- **Indentation Verification**: Checks proper YAML indentation

## Usage Examples

### Quick Health Check (Default)

```javascript
// Scan up to 100 files with full YAML validation
{
  "checkYaml": true,
  "maxFiles": 100
}
```

### Full Vault Scan

```javascript
// Comprehensive scan of entire vault
{
  "checkYaml": true,
  "maxFiles": 10000
}
```

### YAML-Only Check

```javascript
// Focus on YAML issues, default file limit
{
  "checkYaml": true
}
```

### Skip YAML Validation

```javascript
// File access check only, no YAML parsing
{
  "checkYaml": false,
  "maxFiles": 200
}
```

### Limited Performance Scan

```javascript
// Quick check with reduced file count
{
  "checkYaml": true,
  "maxFiles": 50
}
```

### Large Vault Audit

```javascript
// Thorough scan for large vaults
{
  "checkYaml": true,
  "maxFiles": 5000
}
```

## Response Structure

The diagnostic report includes comprehensive scanning results:

### Report Sections

**Header Statistics**:

- Total files checked
- Successfully parsed files count
- Number of problematic files identified
- Scan configuration summary

**Problematic Files List**:

- File path (relative to vault root)
- Specific error message
- Error type classification
- Context information when available

**Performance Metrics**:

- Processing time
- Files per second scan rate
- Memory usage indicators
- iCloud sync status (macOS)

**Recommendations**:

- Specific fix suggestions for common issues
- Best practices for prevention
- Related tools for repairs

### Example Response Format

```
# Vault Diagnostic Report

**Files Checked:** 100
**Successfully Parsed:** 95
**Problematic Files:** 5

## Problematic Files

1. **people/john-doe.md**
   Error: YAMLException: Unexpected token at line 4, column 12

2. **restaurants/cafe-metro.md**
   Error: Contains undefined/null values

3. **projects/old-project.md**
   Error: Failed to read file: ENOENT

4. **templates/meeting-template.md**
   Error: YAMLException: Missing closing --- delimiter

5. **articles/research-notes.md**
   Error: Contains undefined/null values

## Recommendations

- Fix YAML frontmatter in problematic files
- Check for unescaped special characters in YAML
- Ensure proper indentation and syntax
- Verify file permissions and access
```

## Common Issues Detected

### YAML Structure Problems

**Missing Closing Delimiter**:

```yaml
---
title: My Note
content type: article
# Missing closing ---
```

**Invalid YAML Indentation**:

```yaml
---
title: My Note
tags:
  - work
    - project  # Incorrect indentation
---
```

**Unquoted Special Characters**:

```yaml
---
title: My Note: A Study  # Colon needs quoting
description: 100% complete  # Percent needs quoting
---
```

### Data Type Issues

**Mixed Array/String Values**:

```yaml
---
tags: "work, project"  # Should be array
people: 
  - John Doe
  - "Jane Smith"  # Inconsistent quoting
---
```

**Undefined/Null Values**:

```yaml
---
title: My Note
category: null  # Detected as problematic
rating: undefined  # Invalid YAML value
---
```

### File Access Problems

**Permission Errors**:

- Files locked by other applications
- Insufficient read permissions
- iCloud sync conflicts on macOS

**Path Issues**:

- Special characters in filenames
- Spaces not properly handled
- Broken symbolic links

## Error Types

The tool classifies errors into specific categories:

### YAML Parse Error

- **Cause**: Malformed YAML syntax in frontmatter
- **Symptoms**: YAMLException messages, parsing failures
- **Impact**: Note frontmatter not accessible for metadata operations
- **Fix**: Correct YAML syntax, add missing delimiters, fix indentation

### File Read Error

- **Cause**: File system access denied or file not found
- **Symptoms**: ENOENT, EPERM, EBUSY error codes
- **Impact**: Note completely inaccessible to MCP operations
- **Fix**: Check file permissions, resolve iCloud sync issues

### Encoding Error

- **Cause**: Invalid character encoding in file content
- **Symptoms**: UTF-8 parsing failures, character replacement
- **Impact**: Content corruption, search indexing problems
- **Fix**: Re-save file with UTF-8 encoding

### Structure Error

- **Cause**: Missing or malformed frontmatter delimiters
- **Symptoms**: Frontmatter not recognized, content parsing issues
- **Impact**: Metadata extraction failures, template processing problems
- **Fix**: Add proper `---` delimiters at start and end of frontmatter

### Value Type Error

- **Cause**: Inappropriate data types in YAML fields
- **Symptoms**: Undefined/null values, type mismatches
- **Impact**: Search filtering problems, template variable issues
- **Fix**: Replace null/undefined with appropriate values

## Performance Considerations

### Default Limits

- **100 File Default**: Balances thoroughness with response time
- **Processing Speed**: ~50-100 files per second typical
- **Memory Usage**: Minimal, files processed sequentially
- **Response Time**: Usually under 5 seconds for default scan

### Large Vault Handling

- **Staged Scanning**: Process vault in chunks for large collections
- **Performance Impact**: Scanning 1000+ files may take 30+ seconds
- **Memory Management**: Tool processes files individually to minimize RAM usage
- **iCloud Considerations**: Sync delays may slow scanning on macOS

### Optimization Strategies

- **Regular Small Scans**: Run default 100-file checks frequently
- **Targeted Scans**: Focus on specific folders or recently modified files
- **Disable YAML**: Use `checkYaml: false` for faster file access checks
- **Batch Processing**: Run multiple smaller scans rather than one large scan

## Troubleshooting Guide

### Fixing YAML Errors

**Step 1: Identify the Problem**

```bash
# Use read_note to examine the problematic file
{
  "tool": "read_note",
  "arguments": {
    "notePath": "path/to/problematic-file.md"
  }
}
```

**Step 2: Common YAML Fixes**

```yaml
# Before (problematic)
---
title: My Note: A Study
tags: work, project
rating: null
---

# After (corrected)
---
title: "My Note: A Study"
tags: 
  - work
  - project
rating: 5
---
```

**Step 3: Validate Changes**

```javascript
// Re-run diagnostic on specific files
{
  "checkYaml": true,
  "maxFiles": 10  // Small batch to test fixes
}
```

### Fixing File Access Issues

**Permission Problems**:

1. Check file permissions in Finder (macOS) or file manager
2. Ensure Obsidian isn't exclusively locking files
3. Close other applications accessing the vault
4. Restart if iCloud sync appears stuck

**Path Resolution Issues**:

1. Verify file paths don't contain invalid characters
2. Check for broken symbolic links
3. Ensure vault path configuration is correct
4. Test with simple filename (no spaces/special chars)

### Bulk Repair Strategies

**Template-Based Fixes**:

```javascript
// Use edit_note to fix common patterns
{
  "tool": "edit_note",
  "arguments": {
    "notePath": "path/to/file.md",
    "frontmatter": {
      "title": "Corrected Title",
      "tags": ["proper", "array"]
    },
    "mode": "merge"
  }
}
```

**Systematic Approach**:

1. Run diagnostic to identify all problematic files
2. Group errors by type (YAML vs file access)
3. Fix YAML issues first (easier to automate)
4. Address file access problems individually
5. Re-run diagnostic to verify fixes

### Prevention Best Practices

**Template Management**:

- Validate templates before deploying
- Use consistent YAML structure across templates
- Test templates with edge cases

**Import Procedures**:

- Run diagnostic immediately after bulk imports
- Validate external content before importing
- Use consistent character encoding (UTF-8)

**Regular Maintenance**:

- Schedule weekly diagnostic scans
- Monitor vault health after major changes
- Keep backup of working configurations

## Implementation Details

### Scanner Architecture

- **File Discovery**: Uses `VaultUtils.findNotes('**/*.md')` for comprehensive file finding
- **Sequential Processing**: Processes files one at a time to avoid memory issues
- **Error Isolation**: Continues scanning even when individual files fail
- **Result Aggregation**: Collects all errors and statistics for final report

### Error Detection Methods

- **YAML Validation**: Uses gray-matter library with custom error handling
- **Fallback Parsing**: Attempts graceful recovery from malformed YAML
- **Value Analysis**: Checks for undefined/null values in parsed frontmatter
- **File System Integration**: Leverages Node.js fs operations with retry logic

### Handler Location

- **Main Implementation**: `src/index.ts` (lines 1699-1763)
- **File Operations**: `VaultUtils.readNote()` and `VaultUtils.findNotes()`
- **YAML Processing**: gray-matter library with custom parseWithFallback()
- **Error Handling**: Graceful degradation with detailed error capture

### Retry Logic

The tool incorporates iCloud-aware retry mechanisms:

- **iCloud Sync Delays**: Automatically retries file access on sync-related errors
- **File Lock Handling**: Waits and retries when files are temporarily locked
- **Permission Recovery**: Attempts multiple access methods for edge cases

## Best Practices

### For Regular Maintenance

1. **Weekly Scans**: Run default diagnostic weekly to catch issues early
2. **Post-Import Checks**: Always scan after importing external content
3. **Template Validation**: Test templates before widespread use
4. **Staged Repairs**: Fix high-priority errors (file access) before YAML issues

### For Development and Testing

1. **Pre-Commit Checks**: Run diagnostic before major vault changes
2. **Template Development**: Validate template output with diagnostic tool
3. **Migration Planning**: Use diagnostic to assess vault state before migrations
4. **Performance Monitoring**: Track scan times to identify vault performance issues

### For Large Vaults

1. **Incremental Scanning**: Use folder-specific scans for targeted analysis
2. **Batch Processing**: Process large vaults in manageable chunks
3. **Priority Triage**: Focus on recently modified files first
4. **Automated Scheduling**: Set up regular scans during off-peak hours

## Use Cases

### Post-Migration Validation

After migrating notes from other systems:

```javascript
// Comprehensive scan to validate migration
{
  "checkYaml": true,
  "maxFiles": 5000
}
```

### Template Debugging

When template-generated notes have issues:

```javascript
// Quick scan to identify template problems
{
  "checkYaml": true,
  "maxFiles": 100
}
```

### Import Troubleshooting

After importing external markdown files:

```javascript
// Focus on YAML validation for imports
{
  "checkYaml": true,
  "maxFiles": 1000
}
```

### Regular Maintenance

For routine vault health checks:

```javascript
// Standard weekly health check
{
  "checkYaml": true,
  "maxFiles": 100
}
```

### Performance Investigation

When vault operations seem slow:

```javascript
// Quick file access check
{
  "checkYaml": false,
  "maxFiles": 500
}
```

### Quality Assurance

Before sharing vault or templates:

```javascript
// Thorough validation scan
{
  "checkYaml": true,
  "maxFiles": 10000
}
```

## Related Tools

### For Problem Resolution

- **`read_note`**: Examine specific problematic files identified by diagnostic
- **`edit_note`**: Fix frontmatter and content issues in flagged files
- **`list`**: Find files in specific folders to target diagnostic scans
- **`search`**: Locate notes with specific error patterns or characteristics

### For Vault Management

- **`get_yaml_rules`**: Understand LifeOS YAML requirements for compliance
- **`list_yaml_property_values`**: Analyze property usage across the vault
- **`create_note_smart`**: Create properly formatted notes to avoid future issues
- **`move_items`**: Reorganize files that have path-related problems

### For Template Development

- **`list_templates`**: Review available templates for validation
- **`create_note_from_template`**: Test template output before deployment

### Diagnostic Workflow Integration

1. **`diagnose_vault`** → Identify problems
2. **`read_note`** → Examine specific issues  
3. **`edit_note`** → Fix identified problems
4. **`diagnose_vault`** → Verify fixes

## Analytics and Monitoring

When analytics are enabled (`DISABLE_USAGE_ANALYTICS=false`), the diagnostic tool tracks:

### Usage Metrics

- **Scan Frequency**: How often diagnostics are run
- **File Coverage**: Average and maximum files scanned per run
- **Error Patterns**: Most common error types and affected file patterns
- **Performance Trends**: Scan times and processing efficiency over time

### Health Insights  

- **Vault Quality Score**: Percentage of files passing validation
- **Error Rate Trends**: Whether vault health is improving or degrading
- **Problem File Hotspots**: Folders or file types with frequent issues
- **Resolution Effectiveness**: Whether fixes resolve problems permanently

### Performance Analytics

- **Scan Duration Patterns**: Identify performance bottlenecks
- **File Processing Rate**: Monitor scanning efficiency
- **Resource Usage**: Memory and CPU impact tracking
- **iCloud Sync Impact**: Correlation between sync status and scan performance

Access analytics via the analytics dashboard when `ENABLE_WEB_INTERFACE=true` or through server logs.
