/**
 * Research Contracts for Linear Issue: MCP-42
 * Issue: Research MCP SDK Streamable HTTP Support
 *
 * These contracts define expected research deliverables and documentation structure.
 * This is a RESEARCH issue - no code implementation, only documentation outputs.
 */

// ============================================================================
// RESEARCH DELIVERABLES CONTRACT
// ============================================================================

/**
 * Primary research deliverable: SDK capability analysis
 */
export interface SDKCapabilityAnalysis {
  sdkVersion: string; // e.g., "1.0.0"
  supportsStreamableHttp: boolean;
  transportClasses: {
    streamableHttp?: {
      className: string; // e.g., "StreamableHTTPServerTransport"
      importPath: string; // e.g., "@modelcontextprotocol/sdk/server/streamableHttp.js"
      capabilities: string[]; // e.g., ["session management", "POST/GET/DELETE endpoints"]
    };
    sse?: {
      className: string;
      importPath: string;
      deprecationStatus: "deprecated" | "supported" | "legacy";
    };
  };
  sessionManagement: {
    supported: boolean;
    modes: ("stateless" | "stateful")[];
    eventStoreRequired: boolean;
  };
  backwardsCompatibility: {
    supportsSSE: boolean;
    migrationPath?: string;
  };
}

/**
 * Decision document output
 */
export interface ImplementationDecision {
  decision: "use-sdk-transport" | "custom-implementation" | "hybrid-approach";
  rationale: string[];
  technicalJustification: {
    sdkAdvantages: string[];
    sdkLimitations: string[];
    customImplementationNeeds?: string[];
  };
  recommendedApproach: {
    transportMode: "stateless" | "stateful";
    framework: "express" | "fastify" | "other";
    sessionManagement: "sdk-provided" | "custom" | "not-needed";
  };
  impactOnDependentIssues: {
    mcp43SimplifiedOrClosed: boolean; // Session Management Architecture
    mcp85Approach: string; // Core HTTP Transport Implementation
    duplicateIssuesClosed: string[]; // e.g., ["MCP-45", "MCP-46", ...]
  };
}

/**
 * Official examples review documentation
 */
export interface SDKExamplesReview {
  examplesFound: {
    source: string; // e.g., "GitHub SDK repository"
    url: string;
    patterns: {
      statelessExample?: string;
      statefulExample?: string;
      expressIntegration?: string;
      sessionManagement?: string;
    };
  };
  keyPatterns: {
    transportInitialization: string;
    requestHandling: string;
    errorHandling: string;
    sessionLifecycle?: string;
  };
  bestPractices: string[];
}

/**
 * Technical approach recommendation
 */
export interface TechnicalApproach {
  phaseBreakdown: {
    phase: string;
    description: string;
    issueId?: string; // e.g., "MCP-85"
    estimatedEffort: string;
  }[];
  fileStructure: {
    newFiles: string[]; // e.g., ["src/transports/streamable-http.ts"]
    modifiedFiles: string[]; // e.g., ["src/index.ts"]
    deletedFiles: string[]; // e.g., ["src/server/http-server.ts"]
  };
  dependencyChanges: {
    add: { package: string; version: string; reason: string }[];
    remove: { package: string; reason: string }[];
  };
  environmentVariables: {
    name: string;
    type: "boolean" | "string" | "number";
    defaultValue: string | boolean | number;
    description: string;
  }[];
}

// ============================================================================
// RESEARCH QUESTIONS CONTRACT
// ============================================================================

/**
 * Answers to key research questions from issue description
 */
export interface ResearchQuestionsAnswered {
  doesSDKSupportStreamableHTTP: {
    answer: boolean;
    evidence: string;
    sourceDocumentation: string;
  };
  howToInitializeStreamableHTTP: {
    codePattern: string;
    configurationOptions: string[];
    minimalExample: string;
  };
  sessionManagementPatterns: {
    statelessPattern: string;
    statefulPattern: string;
    sessionStorageOptions: string[];
  };
  endpointHandling: {
    postEndpoint: string;
    getEndpoint: string;
    deleteEndpoint: string;
    requestProcessing: string;
  };
  comparisonWithLegacySSE: {
    streamableHTTPAdvantages: string[];
    sseDeprecationStatus: string;
    migrationComplexity: "low" | "medium" | "high";
  };
}

// ============================================================================
// DOCUMENTATION OUTPUTS CONTRACT
// ============================================================================

/**
 * Linear issue comment structure for research findings
 */
export interface LinearCommentOutput {
  sections: {
    sdkCapabilities: {
      title: string;
      content: SDKCapabilityAnalysis;
    };
    implementationDecision: {
      title: string;
      content: ImplementationDecision;
    };
    examplesReview: {
      title: string;
      content: SDKExamplesReview;
    };
    technicalApproach: {
      title: string;
      content: TechnicalApproach;
    };
    researchQuestions: {
      title: string;
      content: ResearchQuestionsAnswered;
    };
  };
  nextSteps: string[];
  blockedIssuesUnblocked: string[]; // e.g., ["MCP-43", "MCP-85"]
}

