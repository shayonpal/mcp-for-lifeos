# Product Requirements Document: LifeOS Mobile Companion PWA

## Strategic Context & Status

**🚧 DEVELOPMENT STATUS: PAUSED**

After strategic analysis, PWA development is **paused** pending OpenWebUI mobile experience validation. This document is preserved for potential future development if mobile workflow gaps are identified.

**Version:** 2.1  
**Date:** May 30, 2025  
**Status:** Paused - Conditional Development Based on OpenWebUI Usage

## Executive Summary

**STRATEGIC DECISION**: PWA development paused in favor of OpenWebUI-first approach.

**Rationale**: OpenWebUI already provides mobile-responsive PWA functionality. Rather than assume mobile gaps exist, we will:
1. Test OpenWebUI mobile experience thoroughly (4-week trial)
2. Use saved development time (3+ weeks) to enhance MCP tools for OpenWebUI
3. Make data-driven PWA decision based on actual usage patterns

This document remains as specification for **conditional development** if mobile workflow gaps are identified.

## Current Architecture Strategy

### Phase 1: OpenWebUI Only (Current Focus)
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   OpenWebUI     │    │  mcpo Proxy      │    │  LifeOS MCP     │
│   (Mobile PWA)  │◄───┤  (MCP→REST)      │◄───┤  Server         │
│   All Workflows │    │                  │    │  (18 Tools)     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Phase 2: Conditional PWA Addition (If Needed)
*Only if mobile workflow gaps are identified through OpenWebUI usage*
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   OpenWebUI     │    │  Custom PWA      │    │  LifeOS MCP     │
│   (Conversations)│    │  (Quick Actions) │    │  Server         │
│   Desktop/Complex│◄───┤  Mobile/Simple   │◄───┤  (18 Tools)     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Decision Criteria for PWA Development

### Proceed with PWA Development IF:
- **Mobile UX Friction**: OpenWebUI mobile interface creates significant workflow friction
- **Speed Requirements**: Template-based creation significantly faster than conversation
- **Offline Needs**: Substantial gaps in OpenWebUI offline functionality
- **Context Awareness**: Location/time-based workflows provide substantial value
- **Battery/Performance**: OpenWebUI mobile performance inadequate for daily use

### Continue with OpenWebUI Only IF:
- **Workflow Compatibility**: All core LifeOS workflows work well through conversation
- **Mobile Experience**: OpenWebUI PWA meets mobile usability standards
- **Voice Integration**: Voice-to-AI workflows as fast as template forms
- **Feature Richness**: OpenWebUI capabilities outweigh custom interface benefits

## Evaluation Framework (4-Week Trial)

### Week 1-2: OpenWebUI Mobile Testing
**Daily Note Creation**: Test morning/evening note workflows on mobile
**Template Usage**: Create restaurant, meeting, article notes via conversation
**Search Patterns**: Quick information retrieval and vault navigation
**Performance Metrics**: Speed, battery usage, network efficiency

### Week 3-4: Usage Pattern Analysis
**Friction Points**: Document workflows that feel clunky or slow
**Missing Features**: Identify capabilities that would improve mobile experience
**Workflow Completion**: Measure success rate for common mobile tasks
**User Satisfaction**: Subjective experience vs anticipated PWA benefits

### Decision Point (End of Month 1)
**Quantitative Metrics**:
- Mobile workflow completion time vs anticipated PWA speed
- OpenWebUI mobile usage frequency and session duration
- Error rates or abandoned workflows on mobile

**Qualitative Assessment**:
- Frustration with conversation overhead for simple tasks
- Value of context-aware features (location, time, calendar)
- Importance of offline-first mobile workflows

## Preserved PWA Specification

*The following sections remain as originally specified for conditional implementation*

### Core Features (If PWA Developed)

#### 1. Quick Note Creation
**Purpose**: Mobile-optimized note capture with LifeOS templates
- Template selector with thumbnails
- Pre-filled YAML frontmatter based on template
- Location-aware suggestions
- Voice-to-text support
- One-tap save to vault

#### 2. Daily Note Dashboard
**Purpose**: Streamlined daily journal management
- Auto-create today's daily note
- Quick edit with common patterns
- Calendar view of past notes
- Streak tracking

#### 3. Vault Overview
**Purpose**: Mobile dashboard for vault status
- Recent notes (last 7 days)
- Search with autocomplete
- Folder navigation
- Vault health status
- Quick stats

#### 4. Smart Capture
**Purpose**: Context-aware note creation
- Location-based suggestions
- Time-based templates
- Calendar integration
- Contact integration
- Photo capture

### User Journeys (If PWA Developed)

*All previously documented user journeys remain valid for conditional development*

### Technical Architecture (If PWA Developed)

**Frontend**: Leverage existing 80% complete PWA infrastructure
**Backend**: Existing HTTP server with MCP integration
**APIs**: Extend existing `/api/mcp/*` endpoints
**Performance**: Mobile-first optimization
**Offline**: Full note creation capability

## Resource Allocation Strategy

### Current Focus (Weeks 1-4)
- **OpenWebUI Integration**: Complete setup and testing
- **MCP Tool Enhancement**: Improve tool descriptions for OpenWebUI
- **Mobile Testing**: Thorough evaluation of OpenWebUI mobile experience
- **Documentation**: Usage patterns and friction analysis

### Conditional Development (Month 2+)
- **If PWA Needed**: Implement focused features addressing identified gaps
- **If PWA Not Needed**: Invest time in advanced MCP features or other priorities

## Success Metrics

### OpenWebUI-Only Success
- **Mobile Workflow Completion**: >90% success rate for common tasks
- **User Satisfaction**: Mobile experience meets daily workflow needs
- **Performance**: Acceptable speed and battery usage patterns
- **Feature Coverage**: No significant mobile-specific functionality gaps

### PWA Development Triggers
- **Workflow Friction**: >30% of mobile attempts feel unnecessarily complex
- **Speed Requirements**: Template creation >2x faster than conversation
- **Offline Needs**: Regular offline mobile usage scenarios
- **Context Value**: Location/time awareness provides substantial workflow improvements

## Conclusion

This strategic pause allows for evidence-based decision making rather than assumption-driven development. By testing OpenWebUI mobile experience first, we ensure PWA development only occurs if it provides measurable value over the community-maintained alternative.

The existing 80% complete PWA infrastructure ensures rapid implementation if mobile workflow gaps are identified, while the saved development time enables immediate focus on enhancing the core LifeOS MCP tools for optimal OpenWebUI integration.

---

**Change Log**

### May 30, 2025 at 9:15 PM
- **Strategic Pivot**: PWA development paused pending OpenWebUI mobile validation
- **Decision Framework**: Added 4-week evaluation criteria and decision triggers
- **Resource Reallocation**: Focus shifted to MCP tool enhancement for OpenWebUI
- **Conditional Development**: PWA specification preserved for data-driven future decision
- **Status Change**: From "Strategic Pivot to Mobile Companion" to "Paused - Conditional Development"