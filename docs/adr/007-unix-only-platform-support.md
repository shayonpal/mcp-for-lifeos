# ADR-007: Unix-Only Platform Support

**Status**: Accepted
**Date**: 2025-11-03
**Deciders**: Lead Developer
**Technical Story**: MCP-100 - Cross-platform compatibility considerations

## Context and Problem Statement

During code review of MCP-100 (integration test script update), a suggestion was made to use cross-platform compatible approaches (like `cross-env` or `npx`) instead of direct Node.js binary paths to support Windows systems. This raised the question: should this project officially support Windows as a platform?

**Key Considerations**:

- Current user base and deployment targets
- Development and maintenance resources
- Primary integration platforms (Raycast is macOS-only)
- Testing infrastructure requirements
- Windows compatibility via WSL2

## Decision Drivers

### User Base Analysis

- **Zero Windows users** reported to date (2024-2025)
- **Zero Windows contributors** in project history
- **Primary deployment**: macOS (personal use, Raycast integration)
- **Secondary deployment**: Linux (potential future cloud deployments)

### Resource Constraints

- **Solo developer project** with limited time
- **No Windows testing environment** available
- **No Windows-specific bug reports** to date
- **Focus needed** on core MCP server functionality

### Primary Platform Dependencies

- **Raycast integration**: macOS-only application
- **Primary development**: macOS
- **CI/CD**: Unix-based GitHub Actions runners
- **WSL2 availability**: Windows users have native Unix compatibility

### Technical Implications

**Windows Native Support Would Require**:
- Cross-platform path handling (`cross-env`, `better-npm-run`)
- Windows-specific test runners
- Windows CI/CD pipeline
- Windows file system edge case handling
- Ongoing Windows compatibility testing

**Unix-Only Support Provides**:
- Simplified script paths (`./node_modules/.bin/jest`)
- Direct Node.js flag usage (`node --expose-gc`)
- Consistent CI/CD environment
- Reduced maintenance overhead
- Clear platform expectations

## Considered Options

### Option 1: Full Cross-Platform Support (Windows, macOS, Linux)

**Approach**: Use cross-platform tools and test on all platforms

**Pros**:
- Maximum accessibility
- Future-proof for Windows users
- Professional project appearance

**Cons**:
- Significant maintenance overhead
- Additional dependencies (`cross-env`, etc.)
- Windows CI/CD pipeline required
- Testing complexity 3x increase
- Zero current demand

**Assessment**: Over-engineering for current needs. Rejected.

### Option 2: Unix-Only Support with WSL2 Recommendation (Selected)

**Approach**: Officially support macOS and Linux only, recommend WSL2 for Windows users

**Pros**:
- Matches actual user base (100% Unix users)
- Aligns with primary deployment (Raycast = macOS-only)
- Reduced maintenance burden
- Simpler script implementations
- WSL2 provides full compatibility for Windows users
- Consistent development/production environments

**Cons**:
- Excludes native Windows users (currently zero)
- Requires documentation clarity
- May limit future Windows adoption

**Assessment**: Pragmatic choice matching project reality. **Selected**.

### Option 3: Windows Support "Best Effort"

**Approach**: Attempt Windows compatibility but don't guarantee it

**Pros**:
- Middle ground approach
- Some Windows users might succeed

**Cons**:
- Unclear expectations
- Half-working features create support burden
- Still requires cross-platform code
- Users don't know what to expect

**Assessment**: Worst of both worlds. Rejected.

## Decision Outcome

**Chosen Option**: Unix-Only Support with WSL2 Recommendation (Option 2)

### Rationale

1. **Current Reality**: Zero Windows users in 12+ months of operation
2. **Resource Alignment**: Solo developer focused on macOS/Linux
3. **Primary Integration**: Raycast is macOS-only
4. **Windows Solution Exists**: WSL2 provides full Unix compatibility
5. **Maintenance Focus**: Resources better spent on core features
6. **Clear Expectations**: Users know exactly what's supported

### Official Platform Support

**✅ Supported Platforms**:
- **macOS** (primary deployment, Raycast integration)
- **Linux** (secondary deployment, cloud potential)
- **WSL2** (Windows users via Unix subsystem)

**❌ Not Supported**:
- **Native Windows** (cmd.exe, PowerShell)

**Windows Users**: Install WSL2 for full compatibility

### Implementation Guidelines

**Scripts and Configuration**:
```json
// ✅ Allowed (Unix-compatible)
"test:integration": "node --expose-gc ./node_modules/.bin/jest tests/integration"

// ❌ Not required (Windows-specific)
"test:integration": "cross-env NODE_OPTIONS='--expose-gc' jest tests/integration"
```

**Path Handling**:
- Use Unix-style paths in scripts
- Direct binary references from `./node_modules/.bin/` are acceptable
- No need for cross-platform path utilities

**CI/CD**:
- GitHub Actions: Ubuntu runners only
- No Windows testing pipeline required

### Documentation Requirements

**Must clearly state platform support in**:
1. **README.md**: Platform Support section
2. **Integration guides**: Remove Windows-specific instructions
3. **CLAUDE.md**: Add platform compatibility note
4. **Deployment guides**: WSL2 setup for Windows users

### Positive Consequences

- ✅ Simplified script implementations (no cross-platform overhead)
- ✅ Reduced dependency count (no `cross-env`, etc.)
- ✅ Focused maintenance on actual user platforms
- ✅ Clear expectations for users
- ✅ WSL2 provides full Windows compatibility when needed
- ✅ Consistent Unix tooling across development/production

### Negative Consequences

- ⚠️ Native Windows users excluded (currently zero impact)
- ⚠️ May limit future Windows adoption
- ⚠️ Requires clear documentation to set expectations
- ⚠️ Windows-specific issues won't be addressed

### Mitigation Strategies

**Documentation Clarity**:
- Explicit platform support section in README
- WSL2 setup guide for Windows users
- Remove Windows references from integration guides

**Future Reassessment**:
- Review decision if Windows user base emerges
- Reconsider if Windows-native tooling becomes strategic

**WSL2 Support**:
- Provide WSL2 installation instructions
- Verify that all features work in WSL2 environment
- Document any WSL2-specific configuration needed

## Alternatives Not Considered

### Native Windows Rewrite

**Why rejected**: Would require complete rewrite of scripts and testing infrastructure for zero current users

### Electron Wrapper

**Why rejected**: Out of scope for MCP server project, focuses on GUI not needed

## Related Decisions

- **ADR-002**: Strategic pivot to core MCP server (focus on server, not multi-platform GUI)
- **MCP-100**: Integration test script update (triggered this ADR)

## References

- MCP-100: Add --expose-gc flag to test:integration script
- MCP-95: Original issue where test failure observed
- Raycast platform: macOS-only (https://raycast.com)
- WSL2 documentation: https://learn.microsoft.com/en-us/windows/wsl/

## Notes

**Scope**: This decision applies to **official platform support** only. Community contributions for Windows compatibility are welcome but won't be maintained by core team.

**Review Trigger**: If Windows user base reaches 10+ active users or if strategic need emerges (e.g., Windows-only integration partner), reassess this decision.

**WSL2 as Solution**: For Windows users, WSL2 provides full Unix environment with no compromises. This is the recommended approach rather than native Windows support.