// ============================================================================
// VALIDATION CONTRACTS
// ============================================================================

/**
 * Acceptance criteria validation
 * All must be true for research to be considered complete
 */
export interface AcceptanceCriteriaValidation {
  sdkCapabilitiesDocumented: boolean; // With version compatibility matrix
  decisionMade: boolean; // SDK transport vs custom implementation
  officialExamplesReviewed: boolean; // Patterns documented
  technicalApproachProvided: boolean; // Recommendation with rationale
}

/**
 * Research quality checklist
 */
export interface ResearchQualityChecklist {
  criteriaChecks: {
    multipleSourcesConsulted: boolean; // Context7, Perplexity, Ref Tools
    officialDocumentationReferenced: boolean; // SDK GitHub, spec docs
    codeExamplesProvided: boolean; // Actual SDK patterns
    decisionsJustified: boolean; // Technical rationale documented
    dependencyImpactAnalyzed: boolean; // Package.json changes identified
    nextPhaseGuidanceClear: boolean; // MCP-85 can proceed
  };
  completeness: number; // 0-100% based on above checks
}

// ============================================================================
// INTEGRATION CONTRACTS
// ============================================================================

/**
 * How this research integrates with HTTP Transport project
 */
export interface ProjectIntegration {
  httpTransportProject: {
    phase: "Phase 1: Core HTTP Transport";
    position: "Critical blocker - first issue";
    unblocksIssues: string[]; // ["MCP-43", "MCP-85", "MCP-86", ...]
  };
  adrs: {
    adr006: {
      status: "read-only reference";
      informs: "Deployment strategy (Cloudflare Tunnel)";
    };
    adr007: {
      status: "to be created after research";
      content: "Streamable HTTP Implementation & Session Management";
      dependsOn: "MCP-42 findings";
    };
  };
  cycleAlignment: {
    cycle: "Cycle 8 (Oct 20-27, 2025)";
    priority: "Urgent (P1)";
    alignment: "critical-path";
  };
}

// ============================================================================
// BEHAVIORAL CONTRACTS (RESEARCH PHASE)
// ============================================================================

/**
 * Expected behaviors during research:
 *
 * MUST:
 * - Use Context7 for official SDK documentation (highest priority)
 * - Consult multiple sources (Context7, Perplexity, Ref Tools)
 * - Document all findings in Linear issue comment
 * - Provide code examples from SDK documentation
 * - Make clear recommendation: SDK vs custom implementation
 * - Identify dependency changes needed (package.json)
 *
 * MUST NOT:
 * - Implement any code changes (research only)
 * - Make assumptions without source documentation
 * - Skip validation of SDK version compatibility
 * - Provide recommendations without technical justification
 *
 * RECOMMENDED:
 * - Reference actual SDK code examples (GitHub repository)
 * - Compare stateless vs stateful approaches with use case fit
 * - Document lessons learned for future HTTP transport work
 * - Update Serena memory with architectural patterns found
 */

// ============================================================================
// ERROR CONDITIONS (RESEARCH PHASE)
// ============================================================================

/**
 * Research may encounter these conditions:
 *
 * @condition SDKDoesNotSupportStreamableHTTP
 *   - Document limitation clearly
 *   - Provide custom implementation recommendation
 *   - Update dependent issues with alternative approach
 *
 * @condition SDKVersionUpgradeRequired
 *   - Document current version limitations
 *   - Identify target version with support
 *   - Assess upgrade complexity and breaking changes
 *
 * @condition ConflictingDocumentation
 *   - Note discrepancies between sources
 *   - Prioritize official SDK docs over community sources
 *   - Test code examples if possible (or flag for testing in MCP-85)
 *
 * @condition InsufficientExamples
 *   - Document what's missing
 *   - Recommend consulting SDK maintainers or GitHub issues
 *   - Provide best-effort guidance with caveats
 */

// ============================================================================
// EXPORT SUMMARY
// ============================================================================

/**
 * Complete research output package
 */
export interface MCP42ResearchOutput {
  metadata: {
    issueId: "MCP-42";
    issueTitle: "Research MCP SDK Streamable HTTP Support";
    researchDate: string; // ISO 8601 format
    researcher: string;
    sdkVersionAnalyzed: string;
  };
  deliverables: {
    sdkAnalysis: SDKCapabilityAnalysis;
    decision: ImplementationDecision;
    examplesReview: SDKExamplesReview;
    technicalApproach: TechnicalApproach;
    researchAnswers: ResearchQuestionsAnswered;
  };
  validation: {
    acceptanceCriteria: AcceptanceCriteriaValidation;
    qualityChecklist: ResearchQualityChecklist;
  };
  integration: ProjectIntegration;
  linearComment: LinearCommentOutput;
}
