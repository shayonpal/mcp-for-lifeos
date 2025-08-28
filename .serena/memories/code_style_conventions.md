# Code Style and Conventions

## TypeScript Configuration
- **Target**: ES2022
- **Module System**: ESNext with ES module interop
- **Strict Mode**: Enabled (strict: true)
- **Module Resolution**: Node
- **Path Structure**: src/ → dist/

## Code Style Patterns
Based on the codebase analysis:

### Naming Conventions
- **Files**: Kebab-case (e.g., `template-manager.ts`, `yaml-rules-manager.ts`)
- **Classes/Interfaces**: PascalCase
- **Constants**: UPPER_SNAKE_CASE (e.g., `SERVER_VERSION`, `CONSOLIDATED_TOOLS_ENABLED`)
- **Functions/Variables**: camelCase

### Import Style
- ES module imports (import/export syntax)
- Type imports separated where applicable
- Relative imports for local modules

### File Organization
- Core functionality split into focused modules
- Separate directories for major features (server/, analytics/)
- Types centralized in `types.ts`
- Configuration in dedicated config files

### Error Handling
- Try-catch blocks with proper error logging
- Graceful degradation (e.g., template fallbacks)
- Diagnostic tools for debugging

### Testing Structure
- Separate unit and integration test directories
- Jest configuration with TypeScript support
- Multiple test scripts for different scenarios

## Special Conventions

### Analytics System
- Telemetry enabled by default
- Metrics persisted to disk
- Session-based tracking

### Template System
- Dynamic template discovery
- Templater syntax support (`<% %>`)
- 24-hour caching for performance

### Date Handling
- Uses date-fns for manipulation
- Supports relative dates (yesterday, tomorrow, +1, -3)
- Timezone awareness

### YAML Compliance
- Strict frontmatter validation
- Custom rules integration
- Auto-managed fields protection

## Quality Checks
1. **Type Safety**: Always run `npm run typecheck` (not just lint)
2. **Testing**: Include both unit and integration tests
3. **Documentation**: Maintain CHANGELOG.md with Keep a Changelog format
4. **Version Control**: Semantic versioning (major.minor.patch)