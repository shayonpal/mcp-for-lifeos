# get_server_version Tool Documentation

## Tool Overview

**Name:** `get_server_version`  
**Purpose:** Get the current server version and capabilities information  
**Status:** Active (Server information tool)  
**Category:** Server Management  
**Type:** Information/Discovery

## TL;DR

Quick summary: Returns MCP server version, capabilities, and configuration. Optionally includes complete tool list with descriptions. Useful for debugging, compatibility checks, and understanding server features.

## Key Features

- **Server Version Information**: Current semantic version (e.g., 1.7.0)
- **Template Availability Count**: Number of discovered Obsidian templates
- **Configuration Status**: Vault path and YAML rules configuration
- **Capabilities Summary**: Feature overview and integration points
- **Optional Tool Listing**: Complete tool inventory with descriptions
- **Version History**: Release timeline and feature introductions
- **Feature Flags Status**: Analytics and web interface configuration

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `includeTools` | boolean | No | `false` | Include full list of available tools in response |

### Parameter Details

- **includeTools**: When set to `true`, appends a complete list of all available tools with their descriptions to the response. Useful for discovering available functionality and tool capabilities.

## Response Information

The tool returns comprehensive server information organized into sections:

### Server Information

- **Version**: Current MCP server version following semantic versioning (MAJOR.MINOR.PATCH)
- **Templates Available**: Count of templates discovered by the DynamicTemplateEngine
- **Vault Path**: Configured Obsidian vault location (displays folder name only for privacy)

### Capabilities

- **Template System**: Dynamic template processing with Templater syntax support
- **Search**: Advanced full-text search with metadata filtering capabilities
- **Daily Notes**: Automated daily note creation and management
- **YAML Validation**: Strict compliance checking with LifeOS standards
- **Obsidian Integration**: Direct vault linking and file operations

### Version History

Detailed changelog of major releases including:

- **1.7.0**: Current version with latest features
- **1.6.0**: Advanced YAML Property Search Features
- **1.5.0**: Natural Language YAML Query Parsing
- **1.4.0**: YAML property value analysis tools
- **1.3.0**: YAML property discovery tools
- **1.2.0**: YAML rules integration
- **1.1.x**: Move operations and bug fixes
- **1.0.x**: Initial release and stability fixes

### Tool List (when includeTools=true)

When requested, provides complete tool inventory with:

- Tool name
- Description
- Current status (active/legacy/consolidated)
- Functional category

## Usage Examples

### Basic Version Check

```json
{
  "name": "get_server_version"
}
```

Returns server version, template count, vault path, capabilities overview, and version history.

### Full Capabilities Query with Tools

```json
{
  "name": "get_server_version",
  "arguments": {
    "includeTools": true
  }
}
```

Returns all basic information plus complete list of available tools with descriptions.

### Compatibility Verification

Use this tool at session start to verify server capabilities before using advanced features:

```json
{
  "name": "get_server_version",
  "arguments": {
    "includeTools": true
  }
}
```

### Feature Discovery

When integrating new workflows, use this tool to understand available functionality and plan tool usage strategies.

## Version Information Details

### Semantic Versioning

- **MAJOR**: Breaking changes to API or core functionality
- **MINOR**: New features added in backward-compatible manner
- **PATCH**: Bug fixes and minor improvements

### Release Timeline

- **1.7.x**: Latest stable with enhanced search and tool consolidation
- **1.6.x**: Advanced YAML property operations
- **1.5.x**: Natural language query processing
- **1.4.x**: Metadata analysis tools
- **1.3.x**: Property discovery capabilities
- **1.2.x**: YAML rules integration
- **1.1.x**: File operations and organization
- **1.0.x**: Foundation release with core features

### Breaking Changes

- **1.0.0**: Initial public API establishment
- Major version bumps indicate API changes requiring client updates

### Deprecation Notices

- Check version history for deprecated features
- Legacy tools maintained for backward compatibility
- Migration paths documented in version notes

## Configuration Status

### Vault Path Configuration

- Displays configured Obsidian vault location
- Shows folder name only (privacy protection)
- Indicates if vault is accessible and readable

### YAML Rules Configuration

- Reports if YAML rules file is configured
- Indicates validation capabilities status
- Shows compliance checking availability

### Template Discovery Status

- Reports number of templates found
- Indicates template system functionality
- Shows dynamic template processing capability

### Analytics Configuration

- Analytics enabled/disabled status
- Usage tracking configuration
- Performance monitoring availability

### Web Interface Status

- Web interface availability (typically disabled for Claude Desktop)
- Port configuration when enabled
- Dashboard accessibility status

## Tool List Format (when includeTools=true)

When `includeTools` is set to `true`, the response includes a comprehensive tool list:

```
## Available Tools
- **tool_name:** Tool description and primary functionality
- **another_tool:** Description with key features and use cases
- **consolidated_tool:** Unified tool replacing multiple legacy tools
```

### Tool Categories

Tools are organized by functional areas:

- **Search & Discovery**: Finding and analyzing content
- **Content Creation**: Note and template management
- **Organization**: Moving, filing, and structuring content
- **Analysis**: YAML property examination and validation
- **Maintenance**: Vault health and diagnostic tools
- **Information**: Server status and configuration tools

### Status Indicators

- **Active**: Current recommended tools
- **Legacy**: Maintained for compatibility, prefer consolidated versions
- **Consolidated**: Unified tools replacing multiple legacy tools
- **Experimental**: Beta features under development

