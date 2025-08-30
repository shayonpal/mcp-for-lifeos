# Analytics Multi-Instance Safety Test Scenarios

## Test Categories

### 1. Unit Tests - Analytics Collector

#### Test: Append-Only Operations
```typescript
describe('AnalyticsCollector - Append Operations', () => {
  test('should append metrics without reading entire file', async () => {
    // Setup: Create collector instance
    // Action: Track multiple metrics
    // Assert: File contains appended lines, not overwritten
  });
  
  test('should include instance identification in each metric', async () => {
    // Setup: Create collector with instance ID
    // Action: Track metric
    // Assert: Metric contains instanceId, pid, hostname
  });
  
  test('should buffer writes and flush on interval', async () => {
    // Setup: Create collector with 100ms flush
    // Action: Track 10 metrics rapidly
    // Assert: Single write operation after 100ms
  });
});
```

#### Test: Client Identification
```typescript
describe('Client Identification', () => {
  test('should capture client name from MCP server', async () => {
    // Setup: Mock server.getClientVersion()
    // Action: Initialize client tracking
    // Assert: clientName is not "unknown"
  });
  
  test('should pass client info to analytics', async () => {
    // Setup: Set client info in ToolRouter
    // Action: Execute tool with analytics
    // Assert: Metric contains correct clientName
  });
});
```

### 2. Integration Tests - Concurrent Operations

#### Test: Multiple Instance Safety
```typescript
describe('Concurrent Analytics Safety', () => {
  test('handles 3 concurrent instances without data loss', async () => {
    // Setup: Clear analytics file
    // Action: Spawn 3 MCP server instances
    // Each instance tracks 100 metrics
    // Assert: File contains exactly 300 metrics
    // Assert: No corrupted lines
    // Assert: Each instance has unique ID
  });
  
  test('maintains data integrity during simultaneous writes', async () => {
    // Setup: Create 3 processes
    // Action: All write simultaneously for 10 seconds
    // Assert: All lines are valid JSON
    // Assert: No interleaved partial writes
  });
});
```

#### Test: Performance Impact
```typescript
describe('Performance Tests', () => {
  test('append operations complete within 100ms', async () => {
    // Setup: Create analytics collector
    // Action: Track 100 metrics with timing
    // Assert: P99 latency < 100ms
  });
  
  test('no significant CPU increase with buffering', async () => {
    // Setup: Monitor baseline CPU
    // Action: Run with buffered writes
    // Assert: CPU increase < 5%
  });
});
```

### 3. Dashboard Compatibility Tests

#### Test: JSONL Format Reading
```typescript
describe('Dashboard JSONL Support', () => {
  test('parses JSONL format correctly', async () => {
    // Setup: Create JSONL file with test data
    // Action: Load in dashboard
    // Assert: All metrics displayed correctly
  });
  
  test('handles malformed lines gracefully', async () => {
    // Setup: JSONL with corrupted line
    // Action: Parse file
    // Assert: Skip bad line, process others
  });
  
  test('aggregates metrics from multiple instances', async () => {
    // Setup: JSONL with 3 different instance IDs
    // Action: Load dashboard
    // Assert: Shows combined metrics
    // Assert: Can filter by instance
  });
});
```

### 4. Edge Case Tests

#### Test: Process Crash Recovery
```typescript
describe('Crash Recovery', () => {
  test('handles process termination mid-write', async () => {
    // Setup: Start writing large metric
    // Action: Kill process (SIGKILL)
    // Assert: File remains readable
    // Assert: Only last line potentially corrupted
  });
  
  test('flushes buffer on graceful shutdown', async () => {
    // Setup: Buffer 50 metrics
    // Action: Send SIGTERM
    // Assert: All buffered metrics written
  });
});
```

#### Test: File System Edge Cases
```typescript
describe('File System Edge Cases', () => {
  test('handles disk full gracefully', async () => {
    // Setup: Fill disk to near capacity
    // Action: Attempt to write metrics
    // Assert: Error logged, no crash
    // Assert: Metrics buffered if possible
  });
  
  test('handles file permissions issues', async () => {
    // Setup: Restrict file permissions
    // Action: Attempt append
    // Assert: Graceful error handling
  });
});
```

## Test Execution Plan

### Phase 1: Unit Tests
1. Analytics collector append operations
2. Instance identification
3. Buffer management
4. Client identification fix

### Phase 2: Integration Tests
1. 3-instance concurrent test
2. Performance benchmarks
3. Dashboard compatibility

### Phase 3: Edge Cases
1. Process crash scenarios
2. File system limits
3. Permission issues

## Success Criteria

### Must Pass
- [ ] Zero data loss with 3 concurrent instances
- [ ] Client identification working (not "unknown")
- [ ] Dashboard reads JSONL format
- [ ] Performance impact < 5%

### Should Pass
- [ ] Graceful crash recovery
- [ ] Buffer flush on exit
- [ ] Malformed line handling

### Nice to Have
- [ ] PM2 auto-start working
- [ ] Migration script functional
- [ ] File rotation implemented

## Test Commands

```bash
# Run unit tests
npm run test:unit -- analytics-collector

# Run concurrent safety tests
npm run test:integration -- concurrent-safety

# Run performance benchmarks
npm run test:performance -- analytics

# Run all analytics tests
npm run test -- --testPathPattern=analytics

# Manual concurrent test
node tests/manual/spawn-concurrent-instances.js
```

## Test Data Setup

### Sample JSONL Test Data
```jsonl
{"instanceId":"uuid-1","pid":1234,"hostname":"mac1","timestamp":"2025-08-30T01:00:00Z","toolName":"search","executionTime":45,"success":true}
{"instanceId":"uuid-2","pid":5678,"hostname":"mac1","timestamp":"2025-08-30T01:00:01Z","toolName":"create_note","executionTime":120,"success":true}
{"instanceId":"uuid-3","pid":9012,"hostname":"mac1","timestamp":"2025-08-30T01:00:02Z","toolName":"list","executionTime":30,"success":true}
```

### Malformed Line Test Case
```jsonl
{"instanceId":"uuid-1","pid":1234,"hostname":"mac1","timestamp":"2025-08-30T01:00:00Z","toolName":"search","executionTime":45,"success":true}
{"instanceId":"uuid-2","pid":5678,"hostname":"mac1","timestamp":"2025-08-30T01:00:01Z","toolName":"create_note","exec
{"instanceId":"uuid-3","pid":9012,"hostname":"mac1","timestamp":"2025-08-30T01:00:02Z","toolName":"list","executionTime":30,"success":true}
```

## Monitoring During Tests

### Metrics to Track
- Total lines written
- Invalid lines encountered
- Write latencies (P50, P95, P99)
- CPU usage percentage
- Memory usage
- File descriptor count
- Lock contention (if using locks)

### Success Indicators
- All metrics accounted for
- No process crashes
- Dashboard displays correctly
- Performance within bounds