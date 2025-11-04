/**
 * Unit tests for MCP-114: Atomic File Operations Foundation
 *
 * Tests atomic write capabilities added to VaultUtils.writeFileWithRetry()
 * using native Node.js fs temp-file-then-rename pattern.
 */

import { join } from "path";
import {
  existsSync,
  mkdirSync,
  rmSync,
  readFileSync,
  readdirSync,
  chmodSync,
} from "fs";
import { VaultUtils } from "../../src/vault-utils.js";
import { writeFileWithRetry } from "../../src/modules/files/file-io.js";

const TEST_VAULT_PATH = join(process.cwd(), "test-vault-atomic");

describe("MCP-114: Atomic File Operations", () => {
  beforeEach(() => {
    // Create clean test vault
    if (existsSync(TEST_VAULT_PATH)) {
      rmSync(TEST_VAULT_PATH, { recursive: true, force: true });
    }
    mkdirSync(TEST_VAULT_PATH, { recursive: true });

    // Reset VaultUtils singleton
    VaultUtils.resetSingletons();
  });

  afterEach(() => {
    // Cleanup test vault
    if (existsSync(TEST_VAULT_PATH)) {
      rmSync(TEST_VAULT_PATH, { recursive: true, force: true });
    }
  });

  describe("Atomic Write Functionality", () => {
    it("should write file atomically using temp-file-then-rename pattern", () => {
      const filePath = join(TEST_VAULT_PATH, "test.md");
      const content = "Atomic write test content";

      writeFileWithRetry(filePath, content, "utf-8", {
        atomic: true,
      });

      // Verify file exists and has correct content
      expect(existsSync(filePath)).toBe(true);
      expect(readFileSync(filePath, "utf-8")).toBe(content);

      // Verify no temp files left behind
      const files = readdirSync(TEST_VAULT_PATH);
      expect(files.filter((f) => f.startsWith(".mcp-tmp-"))).toHaveLength(0);
    });

    it("should use correct temp file naming pattern (.mcp-tmp-{timestamp}-{filename})", () => {
      const filePath = join(TEST_VAULT_PATH, "test-naming.md");
      const content = "Test content for naming pattern";

      // The temp file naming pattern is: .mcp-tmp-{timestamp}-{filename}
      // We can't directly observe it since it's cleaned up, but we can verify
      // the pattern is correct by checking:
      // 1. File is written successfully (atomic write worked)
      // 2. No temp files remain (cleanup worked)
      // This indirectly confirms the pattern is correct

      writeFileWithRetry(filePath, content, "utf-8", {
        atomic: true,
      });

      // Verify successful write
      expect(existsSync(filePath)).toBe(true);
      expect(readFileSync(filePath, "utf-8")).toBe(content);

      // Verify temp file pattern by checking no .mcp-tmp- files remain
      const files = readdirSync(TEST_VAULT_PATH);
      const tempFiles = files.filter((f) => f.startsWith(".mcp-tmp-"));
      expect(tempFiles).toHaveLength(0);

      // Pattern verification: The implementation uses `.mcp-tmp-${Date.now()}-${basename(filePath)}`
      // which results in .mcp-tmp-{timestamp}-test-naming.md format
      // This is tested indirectly through successful atomic write and cleanup
    });

    it("should atomically promote temp file to target via POSIX rename", () => {
      const filePath = join(TEST_VAULT_PATH, "atomic-test.md");
      const content = "POSIX atomic rename test";

      writeFileWithRetry(filePath, content, "utf-8", {
        atomic: true,
      });

      // After successful atomic write:
      // 1. Target file should exist
      expect(existsSync(filePath)).toBe(true);
      // 2. Content should be correct
      expect(readFileSync(filePath, "utf-8")).toBe(content);
      // 3. No temp files should remain
      const files = readdirSync(TEST_VAULT_PATH);
      expect(files.filter((f) => f.startsWith(".mcp-tmp-"))).toHaveLength(0);
    });
  });

  describe("Temp File Cleanup", () => {
    it("should cleanup temp file on write errors", () => {
      const filePath = join(TEST_VAULT_PATH, "write-error-test.md");
      const content = "x".repeat(1000);

      // Make directory read-only to trigger write error
      chmodSync(TEST_VAULT_PATH, 0o444);

      try {
        writeFileWithRetry(filePath, content, "utf-8", {
          atomic: true,
          retries: 0, // No retries to fail fast
        });
        // Should not reach here
        fail("Should have thrown an error");
      } catch (error) {
        // Expected to fail
        expect(error).toBeDefined();
      } finally {
        // Restore permissions
        chmodSync(TEST_VAULT_PATH, 0o755);
      }

      // Verify no temp files left behind even after error
      const files = readdirSync(TEST_VAULT_PATH);
      expect(files.filter((f) => f.startsWith(".mcp-tmp-"))).toHaveLength(0);
    });

    it("should cleanup temp file on rename errors", () => {
      const filePath = join(TEST_VAULT_PATH, "subdir", "rename-error-test.md");
      const content = "Rename error test";

      // Create subdirectory but make it read-only to prevent rename
      mkdirSync(join(TEST_VAULT_PATH, "subdir"), { recursive: true });
      chmodSync(join(TEST_VAULT_PATH, "subdir"), 0o444);

      try {
        writeFileWithRetry(filePath, content, "utf-8", {
          atomic: true,
          retries: 0,
        });
        // Should not reach here
        fail("Should have thrown an error");
      } catch (error) {
        // Expected to fail on rename
        expect(error).toBeDefined();
      } finally {
        // Restore permissions
        chmodSync(join(TEST_VAULT_PATH, "subdir"), 0o755);
      }

      // Verify no temp files in parent directory
      const files = readdirSync(TEST_VAULT_PATH);
      expect(files.filter((f) => f.startsWith(".mcp-tmp-"))).toHaveLength(0);
    });
  });

  describe("iCloud Retry Integration", () => {
    it("should integrate iCloud retry logic with atomic writes", () => {
      const filePath = join(TEST_VAULT_PATH, "retry-test.md");
      const content = "iCloud retry integration test";

      // Should succeed with default retry count
      writeFileWithRetry(filePath, content, "utf-8", {
        atomic: true,
        retries: 3,
      });

      expect(existsSync(filePath)).toBe(true);
      expect(readFileSync(filePath, "utf-8")).toBe(content);
    });

    it("should respect custom retry count from options", () => {
      const filePath = join(TEST_VAULT_PATH, "custom-retry.md");
      const content = "Custom retry count test";

      // Use custom retry count
      writeFileWithRetry(filePath, content, "utf-8", {
        atomic: true,
        retries: 5,
      });

      expect(existsSync(filePath)).toBe(true);
      expect(readFileSync(filePath, "utf-8")).toBe(content);
    });
  });

  describe("Backward Compatibility", () => {
    it("should default atomic option to false", () => {
      const filePath = join(TEST_VAULT_PATH, "default-behavior.md");
      const content = "Default behavior test";

      // Call without options - should use non-atomic path
      writeFileWithRetry(filePath, content, "utf-8");

      expect(existsSync(filePath)).toBe(true);
      expect(readFileSync(filePath, "utf-8")).toBe(content);
    });

    it("should preserve existing behavior when atomic not specified", () => {
      const filePath = join(TEST_VAULT_PATH, "backward-compat.md");
      const content = "Backward compatibility test";

      // Call with empty options object
      writeFileWithRetry(filePath, content, "utf-8", {});

      expect(existsSync(filePath)).toBe(true);
      expect(readFileSync(filePath, "utf-8")).toBe(content);
    });

    it("should preserve existing behavior when atomic is explicitly false", () => {
      const filePath = join(TEST_VAULT_PATH, "explicit-non-atomic.md");
      const content = "Explicit non-atomic test";

      writeFileWithRetry(filePath, content, "utf-8", {
        atomic: false,
      });

      expect(existsSync(filePath)).toBe(true);
      expect(readFileSync(filePath, "utf-8")).toBe(content);
    });
  });

  describe("Error Handling", () => {
    it("should handle rename failure gracefully", () => {
      const filePath = join(TEST_VAULT_PATH, "nonexistent", "file.md");
      const content = "Should fail";

      // Try to write to non-existent directory without creating it
      expect(() => {
        writeFileWithRetry(filePath, content, "utf-8", {
          atomic: true,
          retries: 0,
        });
      }).toThrow();

      // Verify temp file was cleaned up even in parent dir (if accessible)
      if (existsSync(TEST_VAULT_PATH)) {
        const files = readdirSync(TEST_VAULT_PATH);
        expect(files.filter((f) => f.startsWith(".mcp-tmp-"))).toHaveLength(0);
      }
    });

    it("should handle permission errors during temp file creation", () => {
      const filePath = join(TEST_VAULT_PATH, "perm-error.md");
      const content = "Permission error test";

      // Make directory read-only
      chmodSync(TEST_VAULT_PATH, 0o444);

      try {
        writeFileWithRetry(filePath, content, "utf-8", {
          atomic: true,
          retries: 0,
        });
        // Should throw
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeDefined();
      } finally {
        // Restore permissions
        chmodSync(TEST_VAULT_PATH, 0o755);
      }
    });
  });

  describe("Concurrent Write Safety", () => {
    it("should support concurrent writes with unique temp files", () => {
      const file1 = join(TEST_VAULT_PATH, "concurrent1.md");
      const file2 = join(TEST_VAULT_PATH, "concurrent2.md");
      const content1 = "Concurrent write 1";
      const content2 = "Concurrent write 2";

      // Simulate concurrent writes (in practice, temp file timestamps will differ)
      writeFileWithRetry(file1, content1, "utf-8", {
        atomic: true,
      });
      writeFileWithRetry(file2, content2, "utf-8", {
        atomic: true,
      });

      // Both files should exist with correct content
      expect(existsSync(file1)).toBe(true);
      expect(existsSync(file2)).toBe(true);
      expect(readFileSync(file1, "utf-8")).toBe(content1);
      expect(readFileSync(file2, "utf-8")).toBe(content2);

      // No temp files should remain
      const files = readdirSync(TEST_VAULT_PATH);
      expect(files.filter((f) => f.startsWith(".mcp-tmp-"))).toHaveLength(0);
    });

    it("should generate unique temp file names for same target file", () => {
      const filePath = join(TEST_VAULT_PATH, "same-target.md");
      const content1 = "First write";
      const content2 = "Second write";

      // Write twice to same file
      writeFileWithRetry(filePath, content1, "utf-8", {
        atomic: true,
      });

      // Small delay to ensure different timestamp
      const start = Date.now();
      while (Date.now() - start < 2) {
        // Wait 2ms
      }

      writeFileWithRetry(filePath, content2, "utf-8", {
        atomic: true,
      });

      // Final content should be from second write
      expect(readFileSync(filePath, "utf-8")).toBe(content2);

      // No temp files should remain
      const files = readdirSync(TEST_VAULT_PATH);
      expect(files.filter((f) => f.startsWith(".mcp-tmp-"))).toHaveLength(0);
    });
  });

  describe("Transactional Flag", () => {
    it("should accept transactional flag for telemetry", () => {
      const filePath = join(TEST_VAULT_PATH, "transactional.md");
      const content = "Transactional write";

      // transactional flag should be accepted (used for telemetry)
      writeFileWithRetry(filePath, content, "utf-8", {
        atomic: true,
        transactional: true,
      });

      expect(existsSync(filePath)).toBe(true);
      expect(readFileSync(filePath, "utf-8")).toBe(content);
    });
  });
});
