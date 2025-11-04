import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import { insertContent, createDailyNote } from "../../src/modules/files/index.js";
import { promises as fs } from "fs";
import * as path from "path";
import { tmpdir } from "os";
import { randomBytes } from "crypto";
import { LIFEOS_CONFIG, getLocalDate } from "../../src/shared/index.js";
import { TemplateManager } from "../../src/modules/templates/index.js";
import { format } from "date-fns";
import { resetTestSingletons } from "../helpers/test-utils.js";

describe("Task Formatting with Obsidian Tasks Plugin", () => {
  let vaultPath: string;
  let originalConfig: any;
  const today = format(new Date(), "yyyy-MM-dd");

  beforeEach(async () => {
    // Create temporary vault
    const randomId = randomBytes(8).toString("hex");
    vaultPath = path.join(tmpdir(), `test-vault-${randomId}`);
    await fs.mkdir(vaultPath, { recursive: true });

    // Store original config
    originalConfig = { ...LIFEOS_CONFIG };
    LIFEOS_CONFIG.vaultPath = vaultPath;

    // Reset singletons to use new config
    resetTestSingletons();
  });

  afterEach(async () => {
    // Restore original config
    Object.assign(LIFEOS_CONFIG, originalConfig);

    // Cleanup temp vault
    await fs.rm(vaultPath, { recursive: true, force: true });
  });

  describe("Task Creation Date Formatting", () => {
    it("should add creation date to tasks without one", async () => {
      // Create a test note
      const notePath = path.join(vaultPath, "test-note.md");
      const noteContent = `---
title: Test Note
---

# Tasks

Some content here`;
      await fs.writeFile(notePath, noteContent);

      // Insert a task
      const taskContent = "- [ ] Test task without creation date";
      const updatedNote = insertContent(
        notePath,
        taskContent,
        { heading: "Tasks" },
        "end-of-section",
        true,
      );

      // Verify task has creation date added
      expect(updatedNote.content).toContain(
        `- [ ] Test task without creation date ➕ ${today}`,
      );
    });

    it("should not add creation date to tasks that already have one", async () => {
      // Create a test note
      const notePath = path.join(vaultPath, "test-note.md");
      const noteContent = `---
title: Test Note
---

# Tasks

Some content here`;
      await fs.writeFile(notePath, noteContent);

      // Insert a task that already has a creation date
      const existingDate = "2025-06-01";
      const taskContent = `- [ ] Test task with existing date ➕ ${existingDate}`;
      const updatedNote = insertContent(
        notePath,
        taskContent,
        { heading: "Tasks" },
        "end-of-section",
        true,
      );

      // Verify task still has the original creation date
      expect(updatedNote.content).toContain(
        `- [ ] Test task with existing date ➕ ${existingDate}`,
      );
      expect(updatedNote.content).not.toContain(`➕ ${today}`);
    });

    it("should handle multiple tasks correctly", async () => {
      // Create a test note
      const notePath = path.join(vaultPath, "test-note.md");
      const noteContent = `---
title: Test Note
---

# Tasks

Some content here`;
      await fs.writeFile(notePath, noteContent);

      // Insert multiple tasks at once
      const tasksContent = `- [ ] First task
- [ ] Second task with date ➕ 2025-06-01
- [ ] Third task`;

      const updatedNote = insertContent(
        notePath,
        tasksContent,
        { heading: "Tasks" },
        "end-of-section",
        true,
      );

      // Verify each task is formatted correctly
      const lines = updatedNote.content.split("\n");
      const taskLines = lines.filter((line) => line.includes("- [ ]"));

      expect(taskLines[0]).toBe(`- [ ] First task ➕ ${today}`);
      expect(taskLines[1]).toBe("- [ ] Second task with date ➕ 2025-06-01");
      expect(taskLines[2]).toBe(`- [ ] Third task ➕ ${today}`);
    });

    it("should not modify non-task list items", async () => {
      // Create a test note
      const notePath = path.join(vaultPath, "test-note.md");
      const noteContent = `---
title: Test Note
---

# Content

Some content here`;
      await fs.writeFile(notePath, noteContent);

      // Insert mixed content
      const mixedContent = `- Regular list item
- [ ] Task item
1. Numbered list item`;

      const updatedNote = insertContent(
        notePath,
        mixedContent,
        { heading: "Content" },
        "end-of-section",
        true,
      );

      // Verify only tasks are modified
      expect(updatedNote.content).toContain("- Regular list item");
      expect(updatedNote.content).toContain(`- [ ] Task item ➕ ${today}`);
      expect(updatedNote.content).toContain("1. Numbered list item");
    });

    it("should work with daily note task workflow", async () => {
      // Create daily notes folder structure based on config
      const dailyNotesPath = path.join(
        vaultPath,
        "20 - Areas",
        "21 - Myself",
        "Journals",
        "Daily",
      );
      await fs.mkdir(dailyNotesPath, { recursive: true });
      LIFEOS_CONFIG.dailyNotesPath = dailyNotesPath;

      // Create daily note
      const testDate = new Date();
      const dailyNote = await createDailyNote(
        testDate,
        getLocalDate,
        () => new TemplateManager(LIFEOS_CONFIG.vaultPath)
      );

      // Add a task to the daily note
      const taskContent = "- [ ] Daily task for testing";
      const updatedNote = insertContent(
        dailyNote.path,
        taskContent,
        { heading: "Day's Notes" },
        "end-of-section",
        true,
      );

      // Verify task has creation date
      expect(updatedNote.content).toContain(
        `- [ ] Daily task for testing ➕ ${today}`,
      );
    });
  });

  describe("Task Properties Formatting", () => {
    it("should maintain other task properties when adding creation date", async () => {
      // Create a test note
      const notePath = path.join(vaultPath, "test-note.md");
      const noteContent = `---
title: Test Note
---

# Tasks`;
      await fs.writeFile(notePath, noteContent);

      // Test tasks with various properties (but no creation date)
      const tasksWithProperties = [
        {
          input: "- [ ] Task with due date 📅 2025-06-30",
          shouldContain: ["Task with due date", `➕ ${today}`, "📅 2025-06-30"],
        },
        {
          input: "- [ ] Task with priority 🔺",
          shouldContain: ["Task with priority", `➕ ${today}`, "🔺"],
        },
        {
          input: "- [ ] Task with scheduled date ⏳ 2025-06-29",
          shouldContain: [
            "Task with scheduled date",
            `➕ ${today}`,
            "⏳ 2025-06-29",
          ],
        },
        {
          input:
            "- [ ] Task with multiple properties 🛫 2025-06-28 📅 2025-06-30",
          shouldContain: [
            "Task with multiple properties",
            `➕ ${today}`,
            "🛫 2025-06-28",
            "📅 2025-06-30",
          ],
        },
      ];

      for (const testCase of tasksWithProperties) {
        // Create fresh note for each test
        await fs.writeFile(notePath, noteContent);

        const updatedNote = insertContent(
          notePath,
          testCase.input,
          { heading: "Tasks" },
          "end-of-section",
          true,
        );

        // Verify all expected parts are present in the updated content
        for (const expected of testCase.shouldContain) {
          expect(updatedNote.content).toContain(expected);
        }

        // Verify property order: ➕ should come before 🛫, ⏳, 📅
        const taskLine = updatedNote.content
          .split("\n")
          .find((line) => line.includes("- [ ]"))!;
        const createdIndex = taskLine.indexOf("➕");
        const startIndex = taskLine.indexOf("🛫");
        const scheduledIndex = taskLine.indexOf("⏳");
        const dueIndex = taskLine.indexOf("📅");

        if (startIndex !== -1) expect(createdIndex).toBeLessThan(startIndex);
        if (scheduledIndex !== -1)
          expect(createdIndex).toBeLessThan(scheduledIndex);
        if (dueIndex !== -1) expect(createdIndex).toBeLessThan(dueIndex);
      }
    });
  });
});
