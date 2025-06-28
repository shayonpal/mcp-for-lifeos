import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import { VaultUtils } from "../../src/vault-utils.js";
import { promises as fs } from "fs";
import * as path from "path";
import { tmpdir } from "os";
import { randomBytes } from "crypto";
import { LIFEOS_CONFIG } from "../../src/config.js";
import { format } from "date-fns";

describe("Daily Note Task Addition Workflow", () => {
  let vaultPath: string;
  let originalConfig: any;
  const testDate = new Date("2025-06-28");
  const dateStr = format(testDate, "yyyy-MM-dd");
  const todayStr = format(new Date(), "yyyy-MM-dd"); // For task creation dates

  beforeEach(async () => {
    // Create temporary vault
    const randomId = randomBytes(8).toString("hex");
    vaultPath = path.join(tmpdir(), `test-vault-${randomId}`);
    await fs.mkdir(vaultPath, { recursive: true });

    // Create daily notes folder
    const dailyNotesPath = path.join(
      vaultPath,
      "20 - Areas",
      "21 - Myself",
      "Journals",
      "Daily",
    );
    await fs.mkdir(dailyNotesPath, { recursive: true });

    // Store original config
    originalConfig = { ...LIFEOS_CONFIG };
    LIFEOS_CONFIG.vaultPath = vaultPath;
    LIFEOS_CONFIG.dailyNotesPath = dailyNotesPath;
  });

  afterEach(async () => {
    // Restore original config
    Object.assign(LIFEOS_CONFIG, originalConfig);

    // Cleanup temp vault
    await fs.rm(vaultPath, { recursive: true, force: true });
  });

  describe("Reproducing Issue #88", () => {
    it("should add tasks to existing Day's Notes section", async () => {
      // Step 1: Create daily note (simulating get_daily_note)
      const dailyNote = await VaultUtils.createDailyNote(testDate);
      expect(dailyNote).toBeDefined();
      expect(dailyNote.content).toContain("# Day's Notes");

      // Step 2: Add a task to the daily note (simulating insert_content)
      const taskContent =
        "- [ ] Test task that should go in Day's Notes section";
      const updatedNote = VaultUtils.insertContent(
        dailyNote.path,
        taskContent,
        { heading: "Day's Notes" },
        "end-of-section",
        true,
      );

      expect(updatedNote).toBeDefined();
      // Task should now have creation date added (uses today's date, not the daily note date)
      const expectedTaskWithDate = `${taskContent} ➕ ${todayStr}`;
      expect(updatedNote.content).toContain(expectedTaskWithDate);

      // Verify task is in correct section
      const lines = updatedNote.content.split("\n");
      const dayNotesIdx = lines.findIndex((l) => l.trim() === "# Day's Notes");
      const taskIdx = lines.findIndex((l) => l.includes("Test task"));
      const linkedNotesIdx = lines.findIndex(
        (l) => l.trim() === "# Linked Notes",
      );

      expect(taskIdx).toBeGreaterThan(dayNotesIdx);
      expect(taskIdx).toBeLessThan(linkedNotesIdx);
    });

    it("should handle multiple task additions without creating duplicates", async () => {
      // Create daily note
      const dailyNote = await VaultUtils.createDailyNote(testDate);

      // Add first task
      let updatedPath = dailyNote.path;
      let result = VaultUtils.insertContent(
        updatedPath,
        "- [ ] First task",
        { heading: "Day's Notes" },
        "end-of-section",
        true,
      );

      // Write the updated content back
      await fs.writeFile(updatedPath, result.content);

      // Add second task
      result = VaultUtils.insertContent(
        updatedPath,
        "- [ ] Second task",
        { heading: "Day's Notes" },
        "end-of-section",
        true,
      );

      // Verify both tasks are present with creation dates (uses today's date)
      expect(result.content).toContain(`- [ ] First task ➕ ${todayStr}`);
      expect(result.content).toContain(`- [ ] Second task ➕ ${todayStr}`);

      // Verify structure is maintained
      const occurrences = (result.content.match(/# Day's Notes/g) || []).length;
      expect(occurrences).toBe(1); // Should only have one Day's Notes heading
    });

    it("should fail gracefully when heading doesn't exist", async () => {
      const dailyNote = await VaultUtils.createDailyNote(testDate);

      // Try to add task to non-existent section
      expect(() => {
        VaultUtils.insertContent(
          dailyNote.path,
          "- [ ] Task",
          { heading: "Wrong Section Name" },
          "end-of-section",
          true,
        );
      }).toThrow("Heading not found");
    });

    it("should handle case variations in Day's Notes", async () => {
      // Create note with different case variation
      const notePath = path.join(vaultPath, "test-case.md");
      await fs.writeFile(
        notePath,
        `---
content type: Daily Note
---

# DAY'S NOTES

Content here

# Other Section`,
      );

      // This should fail due to case sensitivity
      expect(() => {
        VaultUtils.insertContent(
          notePath,
          "- [ ] Task",
          { heading: "Day's Notes" }, // Different case
          "end-of-section",
          true,
        );
      }).toThrow("Heading not found");

      // This should work with exact case
      const result = VaultUtils.insertContent(
        notePath,
        "- [ ] Task",
        { heading: "DAY'S NOTES" }, // Exact case
        "end-of-section",
        true,
      );

      expect(result.content).toContain("- [ ] Task");
    });
  });

  describe("Error Scenarios from RCA", () => {
    it("should not create duplicate files when updating daily notes", async () => {
      // Create initial daily note
      const dailyNote = await VaultUtils.createDailyNote(testDate);
      const originalPath = dailyNote.path;

      // Simulate multiple updates
      for (let i = 1; i <= 3; i++) {
        const result = VaultUtils.insertContent(
          originalPath,
          `- [ ] Task ${i}`,
          { heading: "Day's Notes" },
          "end-of-section",
          true,
        );

        // Write back to ensure file is updated
        await fs.writeFile(originalPath, result.content);
      }

      // Check that no duplicate files were created
      const dailyNotesDir = path.dirname(originalPath);
      const files = await fs.readdir(dailyNotesDir);
      const matchingFiles = files.filter((f) => f.startsWith(dateStr));

      expect(matchingFiles).toHaveLength(1); // Should only have one file for this date
      expect(matchingFiles[0]).toBe(`${dateStr}.md`);
    });
  });
});
