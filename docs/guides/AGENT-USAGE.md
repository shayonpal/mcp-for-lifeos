# Agent Usage Guidelines

This guide describes the specialized agents available for the MCP for LifeOS project and when to use them.

## Available Agents

### web-researcher

**Purpose**: External documentation research

**Use when**:

- Researching API documentation, frameworks, or libraries
- Finding best practices for MCP server development
- Looking up external standards or specifications
- Investigating third-party integrations

**Examples**:

- "Research MCP protocol best practices"
- "Find TypeScript testing patterns for integration tests"
- "Look up Obsidian plugin API documentation"

### doc-search

**Purpose**: Find MCP implementation patterns and documentation

**Use when**:

- Looking for patterns within this codebase
- Finding similar implementations to reference
- Understanding how existing features work
- Locating relevant documentation files

**Examples**:

- "Find examples of error handling in existing tools"
- "Show me how other tools validate YAML"
- "Where is the template system documented?"

### linear-expert

**Purpose**: Linear issue management

**Use when**:

- Creating or updating Linear issues
- Querying issue status
- Managing project workflow
- Tracking cycle progress
- Linking commits to issues

**Examples**:

- "Create Linear issue for new feature"
- "What issues are in the current cycle?"
- "Update MCP-123 status to In Progress"

### git-expert

**Purpose**: Git write operations with MCP deployment practices

**Use when**:

- Committing changes
- Creating branches
- Managing pull requests
- Handling merge operations
- Ensuring Linear integration compliance

**Examples**:

- "Commit these changes with Linear issue reference"
- "Create PR for feature branch"
- "Merge feature branch to master"

**Note**: git-expert ensures proper MCP deployment practices and Linear integration during all git operations.

### agent-Plan

**Purpose**: Code exploration and architectural analysis using Serena MCP

**Use when**:

- Exploring unfamiliar code areas
- Understanding complex architectural patterns
- Analyzing codebase structure
- Finding implementation patterns before coding
- Investigating technical feasibility

**Examples**:

- "Explore the tool router architecture"
- "Analyze the search engine implementation patterns"
- "Find all template processing code"

**Note**: agent-Plan uses Serena MCP for efficient code exploration and should be preferred over manual code searching.

## Priority Order

When multiple agents could handle a task, use this priority:

1. **web-researcher** - External documentation and research
2. **doc-search** - Internal MCP documentation and patterns
3. **linear-expert** - Project management and issue tracking
4. **git-expert** - Git operations and deployment compliance
5. **agent-Plan** - Code exploration and architectural analysis

## Serena MCP Integration

**Serena MCP** provides advanced code analysis, memory management, and symbolic operations.

**Reference**: See Serena MCP documentation for full API details

**Use Serena for**:

- Symbol-level code navigation
- Finding references and dependencies
- Code refactoring operations
- Memory-based project context
- Advanced search patterns

## Best Practices

**Use agents proactively**:

- Don't wait for issues - engage agents early in planning
- Run agents in parallel when tasks are independent
- Combine agent expertise when beneficial

**Match agent to task type**:

- **Research**: web-researcher, doc-search
- **Execution**: git-expert, linear-expert
- **Code analysis**: agent-Plan, Serena MCP

**Provide clear context**:

- Share relevant issue IDs (if using issue tracking)
- Specify which files or components are involved
- Mention any constraints or requirements
- Reference related documentation

## Examples

### Feature Development Workflow

1. **Research**: web-researcher finds best practices and documentation
2. **Code Patterns**: doc-search locates similar implementations
3. **Code Exploration**: agent-Plan explores architecture and patterns
4. **Implementation**: Use Serena MCP for code navigation and analysis
5. **Issue Tracking**: Update issue tracking system (if using)
6. **Deployment**: git-expert commits and creates PR

### Bug Fix Workflow

1. **Analysis**: doc-search finds similar code patterns and existing fixes
2. **Code Exploration**: agent-Plan analyzes affected code areas
3. **Research**: web-researcher investigates external solutions if needed
4. **Implementation**: Serena MCP for precise code changes
5. **Issue Updates**: Track progress in issue tracking system
6. **Deployment**: git-expert commits with issue reference
