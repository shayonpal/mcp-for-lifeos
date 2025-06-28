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

  describe("Task Insertion Order (Issue #90)", () => {
    it("should append new tasks at the bottom of existing task lists", async () => {
      // Create a daily note with existing tasks
      const notePath = path.join(vaultPath, "task-order-test.md");
      await fs.writeFile(
        notePath,
        `---
content type: Daily Note
---

# Day's Notes

- [ ] First existing task ➕ ${todayStr}
- [ ] Second existing task ➕ ${todayStr}

Some content after tasks

# Other Section`,
      );

      // Add a new task - it should go after existing tasks
      const result = VaultUtils.insertContent(
        notePath,
        "- [ ] New task that should be at bottom",
        { heading: "Day's Notes" },
        "end-of-section",
        true,
      );

      // Verify task order
      const lines = result.content.split("\n");
      const firstTaskIdx = lines.findIndex((l) =>
        l.includes("First existing task"),
      );
      const secondTaskIdx = lines.findIndex((l) =>
        l.includes("Second existing task"),
      );
      const newTaskIdx = lines.findIndex((l) =>
        l.includes("New task that should be at bottom"),
      );

      expect(firstTaskIdx).toBeGreaterThan(-1);
      expect(secondTaskIdx).toBeGreaterThan(firstTaskIdx);
      expect(newTaskIdx).toBeGreaterThan(secondTaskIdx);

      // New task should be after the last existing task, not at the top
      expect(newTaskIdx - secondTaskIdx).toBe(1); // Should be immediately after
    });

    it("should handle mixed content with tasks properly", async () => {
      // Create a daily note with mixed content
      const notePath = path.join(vaultPath, "mixed-content-test.md");
      await fs.writeFile(
        notePath,
        `---
content type: Daily Note
---

# Day's Notes

Some introduction text here.

- [ ] Task in the middle ➕ ${todayStr}

More content between tasks.

# Other Section`,
      );

      // Add a new task
      const result = VaultUtils.insertContent(
        notePath,
        "- [ ] New task",
        { heading: "Day's Notes" },
        "end-of-section",
        true,
      );

      // The new task should be inserted after the existing task, not at the beginning of the section
      const lines = result.content.split("\n");
      const headingIdx = lines.findIndex((l) => l.trim() === "# Day's Notes");
      const existingTaskIdx = lines.findIndex((l) =>
        l.includes("Task in the middle"),
      );
      const newTaskIdx = lines.findIndex((l) => l.includes("- [ ] New task"));

      expect(newTaskIdx).toBeGreaterThan(existingTaskIdx);
      expect(existingTaskIdx).toBeGreaterThan(headingIdx);
    });

    it("should insert task at bottom when section has no existing tasks", async () => {
      // Create a daily note without tasks initially
      const notePath = path.join(vaultPath, "no-tasks-test.md");
      await fs.writeFile(
        notePath,
        `---
content type: Daily Note
---

# Day's Notes

Just some text content here.

# Other Section`,
      );

      // Add first task
      let result = VaultUtils.insertContent(
        notePath,
        "- [ ] First task",
        { heading: "Day's Notes" },
        "end-of-section",
        true,
      );

      // Should be added at the end of the section, after the text
      let lines = result.content.split("\n");
      let textIdx = lines.findIndex((l) =>
        l.includes("Just some text content"),
      );
      let firstTaskIdx = lines.findIndex((l) => l.includes("First task"));
      let otherSectionIdx = lines.findIndex(
        (l) => l.trim() === "# Other Section",
      );

      expect(firstTaskIdx).toBeGreaterThan(textIdx);
      expect(firstTaskIdx).toBeLessThan(otherSectionIdx);

      // Write the result back to simulate real usage
      await fs.writeFile(notePath, result.content);

      // Now add a second task
      result = VaultUtils.insertContent(
        notePath,
        "- [ ] Second task",
        { heading: "Day's Notes" },
        "end-of-section",
        true,
      );

      // Second task should be after the first
      lines = result.content.split("\n");
      firstTaskIdx = lines.findIndex((l) => l.includes("First task"));
      const secondTaskIdx = lines.findIndex((l) => l.includes("Second task"));

      expect(secondTaskIdx).toBeGreaterThan(firstTaskIdx);
      expect(secondTaskIdx - firstTaskIdx).toBe(1); // Should be consecutive
    });

    it("should NOT insert tasks at the beginning of the section", async () => {
      // This test explicitly verifies issue #90 - tasks should not go at top
      const notePath = path.join(vaultPath, "issue-90-test.md");
      await fs.writeFile(
        notePath,
        `---
content type: Daily Note
---

# Day's Notes

Here's my daily summary of activities.

- [ ] Morning: Check emails ➕ ${todayStr}
- [ ] Afternoon: Team meeting ➕ ${todayStr}

Some notes after the tasks.

# Other Section`,
      );

      // Add a new task
      const result = VaultUtils.insertContent(
        notePath,
        "- [ ] Evening: Review code",
        { heading: "Day's Notes" },
        "end-of-section",
        true,
      );

      // The new task should NOT be right after the heading
      const lines = result.content.split("\n");
      const headingIdx = lines.findIndex((l) => l.trim() === "# Day's Notes");
      const summaryIdx = lines.findIndex((l) => l.includes("daily summary"));
      const morningTaskIdx = lines.findIndex((l) =>
        l.includes("Morning: Check emails"),
      );
      const afternoonTaskIdx = lines.findIndex((l) =>
        l.includes("Afternoon: Team meeting"),
      );
      const eveningTaskIdx = lines.findIndex((l) =>
        l.includes("Evening: Review code"),
      );

      // Verify order: heading < summary < morning < afternoon < evening
      expect(summaryIdx).toBeGreaterThan(headingIdx);
      expect(morningTaskIdx).toBeGreaterThan(summaryIdx);
      expect(afternoonTaskIdx).toBeGreaterThan(morningTaskIdx);
      expect(eveningTaskIdx).toBeGreaterThan(afternoonTaskIdx);

      // The new task should specifically be after the last existing task
      expect(eveningTaskIdx - afternoonTaskIdx).toBe(1);
    });

    it("should handle the exact scenario from issue #90", async () => {
      // Start with a daily note that already has content
      const notePath = path.join(vaultPath, `${dateStr}.md`);
      const initialContent = `---
aliases:
  - June 28, 2025
content type:
  - Daily Note
tags:
  - dailyNote
---

# Day's Notes

- [ ] Sync Claude Code slash commands with alfred ➕ ${todayStr}

Meeting notes from earlier today...

# Linked Notes

# Notes Created On This Day`;

      await fs.writeFile(notePath, initialContent);

      // User adds a new task
      const result = VaultUtils.insertContent(
        notePath,
        "- [ ] Review and delete vault-reorganisation feature branch",
        { heading: "Day's Notes" },
        "end-of-section",
        true,
      );

      // Check where the new task was inserted
      const lines = result.content.split("\n");
      const originalTaskIdx = lines.findIndex((l) =>
        l.includes("Sync Claude Code"),
      );
      const newTaskIdx = lines.findIndex((l) =>
        l.includes("Review and delete"),
      );
      const meetingNotesIdx = lines.findIndex((l) =>
        l.includes("Meeting notes"),
      );

      // New task should be AFTER the original task, not before
      expect(newTaskIdx).toBeGreaterThan(originalTaskIdx);

      // But should still be before the meeting notes
      expect(newTaskIdx).toBeLessThan(meetingNotesIdx);

      // Verify the actual position relationship

      // Also verify the actual position relationship
      expect(newTaskIdx).toBe(originalTaskIdx + 1); // Should be immediately after
    });

    it("should handle case when section has no tasks initially", async () => {
      // This might be the actual issue - when there are no tasks initially
      const notePath = path.join(vaultPath, "no-initial-tasks.md");
      const initialContent = `---
content type:
  - Daily Note
---

# Day's Notes

Just some text without any tasks yet.

# Other Section`;

      await fs.writeFile(notePath, initialContent);

      // Add first task
      let result = VaultUtils.insertContent(
        notePath,
        "- [ ] First task to add",
        { heading: "Day's Notes" },
        "end-of-section",
        true,
      );

      // Check position - should be at end of section
      let lines = result.content.split("\n");
      const headingIdx = lines.findIndex((l) => l.trim() === "# Day's Notes");
      const textIdx = lines.findIndex((l) => l.includes("Just some text"));
      const firstTaskIdx = lines.findIndex((l) =>
        l.includes("First task to add"),
      );
      const otherSectionIdx = lines.findIndex(
        (l) => l.trim() === "# Other Section",
      );

      // Task should be after the text, not immediately after heading

      // Task should be after the text, not immediately after heading
      expect(firstTaskIdx).toBeGreaterThan(textIdx);
      expect(firstTaskIdx).toBeLessThan(otherSectionIdx);

      // Write back and add second task
      await fs.writeFile(notePath, result.content);

      result = VaultUtils.insertContent(
        notePath,
        "- [ ] Second task to add",
        { heading: "Day's Notes" },
        "end-of-section",
        true,
      );

      lines = result.content.split("\n");
      const secondTaskIdx = lines.findIndex((l) =>
        l.includes("Second task to add"),
      );

      // Second task should be after first
      expect(secondTaskIdx).toBeGreaterThan(firstTaskIdx);
    });

    it("should handle edge case - heading with no content", async () => {
      // Edge case: Just a heading with nothing after it
      const notePath = path.join(vaultPath, "edge-case-test.md");
      const initialContent = `---
content type:
  - Daily Note
---

# Day's Notes

# Other Section

Some content in other section`;

      await fs.writeFile(notePath, initialContent);

      // Add first task
      const result = VaultUtils.insertContent(
        notePath,
        "- [ ] Task in empty section",
        { heading: "Day's Notes" },
        "end-of-section",
        true,
      );

      // Task should be added after the heading but before Other Section
      const lines = result.content.split("\n");
      const dayNotesIdx = lines.findIndex((l) => l.trim() === "# Day's Notes");
      const taskIdx = lines.findIndex((l) =>
        l.includes("Task in empty section"),
      );
      const otherSectionIdx = lines.findIndex(
        (l) => l.trim() === "# Other Section",
      );

      // Verify task position

      expect(taskIdx).toBeGreaterThan(dayNotesIdx);
      expect(taskIdx).toBeLessThan(otherSectionIdx);

      // The task should NOT be immediately after the heading if proper spacing is maintained
      // There should be at least one blank line between heading and task
      expect(taskIdx - dayNotesIdx).toBeGreaterThanOrEqual(2);
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
