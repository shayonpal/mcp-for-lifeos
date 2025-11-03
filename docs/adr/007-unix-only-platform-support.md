# ADR-007: Unix-Only Platform Support (macOS, Linux)

**Status**: Accepted
**Date**: 2025-11-03
**Deciders**: Project Owner
**Technical Story**: MCP-100 - Investigation of cross-platform npm script compatibility

## Context and Problem Statement

During the implementation of MCP-100 (fixing memory test infrastructure), GitHub Copilot raised a concern about cross-platform compatibility of the npm script:

```json
"test:integration": "node --expose-gc ./node_modules/.bin/jest tests/integration"
```

This script uses a direct path to the Jest binary which would fail on Windows (cmd.exe/PowerShell) because it references the Unix shell script instead of the Windows `.cmd` file. The standard solution would be to use `cross-env` with `NODE_OPTIONS` for true cross-platform support.

**Key Question**: Should this project invest in Windows compatibility?

## Decision Drivers

### Target User Base
- **Primary user**: macOS developer (project owner)
- **MCP Server deployment**: macOS and Linux environments
- **Claude Desktop**: Primarily used on macOS
- **Raycast integration**: macOS-exclusive (per docs/guides/README.md)
- **No Windows contributors**: Zero Windows development activity to date

### Development Resources
- **Solo developer project**: Limited time and resources
- **No Windows testing infrastructure**: No access to Windows machines for testing
- **No CI for Windows**: GitHub Actions only runs on `ubuntu-latest`
- **Maintenance burden**: Supporting Windows adds complexity without benefit

### Technical Ecosystem
- **Node.js engines**: `>=18.0.0` (works on all platforms)
- **Dependencies**: All compatible with Unix systems
- **File system operations**: Uses POSIX path conventions throughout
- **iCloud sync resilience**: macOS-specific features in codebase (README.md:18)

### Future Outlook
- **Claude Desktop Windows support**: Not a priority for user's workflow
- **WSL exists**: Windows developers can use WSL2 if needed
- **Market reality**: Most MCP server users are on macOS/Linux

## Decision

**Accept Unix-only platform support (macOS, Linux) as the official scope.**

Do not invest time or resources in Windows-native compatibility. This includes:
- No cross-env dependency for npm scripts
- No Windows CI runners
- No Windows-specific path handling
- No testing on Windows environments

## Rationale

1. **Zero Windows users**: No evidence of Windows usage or demand
2. **Resource efficiency**: Solo project with limited time
3. **WSL alternative**: Windows developers can use WSL2 (full Unix compatibility)
4. **Reduced complexity**: Simpler codebase without cross-platform abstractions
5. **Fast iteration**: Focus on core MCP features, not platform support
6. **Honest documentation**: Clear about supported platforms

## Consequences

### Positive
- **Faster development**: No cross-platform testing overhead
- **Simpler npm scripts**: Can use Unix conventions directly
- **Reduced dependencies**: No need for `cross-env`, `cross-spawn`, etc.
- **Clear expectations**: Users know what platforms are supported
- **Focus on value**: Time spent on MCP features, not platform abstraction

### Negative
- **Windows users excluded**: Native Windows users cannot run the server
- **Contribution barrier**: Windows developers must use WSL to contribute
- **Documentation claims**: Must update any "cross-platform" claims

### Neutral
- **WSL exists**: Windows users have a path forward (WSL2)
- **npm ecosystem**: Most Node.js tools work on WSL
- **Future flexibility**: Can add Windows support later if demand emerges

## Implementation

### Update Documentation

**1. README.md - Add Platform Support Section:**

```markdown
## Platform Support

**Supported Platforms:**
- ✅ macOS (primary development platform)
- ✅ Linux (tested on Ubuntu)
- ⚠️ Windows: Use WSL2 (Windows Subsystem for Linux)

**Note**: Native Windows (cmd.exe/PowerShell) is not supported. Windows users should use WSL2 for full compatibility.
```

**2. docs/guides/README.md - Update Integration Table:**

Change:
```markdown
| **Claude Desktop** | General AI assistance with vault access | Medium | macOS, Windows |
```

To:
```markdown
| **Claude Desktop** | General AI assistance with vault access | Medium | macOS, Linux |
```

**3. CLAUDE.md - Add Platform Note:**

Add after line 68 (engines):
```markdown
## Platform Support
- macOS (primary)
- Linux (Ubuntu 18.04+)
- Windows: WSL2 only
```

### Accept Current npm Scripts

Keep the current implementation:
```json
"test:integration": "node --expose-gc ./node_modules/.bin/jest tests/integration"
```

**Rationale**: Works correctly on supported platforms (macOS, Linux). No need for `cross-env`.

### Respond to Copilot's PR Comment

Post clarifying comment on PR #135:

> Thanks for the review! This is a valid observation about Windows compatibility. However, this project officially supports only Unix-like platforms (macOS, Linux). Windows users should use WSL2. See ADR-007 for the full decision rationale.
>
> Current implementation works correctly on all supported platforms. No changes needed.

## Compliance

### Documentation Audit Needed

- [x] README.md - Add platform support section
- [x] docs/guides/README.md - Update Claude Desktop integration table
- [x] CLAUDE.md - Add platform note
- [ ] Update any other "cross-platform" claims

## Related Decisions

- **ADR-002**: Strategic pivot to core server (focus over breadth)
- **ADR-004**: Project review and roadmap (resource prioritization)

## Notes

**If Windows demand emerges in the future:**
1. Add `cross-env` as dev dependency
2. Update npm scripts to use `NODE_OPTIONS` pattern
3. Add Windows CI runners (GitHub Actions)
4. Test on native Windows (not just WSL)
5. Update this ADR to "Superseded"

**Current status**: No demand, no investment needed.
