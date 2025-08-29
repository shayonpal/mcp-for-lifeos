# Product Requirements Document: OpenWebUI Integration MVP

## Overview

This PRD defines the requirements for integrating the LifeOS MCP server with OpenWebUI to create a complete conversational AI interface for Obsidian vault management. This replaces the custom web interface development and provides immediate access to professional-grade chat capabilities.

**Version:** 1.0  
**Date:** May 30, 2025  
**Status:** Ready for Implementation  
**Priority:** P0 (Critical Path)

## Strategic Context

**Primary Goal**: Integrate LifeOS MCP server with OpenWebUI to provide complete conversational access to all 18 LifeOS tools through a professional, community-maintained interface.

**Replaces**: Custom web interface development (Issues #9-11)  
**Enables**: Immediate multi-LLM access, mobile-responsive interface, advanced conversation management

## Success Criteria

### MVP Success Metrics
- **Functional**: All 18 LifeOS MCP tools accessible through OpenWebUI
- **Performance**: Tool execution time <5 seconds for standard operations
- **Mobile**: Usable interface on iPhone/iPad for core workflows
- **Reliability**: >95% success rate for tool execution
- **Setup**: Complete integration achievable in <4 hours

### User Success Metrics
- **Daily Usage**: Primary user adopts OpenWebUI for LifeOS workflows
- **Workflow Completion**: >90% task success rate for common operations
- **Mobile Adoption**: Regular mobile usage for note creation and search
- **Feature Discovery**: User leverages multi-LLM capabilities and advanced features

## Scope Definition

### In Scope (MVP)
1. **OpenWebUI Installation & Configuration**
2. **MCP Proxy Integration** (mcpo)
3. **All 18 LifeOS Tools Validation**
4. **Mobile Experience Testing**
5. **Documentation & Setup Guides**
6. **Basic Workflow Optimization**

### Out of Scope (MVP)
1. **Custom UI Modifications** to OpenWebUI
2. **Advanced Workflow Automation** 
3. **Multi-User Setup** (single-user focus)
4. **Performance Optimization** beyond basic tuning
5. **Custom Plugin Development** for OpenWebUI

### Future Scope (Post-MVP)
1. **LifeOS-Specific Prompts** and conversation templates
2. **Advanced MCP Tool Descriptions** for better OpenWebUI presentation
3. **Workflow Optimization** based on usage patterns
4. **Community Sharing** of LifeOS integration patterns

## POC (Proof of Concept) Scope

### POC Goals
**Primary**: Validate that OpenWebUI + mcpo can successfully execute all 18 LifeOS MCP tools  
**Secondary**: Assess mobile experience quality and identify any critical limitations  
**Timeline**: 1-2 days maximum

### POC Requirements

#### 1. Basic Integration Setup
```bash
# Install OpenWebUI via Docker
docker run -d -p 3000:8080 -v open-webui:/app/backend/data --name open-webui ghcr.io/open-webui/open-webui:main

# Install and test mcpo proxy
uvx mcpo --port 8000 -- node dist/index.js
```

#### 2. Tool Validation Matrix
**Test each of the 18 MCP tools through OpenWebUI:**

| Tool Category | Tools to Test | Success Criteria |
|---------------|---------------|------------------|
| **Core Management** | get_server_version, get_yaml_rules | Basic info retrieval |
| **Note Creation** | create_note, create_note_from_template | Note created with proper YAML |
| **Note Operations** | edit_note, read_note | Content modification and retrieval |
| **Search & Discovery** | search_notes, advanced_search, quick_search, search_by_content_type, search_recent | Relevant results returned |
| **Daily Notes** | get_daily_note, list_daily_notes | Daily note workflows |
| **Vault Management** | list_folders, find_notes_by_pattern, move_items | Vault organization |
| **Maintenance** | diagnose_vault, list_templates | System health and templates |

#### 3. Mobile Experience Testing
**Device**: iPhone/iPad  
**Installation**: OpenWebUI as PWA  
**Test Workflows**:
- Create daily note via conversation
- Search for existing restaurant note
- Create new restaurant note using template
- Edit existing note content
- Access vault health information

#### 4. Performance Baseline
**Network**: Local network access (10.0.0.140:3000)  
**Response Times**: Measure tool execution through mcpo proxy  
**Resource Usage**: Monitor OpenWebUI container performance  
**Mobile Performance**: Test on cellular and WiFi networks

### POC Success Criteria
- **100% Tool Compatibility**: All 18 tools execute without errors
- **Acceptable Performance**: Tool responses within 10 seconds (POC baseline)
- **Mobile Viability**: Core workflows possible on mobile interface
- **Integration Stability**: No connection drops or proxy failures during testing

### POC Failure Criteria (Stop Conditions)
- **Critical Tool Failures**: >2 MCP tools non-functional
- **Performance Issues**: Tool responses >30 seconds consistently
- **Integration Problems**: mcpo proxy unstable or unreliable
- **Mobile Blocker**: Core mobile workflows impossible or severely degraded

## MVP Implementation Plan

### Phase 1: Environment Setup (Day 1)

#### 1.1 OpenWebUI Installation
```bash
# Production deployment
docker run -d \
  -p 3000:8080 \
  -v open-webui:/app/backend/data \
  -e OLLAMA_BASE_URL=http://host.docker.internal:11434 \
  --name open-webui \
  --restart always \
  ghcr.io/open-webui/open-webui:main
```

#### 1.2 MCP Proxy Configuration
```bash
# Install mcpo globally
uv tool install mcpo

# Test basic integration
uvx mcpo --port 8000 -- node /Users/shayon/DevProjects/mcp-for-lifeos/dist/index.js
```

#### 1.3 Network Configuration
- **OpenWebUI Access**: http://10.0.0.140:3000
- **MCPO Proxy**: http://10.0.0.140:8000
- **Mobile Testing**: Ensure WiFi accessibility

### Phase 2: Integration & Validation (Day 1-2)

#### 2.1 OpenWebUI Configuration
- **Initial Setup**: User account creation
- **Model Configuration**: Add Anthropic, OpenAI API keys
- **MCP Integration**: Configure mcpo proxy endpoints
- **Basic Testing**: Validate chat functionality

#### 2.2 LifeOS Tool Integration
- **Tool Discovery**: Verify all 18 tools appear in OpenWebUI
- **Documentation Check**: Ensure tool descriptions are clear
- **Execution Testing**: Test each tool category systematically
- **Error Handling**: Validate error responses and recovery

#### 2.3 Workflow Testing
**Daily Note Workflow**:
```
User: "Create today's daily note with gratitude and priorities sections"
Expected: Uses get_daily_note tool, creates structured note
```

**Restaurant Documentation**:
```
User: "I just tried Bella Vista Italian downtown. Great truffle pasta, 4/5 stars, date night ambiance"
Expected: Uses create_note_from_template with restaurant template
```

**Search and Retrieval**:
```
User: "Find notes about Italian restaurants"
Expected: Uses advanced_search with appropriate filters
```

### Phase 3: Mobile Experience (Day 2)

#### 3.1 PWA Installation
- **iOS Installation**: Add OpenWebUI to home screen
- **Interface Testing**: Validate touch interactions
- **Keyboard Behavior**: Test with iOS keyboard
- **Orientation Testing**: Portrait and landscape modes

#### 3.2 Mobile Workflow Validation
- **Voice Input**: Test voice-to-text for note creation
- **Camera Integration**: Photo attachment workflows
- **Location Context**: Location-aware note creation
- **Offline Behavior**: Network interruption handling

#### 3.3 Performance Testing
- **Load Times**: App launch and tool execution speed
- **Battery Usage**: Monitor during extended session
- **Network Efficiency**: Data usage for typical workflows
- **Memory Usage**: iOS performance during intensive operations

### Phase 4: Documentation & Optimization (Day 2-3)

#### 4.1 Setup Documentation
- **Installation Guide**: Step-by-step OpenWebUI + mcpo setup
- **Configuration**: Model setup and MCP integration
- **Troubleshooting**: Common issues and solutions
- **Network Setup**: Local access and mobile connectivity

#### 4.2 Usage Documentation
- **LifeOS Workflows**: Common conversation patterns
- **Tool Reference**: Quick guide to 18 MCP tools
- **Mobile Best Practices**: Optimal mobile usage patterns
- **Advanced Features**: Multi-LLM usage and conversation management

#### 4.3 Basic Optimization
- **Tool Descriptions**: Enhance for OpenWebUI presentation
- **Response Formatting**: Optimize for conversation display
- **Error Messages**: Improve user-friendly error handling
- **Performance Tuning**: Basic mcpo and OpenWebUI optimization

## Technical Requirements

### Infrastructure
- **Docker**: OpenWebUI container deployment
- **Python**: mcpo proxy (Python 3.8+)
- **Node.js**: LifeOS MCP server (existing)
- **Network**: Local network access for mobile devices

### Integration Architecture
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   OpenWebUI     │    │  mcpo Proxy      │    │  LifeOS MCP     │
│   Port 3000     │◄───┤  Port 8000       │◄───┤  stdio          │
│   Web Interface │    │  MCP→REST        │    │  18 Tools       │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Performance Requirements
- **Tool Execution**: <10 seconds for complex operations
- **UI Response**: <2 seconds for interface interactions
- **Mobile Load**: <5 seconds initial app load
- **Concurrent Users**: 1 primary user (extensible architecture)

### Security Requirements
- **Local Network**: Restrict to trusted network access
- **API Keys**: Secure storage in OpenWebUI
- **MCP Communication**: stdio protocol security (existing)
- **Data Privacy**: All processing local/on-premises

## Risk Management

### Technical Risks
1. **MCP Proxy Instability**: mcpo might have compatibility issues
   - **Mitigation**: Thorough POC testing, fallback to custom interface
2. **Performance Overhead**: REST conversion might add latency
   - **Mitigation**: Performance benchmarking, optimization
3. **OpenWebUI Limitations**: Missing features for LifeOS workflows
   - **Mitigation**: Document limitations, plan workarounds

### User Experience Risks
1. **Mobile Experience**: OpenWebUI mobile might be suboptimal
   - **Mitigation**: Comprehensive mobile testing, PWA fallback option
2. **Workflow Disruption**: Conversation overhead for simple tasks
   - **Mitigation**: Document efficient conversation patterns
3. **Learning Curve**: New interface requires user adaptation
   - **Mitigation**: Clear documentation and gradual migration

### Project Risks
1. **Integration Complexity**: Setup might be more complex than anticipated
   - **Mitigation**: Detailed documentation, automated setup scripts
2. **Maintenance Burden**: OpenWebUI updates might break integration
   - **Mitigation**: Version pinning, update testing procedures

## Success Measurement

### Immediate (Week 1)
- [ ] POC successfully demonstrates all 18 tools working
- [ ] OpenWebUI accessible from mobile devices
- [ ] Basic workflows completable through conversation
- [ ] Setup documentation enables reproduction

### Short-term (Month 1)
- [ ] Daily LifeOS workflows adopted through OpenWebUI
- [ ] Mobile usage patterns established
- [ ] Performance meets user expectations
- [ ] No critical integration issues

### Long-term (Quarter 1)
- [ ] OpenWebUI becomes primary LifeOS interface
- [ ] Advanced features (multi-LLM, conversation management) utilized
- [ ] Mobile workflows complement desktop usage
- [ ] Integration stable and maintainable

## Acceptance Criteria

### MVP Completion Criteria
1. **All 18 LifeOS MCP tools** functional through OpenWebUI interface
2. **Mobile PWA installation** and basic workflow completion possible
3. **Setup documentation** enables independent deployment
4. **Performance baseline** established and acceptable
5. **Error handling** graceful for common failure scenarios

### User Acceptance Criteria
1. **Daily note creation** through conversation feels natural
2. **Search workflows** return relevant results efficiently
3. **Template-based note creation** works through conversation
4. **Mobile experience** adequate for common workflows
5. **Multi-device usage** seamless across desktop and mobile

## Next Steps After MVP

### Immediate Post-MVP (Week 2-4)
1. **Usage Pattern Analysis**: Document actual workflow patterns
2. **Tool Enhancement**: Improve MCP tool descriptions based on usage
3. **Performance Optimization**: Address any speed or efficiency issues
4. **Advanced Features**: Explore OpenWebUI advanced capabilities

### Future Enhancements (Month 2+)
1. **Custom Prompts**: LifeOS-specific conversation templates
2. **Workflow Automation**: Advanced conversation patterns
3. **Community Sharing**: Contribute LifeOS patterns to OpenWebUI community
4. **Conditional PWA**: Evaluate need based on mobile usage data

---

**Document Status**: Ready for Implementation  
**Dependencies**: LifeOS MCP server operational, Docker environment available  
**Blockers**: None identified  
**Next Action**: Begin POC Phase 1 - Environment Setup