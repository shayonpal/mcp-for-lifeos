/**
 * Implementation contracts for Linear Issue: MCP-94
 * Issue: Integration test for unique instance ID generation across server restarts
 */

// ==========================================
// INPUT CONTRACTS
// ==========================================

/**
 * Test configuration for instance ID validation
 */
export interface InstanceIDTestConfig {
  /**
   * Number of server start iterations to test
   * @minimum 3
   * @maximum 5
   */
  iterations: number;

  /**
   * Timeout for each server operation (ms)
   * @default 500
   */
  serverTimeout: number;

  /**
   * Overall test timeout (ms)
   * @default 10000
   */
  testTimeout: number;

  /**
   * Whether to enable verbose logging
   * @default false
   */
  verbose: boolean;
}

/**
 * Server spawn configuration
 */
export interface ServerSpawnConfig {
  /**
   * Path to compiled server entry point
   */
  serverPath: string;

  /**
   * Environment variables for spawned process
   */
  env: {
    /** Disable web interface for cleaner test output */
    ENABLE_WEB_INTERFACE: 'false';

    /** Path for analytics JSONL output */
    ANALYTICS_OUTPUT: string;

    /** Enable analytics collection */
    DISABLE_USAGE_ANALYTICS: 'false';

    /** Inherit other environment variables */
    [key: string]: string | undefined;
  };
}

// ==========================================
// OUTPUT CONTRACTS
// ==========================================

/**
 * Parsed instance ID components
 */
export interface ParsedInstanceID {
  /**
   * Full instance ID string
   */
  fullId: string;

  /**
   * UUID v4 component
   * @pattern ^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$
   */
  uuid: string;

  /**
   * Hostname component
   */
  hostname: string;

  /**
   * Process ID component
   * @type number
   */
  pid: number;
}

/**
 * Instance ID validation result
 */
export interface InstanceIDValidationResult {
  /**
   * Whether validation passed
   */
  success: boolean;

  /**
   * Unique instance IDs collected
   */
  instanceIds: ParsedInstanceID[];

  /**
   * Number of unique instances detected
   */
  uniqueCount: number;

  /**
   * Validation errors (if any)
   */
  errors: string[];

  /**
   * Debug information
   */
  debug?: {
    iterationsRun: number;
    filesProcessed: number;
    metricsFound: number;
  };
}

// ==========================================
// ERROR CONTRACTS
// ==========================================

/**
 * Test execution errors
 *
 * Throws:
 * - Error: Server spawn failed
 * - Error: Server did not respond within timeout
 * - Error: Failed to read analytics output
 * - Error: Instance ID format validation failed
 * - Error: No instance IDs found in output
 * - Error: Process cleanup failed (non-fatal, logs warning)
 */

// ==========================================
// INTEGRATION CONTRACTS
// ==========================================

/**
 * Dependencies:
 * - spawn from 'child_process': Server process management
 * - fs from 'fs': Read analytics JSONL files
 * - path from 'path': Build file paths
 * - os from 'os': Temp directory and hostname
 *
 * Test file location:
 * - tests/integration/jsonl-final-validation.test.ts
 *
 * Server entry point:
 * - dist/src/index.js
 *
 * Analytics output:
 * - Temporary files in os.tmpdir() with pattern: test-instance-{i}.jsonl
 */

// ==========================================
// BEHAVIORAL CONTRACTS
// ==========================================

/**
 * MUST:
 * 1. Spawn MCP server process 3-5 times sequentially
 * 2. Wait for each server to be responsive before termination
 * 3. Capture instance IDs from analytics JSONL output
 * 4. Validate each instance ID matches format: {uuid}-{hostname}-{pid}
 * 5. Verify all collected instance IDs are unique
 * 6. Clean up all spawned processes (SIGTERM + SIGKILL fallback)
 * 7. Clean up all temporary JSONL files (even on test failure)
 * 8. Be idempotent (no side effects on subsequent runs)
 *
 * MUST NOT:
 * 1. Leave orphaned server processes running
 * 2. Leave temporary files in tmpdir
 * 3. Fail due to port conflicts (use stdio transport, not HTTP)
 * 4. Block indefinitely on server operations
 * 5. Pollute production analytics files
 *
 * SHOULD:
 * 1. Complete within 10 seconds (current timeout)
 * 2. Provide clear error messages on failure
 * 3. Log debug information for troubleshooting
 * 4. Handle server startup failures gracefully
 * 5. Be runnable in parallel with other tests
 *
 * VALIDATION REQUIREMENTS:
 * 1. UUID component must be valid v4 UUID
 * 2. Hostname component must be non-empty string
 * 3. PID component must be positive integer
 * 4. Format must be exactly: {uuid}-{hostname}-{pid}
 * 5. All instance IDs across restarts must be unique
 * 6. Minimum 1 unique instance ID collected (ideally 3-5)
 */

// ==========================================
// TEST STRUCTURE CONTRACT
// ==========================================

/**
 * Test organization:
 *
 * describe('Instance Identification', () => {
 *   it('should generate unique instance IDs for each server start', async () => {
 *     // 1. Setup: Create empty Set for instance IDs
 *     // 2. Loop: Start server multiple times (3-5)
 *     //    a. Create temp output file
 *     //    b. Spawn server with analytics enabled
 *     //    c. Send test MCP request
 *     //    d. Wait for response/timeout
 *     //    e. Terminate server (SIGTERM)
 *     //    f. Wait for exit
 *     //    g. Read and parse JSONL output
 *     //    h. Extract and validate instance ID
 *     //    i. Add to Set
 *     //    j. Clean up temp file
 *     // 3. Assertion: Validate uniqueness
 *     // 4. Cleanup: Ensure all processes dead
 *   });
 * });
 */