## Use Cases

### Debugging Connection Issues

First step when troubleshooting MCP server connectivity:

- Verify server is responding
- Check version compatibility
- Confirm basic functionality

### Verifying Server Setup

During initial configuration or after updates:

- Confirm vault path is correctly configured
- Verify template discovery is working
- Check YAML rules are loaded

### Checking Feature Availability

Before using advanced features:

- Confirm required tools are available
- Verify server capabilities match requirements
- Plan workflow based on available functionality

### Tool Discovery

For new users or workflow development:

- Explore complete tool inventory
- Understand tool descriptions and purposes
- Plan integration strategies

### Compatibility Checks

Before client updates or integration changes:

- Verify server version compatibility
- Check for deprecated features
- Confirm API stability

## Implementation Details

### Version Constant

```typescript
export const SERVER_VERSION = '1.7.0';
```

Server version is defined as a constant and used throughout the application for consistency.

### Template Counter

```typescript
const templateCount = DynamicTemplateEngine.getAllTemplates().length;
```

Template count is dynamically retrieved from the template engine to reflect current discovery status.

### Tool Registry

Tool list is generated from the server's tool registry, ensuring accurate representation of available functionality.

### Configuration Access

Server accesses LIFEOS_CONFIG for vault path and configuration status reporting.

### Response Formatting

Output formatted as markdown for readability and structured presentation of information.

## Best Practices

### Check Version Before Operations

Start sessions with version check to ensure compatibility:

```json
{"name": "get_server_version"}
```

### Cache Response for Session

Cache version information to avoid repeated calls within same session.

### Use for Initial Handshake

Recommended first call when establishing MCP server connection.

### Verify Features Before Use

Check capabilities before attempting advanced operations:

- YAML rules availability for validation
- Template system for note creation
- Search capabilities for content discovery

### Monitor Version Changes

Track version updates for:

- New feature availability
- Deprecation warnings
- Breaking change notifications

## Integration Points

### Claude Desktop Compatibility

- Pure MCP server communication via stdio
- No web interface dependencies
- Full tool compatibility guaranteed

### Raycast Integration Check

- Verify MCP server accessibility
- Confirm tool availability for AI commands
- Check `@lifeos-mcp` mention support

### API Version Verification

- Confirm MCP protocol compatibility
- Verify tool schema versions
- Check for deprecated interfaces

### Client Capability Negotiation

- Understand server limitations
- Plan feature usage based on capabilities
- Optimize tool selection for performance

## Related Tools

### Complementary Tools

- **`list`** with `type='templates'`: Get detailed template information
- **`diagnose_vault`**: Comprehensive vault health check
- **`get_yaml_rules`**: YAML configuration and rules reference

### Workflow Integration

- Use before `search` operations to verify search capabilities
- Check before `create_note_smart` to confirm template availability
- Verify before `list_yaml_properties` to ensure YAML processing

### Information Hierarchy

1. **get_server_version**: Overall server status and capabilities
2. **diagnose_vault**: Detailed vault health and file analysis
3. **get_yaml_rules**: Specific YAML configuration details

## Version History Tracking

### Understanding Version Numbers

- **Major** (x.0.0): Breaking API changes
- **Minor** (1.x.0): New features, backward compatible
- **Patch** (1.7.x): Bug fixes and improvements

### Feature Introduction Timeline

- **Template System**: Available since 1.0.0
- **YAML Rules**: Introduced in 1.2.0
- **Property Discovery**: Added in 1.3.0
- **Property Analysis**: Enhanced in 1.4.0
- **Natural Language Queries**: Added in 1.5.0
- **Advanced Search**: Enhanced in 1.6.0
- **Tool Consolidation**: Implemented in 1.7.0

### Backward Compatibility Notes

- Legacy tools maintained for existing integrations
- Deprecated features documented with migration paths
- API stability preserved across minor versions
- Breaking changes only in major version updates

## Error Handling

### Common Issues

- **Server Unresponsive**: Check MCP server process status
- **Configuration Errors**: Verify vault path accessibility
- **Template Discovery Failures**: Check template folder permissions
- **YAML Rules Missing**: Verify yamlRulesPath configuration

### Troubleshooting

1. Verify MCP server is running
2. Check stdout/stderr for error messages
3. Confirm vault path is accessible
4. Validate configuration file syntax
5. Test with minimal parameters first

### Recovery Strategies

- Restart MCP server process if unresponsive
- Verify file system permissions for vault access
- Reconfigure paths if vault location changed
- Update configuration for missing YAML rules

## Performance Considerations

### Response Time

- Basic version info: <10ms typical response
- With tools list: <50ms due to tool registry enumeration
- Template count: Variable based on discovery cache status

### Memory Usage

- Minimal memory footprint for basic version info
- Tool list generation requires registry traversal
- Template counting may trigger discovery if cache expired

### Optimization

- Cache template count for performance
- Tool list generated on-demand only
- Configuration status cached at startup

## Security Considerations

### Information Disclosure

- Vault path shows folder name only (privacy protection)
- No sensitive configuration details exposed
- Version information is safe to share

### Access Control

- No authentication required (read-only information)
- No file system access beyond configuration
- Safe for all client types and contexts

This tool serves as the primary entry point for understanding MCP server capabilities and should be used as the first step in any integration or troubleshooting workflow.
