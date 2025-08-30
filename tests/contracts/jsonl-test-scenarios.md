# JSONL Analytics Test Scenarios (MCP-21)

## Test Categories for Append-Only Operations

### 1. Unit Tests - Core JSONL Operations

#### Test: Atomic Append Operations
```typescript
describe('JSONL Append Operations', () => {
  test('should append metric as single JSONL line', async () => {
    // Setup: Create analytics collector
    // Action: Record a metric
    // Assert: File contains one JSON line with \n delimiter
  });
  
  test('should include instance identification in each line', async () => {
    // Setup: Create collector with instance ID
    // Action: Record metric
    // Assert: Line contains instanceId, pid, hostname
  });
  
  test('should handle special characters in JSON values', async () => {
    // Setup: Create metric with quotes, newlines in values
    // Action: Append metric
    // Assert: JSON properly escaped, single line maintained
  });
});
```

#### Test: JSONL Parsing
```typescript
describe('JSONL Parsing', () => {
  test('should parse valid JSONL file line-by-line', async () => {
    // Setup: Create JSONL file with 10 metrics
    // Action: Load metrics
    // Assert: All 10 metrics parsed correctly
  });
  
  test('should skip malformed lines gracefully', async () => {
    // Setup: JSONL with one corrupted line
    // Action: Parse file
    // Assert: Valid lines loaded, bad line skipped
  });
  
  test('should handle empty lines and whitespace', async () => {
    // Setup: JSONL with empty lines between metrics
    // Action: Parse file
    // Assert: Only valid metrics loaded
  });
});
```

### 2. Integration Tests - Concurrent Safety

#### Test: Three Instance Concurrent Writes
```typescript
describe('Concurrent JSONL Writes', () => {
  test('3 instances write 100 metrics each without data loss', async () => {
    // Setup: Clear analytics file
    // Action: Spawn 3 processes, each writes 100 metrics
    // Assert: File contains exactly 300 valid JSONL lines
    // Assert: Each instance has unique instanceId
    // Assert: No corrupted or partial lines
  });
  
  test('maintains line atomicity during concurrent writes', async () => {
    // Setup: Create 3 processes with large metrics
    // Action: All write simultaneously
    // Assert: No interleaved partial lines
    // Assert: Each line is complete valid JSON
  });
});
```

#### Test: Format Migration
```typescript
describe('JSON to JSONL Migration', () => {
  test('reads existing JSON format correctly', async () => {
    // Setup: Existing usage-metrics.json file
    // Action: Load with new collector
    // Assert: All metrics loaded from JSON
  });
  
  test('writes new metrics in JSONL format', async () => {
    // Setup: Start with JSON file
    // Action: Record new metrics
    // Assert: New file created as .jsonl
    // Assert: Old JSON file untouched
  });
  
  test('supports both formats simultaneously', async () => {
    // Setup: Both .json and .jsonl files exist
    // Action: Load metrics
    // Assert: Reads from appropriate format
  });
});
```

### 3. Performance Tests

#### Test: Append Latency
```typescript
describe('JSONL Performance', () => {
  test('append operation completes within 5ms', async () => {
    // Setup: Create collector
    // Action: Time 100 append operations
    // Assert: P95 latency < 5ms
  });
  
  test('buffered writes reduce I/O operations', async () => {
    // Setup: Enable buffering with 100ms interval
    // Action: Record 50 metrics rapidly
    // Assert: Single write operation after buffer flush
  });
});
```

### 4. Edge Case Tests

#### Test: Process Crash Recovery
```typescript
describe('Crash Recovery', () => {
  test('handles process termination during write', async () => {
    // Setup: Start writing metric
    // Action: Kill process mid-write
    // Assert: File remains valid JSONL
    // Assert: Only last line potentially incomplete
  });
  
  test('resumes correctly after crash', async () => {
    // Setup: JSONL file with partial last line
    // Action: Start new instance
    // Assert: Skips invalid line, continues appending
  });
});
```

#### Test: File System Edge Cases
```typescript
describe('File System Edge Cases', () => {
  test('handles file permissions gracefully', async () => {
    // Setup: Restrict file write permissions
    // Action: Attempt to append
    // Assert: Error logged, no crash
  });
  
  test('handles very long metric lines', async () => {
    // Setup: Create metric with 5KB of data
    // Action: Append metric
    // Assert: Line truncated or handled appropriately
  });
});
```

## Test Execution Commands

```bash
# Unit tests for JSONL operations
npm run test -- tests/unit/jsonl-analytics.test.ts

# Integration test for concurrent writes
npm run test -- tests/integration/concurrent-jsonl.test.ts

# Manual concurrent test
node tests/manual/spawn-three-instances.js

# Performance benchmarks
npm run test:performance -- jsonl-append
```

## Test Data Samples

### Valid JSONL Test Data
```jsonl
{"instanceId":"uuid-1","pid":1234,"hostname":"mac1","timestamp":"2025-08-30T01:00:00Z","toolName":"search","executionTime":45,"success":true}
{"instanceId":"uuid-2","pid":5678,"hostname":"mac1","timestamp":"2025-08-30T01:00:01Z","toolName":"create_note","executionTime":120,"success":true}
{"instanceId":"uuid-3","pid":9012,"hostname":"mac1","timestamp":"2025-08-30T01:00:02Z","toolName":"list","executionTime":30,"success":true}
```

### Malformed Line Test Case
```jsonl
{"instanceId":"uuid-1","pid":1234,"hostname":"mac1","timestamp":"2025-08-30T01:00:00Z","toolName":"search","executionTime":45,"success":true}
{"instanceId":"uuid-2","pid":5678,"hostname":"mac1","timestamp":"202
{"instanceId":"uuid-3","pid":9012,"hostname":"mac1","timestamp":"2025-08-30T01:00:02Z","toolName":"list","executionTime":30,"success":true}
```

## Success Criteria

### Must Pass
- [ ] Zero data loss with 3 concurrent instances
- [ ] Each metric on single JSONL line
- [ ] Instance identification in every metric
- [ ] Graceful handling of malformed lines

### Should Pass
- [ ] Performance < 5ms per append
- [ ] Buffer flush reduces I/O operations
- [ ] Migration from JSON format works

### Nice to Have
- [ ] File rotation (future - MCP-28)
- [ ] Compression (future enhancement)

## Monitoring During Tests

### Metrics to Track
- Lines written vs lines readable
- Append operation latencies
- File size growth rate
- Instance ID uniqueness
- Parse errors encountered

### Success Indicators
- All 300 metrics accounted for (3 × 100)
- No process crashes
- No corrupted lines
- Performance within bounds