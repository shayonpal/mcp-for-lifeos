/**
 * End-to-End Workflow Tests for rename_note
 *
 * Tests realistic workflows against MCP-129 contracts:
 * - Archive Project: Move completed project to Archives with link updates
 * - Organize Inbox: Categorize inbox notes into PARA folders
 * - Refactor Structure: Multiple sequential renames with bidirectional links
 *
 * @see dev/contracts/MCP-129-contracts.ts
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { promises as fs } from 'fs';
import * as path from 'path';
import { VaultUtils } from '../../../src/modules/files/index.js';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';
import type { ToolHandlerContext } from '../../../dev/contracts/MCP-8-contracts.js';
import type { RenameNoteOutput } from '../../../dev/contracts/MCP-105-contracts.js';

describe('Workflow Tests: End-to-End rename_note Scenarios', () => {
  let vaultPath: string;
  let originalConfig: any;
  let renameNoteHandler: any;

  beforeEach(async () => {
    // Create temporary vault
    const randomId = randomBytes(8).toString('hex');
    vaultPath = path.join(tmpdir(), `test-vault-${randomId}`);
    await fs.mkdir(vaultPath, { recursive: true });

    // Mock the LIFEOS_CONFIG
    const { LIFEOS_CONFIG } = await import('../../../src/config.js');
    originalConfig = { ...LIFEOS_CONFIG };
    LIFEOS_CONFIG.vaultPath = vaultPath;

    // Reset VaultUtils singletons to use new config
    VaultUtils.resetSingletons();

    // Import the handler
    const { registerNoteHandlers } = await import('../../../src/server/handlers/note-handlers.js');
    const handlerRegistry = new Map();
    registerNoteHandlers(handlerRegistry);
    renameNoteHandler = handlerRegistry.get('rename_note');
  });

  afterEach(async () => {
    // Restore original config
    if (originalConfig) {
      const { LIFEOS_CONFIG } = await import('../../../src/config.js');
      Object.assign(LIFEOS_CONFIG, originalConfig);
    }

    // Clean up temporary vault
    if (vaultPath) {
      await fs.rm(vaultPath, { recursive: true, force: true });
    }
  });

  describe('Workflow 1: Archive Project', () => {
    it('should move completed project to Archives with full link updates', async () => {
      // Setup: Create PARA structure
      const projectsDir = path.join(vaultPath, 'Projects');
      const archivesDir = path.join(vaultPath, 'Archives');
      const dailyDir = path.join(vaultPath, 'Daily');

      await fs.mkdir(projectsDir, { recursive: true });
      await fs.mkdir(archivesDir, { recursive: true });
      await fs.mkdir(dailyDir, { recursive: true });

      // Create project note
      const projectPath = path.join(projectsDir, 'website-redesign.md');
      const projectContent = `---
title: Website Redesign Project
tags: [project, web, design]
status: completed
---

# Website Redesign

Project completed successfully.

## Key Achievements
- New design ^key-achievements
- Improved UX
`;
      await fs.writeFile(projectPath, projectContent);

      // Create linking notes (bidirectional references)
      const dailyNotePath = path.join(dailyDir, '2025-11-01.md');
      const dailyContent = `---
title: November 1, 2025
---

# Daily Note

## Projects
- Completed [[website-redesign]]
- See [[website-redesign#^key-achievements]] for details
`;
      await fs.writeFile(dailyNotePath, dailyContent);

      const anotherNotePath = path.join(projectsDir, 'project-summary.md');
      const anotherNoteContent = `---
title: Project Summary
---

# Active Projects

## Completed
- [[website-redesign|Website Redesign Project]]
`;
      await fs.writeFile(anotherNotePath, anotherNoteContent);

      const context: ToolHandlerContext = {
        registryConfig: { serverVersion: '2.0.1', toolMode: 'consolidated-only' },
        analytics: { logToolCall: () => Promise.resolve() } as any
      };

      // Execute: Archive the project
      const archivePath = path.join(archivesDir, 'website-redesign.md');
      const result = await renameNoteHandler(
        {
          oldPath: projectPath,
          newPath: archivePath,
          updateLinks: true
        },
        context
      );

      const output = JSON.parse(result.content[0].text) as RenameNoteOutput;

      // Verify: File moved successfully
      expect(output.success).toBe(true);
      expect(output.newPath).toBe(archivePath);

      const oldExists = await fs.access(projectPath).then(() => true).catch(() => false);
      const newExists = await fs.access(archivePath).then(() => true).catch(() => false);
      expect(oldExists).toBe(false);
      expect(newExists).toBe(true);

      // Verify: Frontmatter preserved
      const archivedContent = await fs.readFile(archivePath, 'utf-8');
      expect(archivedContent).toContain('title: Website Redesign Project');
      expect(archivedContent).toContain('tags: [project, web, design]');
      expect(archivedContent).toContain('status: completed');
      expect(archivedContent).toContain('# Website Redesign');
      expect(archivedContent).toContain('^key-achievements');

      // Verify: Links updated in daily note
      const updatedDaily = await fs.readFile(dailyNotePath, 'utf-8');
      expect(updatedDaily).toContain('[[website-redesign]]');
      expect(updatedDaily).toContain('[[website-redesign#^key-achievements]]');

      // Verify: Links updated in project summary
      const updatedSummary = await fs.readFile(anotherNotePath, 'utf-8');
      expect(updatedSummary).toContain('[[website-redesign|Website Redesign Project]]');

      // Verify: Operation includes metrics
      expect(output.metrics).toBeDefined();
    });

    it('should handle preview operation before archiving', async () => {
      // Setup: Create minimal project structure
      const projectsDir = path.join(vaultPath, 'Projects');
      const archivesDir = path.join(vaultPath, 'Archives');

      await fs.mkdir(projectsDir, { recursive: true });
      await fs.mkdir(archivesDir, { recursive: true });

      const projectPath = path.join(projectsDir, 'test-project.md');
      await fs.writeFile(projectPath, '---\ntitle: Test Project\n---\n\nProject content.');

      const context: ToolHandlerContext = {
        registryConfig: { serverVersion: '2.0.1', toolMode: 'consolidated-only' },
        analytics: { logToolCall: () => Promise.resolve() } as any
      };

      // Execute: Preview operation
      const archivePath = path.join(archivesDir, 'test-project.md');
      const result = await renameNoteHandler(
        {
          oldPath: projectPath,
          newPath: archivePath,
          updateLinks: true,
          dryRun: true
        },
        context
      );

      const output = JSON.parse(result.content[0].text);

      // Verify: Preview structure
      expect(output.success).toBe(true);
      expect(output.preview).toBeDefined();
      expect(output.preview.operation).toBe('rename');
      expect(output.preview.oldPath).toBe(projectPath);
      expect(output.preview.newPath).toBe(archivePath);
      expect(output.preview.executionMode).toBe('dry-run');

      // Verify: File not moved
      const oldExists = await fs.access(projectPath).then(() => true).catch(() => false);
      const newExists = await fs.access(archivePath).then(() => true).catch(() => false);
      expect(oldExists).toBe(true);
      expect(newExists).toBe(false);
    });
  });

  describe('Workflow 2: Organize Inbox', () => {
    it('should categorize inbox notes into PARA folders with cross-references intact', async () => {
      // Setup: Create PARA structure
      const inboxDir = path.join(vaultPath, 'Inbox');
      const projectsDir = path.join(vaultPath, 'Projects');
      const areasDir = path.join(vaultPath, 'Areas');

      await fs.mkdir(inboxDir, { recursive: true });
      await fs.mkdir(projectsDir, { recursive: true });
      await fs.mkdir(areasDir, { recursive: true });

      // Create inbox notes with cross-references
      const inboxNote1Path = path.join(inboxDir, 'new-project-idea.md');
      const inboxNote1Content = `---
title: New Project Idea
tags: [inbox, project]
---

# New Project Idea

This relates to [[learning-plan]].
`;
      await fs.writeFile(inboxNote1Path, inboxNote1Content);

      const inboxNote2Path = path.join(inboxDir, 'learning-plan.md');
      const inboxNote2Content = `---
title: Learning Plan
tags: [inbox, area]
---

# Learning Plan

Referenced by [[new-project-idea]].
`;
      await fs.writeFile(inboxNote2Path, inboxNote2Content);

      const context: ToolHandlerContext = {
        registryConfig: { serverVersion: '2.0.1', toolMode: 'consolidated-only' },
        analytics: { logToolCall: () => Promise.resolve() } as any
      };

      // Execute: Categorize first note as Project
      const projectPath = path.join(projectsDir, 'new-project-idea.md');
      const result1 = await renameNoteHandler(
        {
          oldPath: inboxNote1Path,
          newPath: projectPath,
          updateLinks: true
        },
        context
      );

      const output1 = JSON.parse(result1.content[0].text) as RenameNoteOutput;
      expect(output1.success).toBe(true);

      // Execute: Categorize second note as Area
      const areaPath = path.join(areasDir, 'learning-plan.md');
      const result2 = await renameNoteHandler(
        {
          oldPath: inboxNote2Path,
          newPath: areaPath,
          updateLinks: true
        },
        context
      );

      const output2 = JSON.parse(result2.content[0].text) as RenameNoteOutput;
      expect(output2.success).toBe(true);

      // Verify: Both notes moved
      const inbox1Exists = await fs.access(inboxNote1Path).then(() => true).catch(() => false);
      const inbox2Exists = await fs.access(inboxNote2Path).then(() => true).catch(() => false);
      const project1Exists = await fs.access(projectPath).then(() => true).catch(() => false);
      const area1Exists = await fs.access(areaPath).then(() => true).catch(() => false);

      expect(inbox1Exists).toBe(false);
      expect(inbox2Exists).toBe(false);
      expect(project1Exists).toBe(true);
      expect(area1Exists).toBe(true);

      // Verify: Cross-references updated
      const updatedProjectContent = await fs.readFile(projectPath, 'utf-8');
      expect(updatedProjectContent).toContain('[[learning-plan]]');

      const updatedAreaContent = await fs.readFile(areaPath, 'utf-8');
      expect(updatedAreaContent).toContain('[[new-project-idea]]');

      // Verify: Links are updated (no folder prefix in same-folder or simple references)
      // Note: Link updater uses note-name-only format, not folder-prefixed format
    });
  });

  describe('Workflow 3: Refactor Structure', () => {
    it('should handle multiple sequential renames with bidirectional link updates', async () => {
      // Setup: Create note graph with bidirectional links
      const notesDir = path.join(vaultPath, 'Notes');
      const reorgDir = path.join(vaultPath, 'Reorganized');

      await fs.mkdir(notesDir, { recursive: true });
      await fs.mkdir(reorgDir, { recursive: true });

      // Create note A (links to B and C)
      const noteAPath = path.join(notesDir, 'note-a.md');
      const noteAContent = `---
title: Note A
---

# Note A

Links to [[note-b]] and [[note-c]].
`;
      await fs.writeFile(noteAPath, noteAContent);

      // Create note B (links to A and C)
      const noteBPath = path.join(notesDir, 'note-b.md');
      const noteBContent = `---
title: Note B
---

# Note B

Links to [[note-a]] and [[note-c]].
`;
      await fs.writeFile(noteBPath, noteBContent);

      // Create note C (links to A and B)
      const noteCPath = path.join(notesDir, 'note-c.md');
      const noteCContent = `---
title: Note C
---

# Note C

Links to [[note-a]] and [[note-b]].
`;
      await fs.writeFile(noteCPath, noteCContent);

      const context: ToolHandlerContext = {
        registryConfig: { serverVersion: '2.0.1', toolMode: 'consolidated-only' },
        analytics: { logToolCall: () => Promise.resolve() } as any
      };

      // Execute: Sequential renames (refactor structure)
      // Rename A
      const newAPath = path.join(reorgDir, 'concept-alpha.md');
      const result1 = await renameNoteHandler(
        {
          oldPath: noteAPath,
          newPath: newAPath,
          updateLinks: true
        },
        context
      );
      expect(JSON.parse(result1.content[0].text).success).toBe(true);

      // Rename B
      const newBPath = path.join(reorgDir, 'concept-beta.md');
      const result2 = await renameNoteHandler(
        {
          oldPath: noteBPath,
          newPath: newBPath,
          updateLinks: true
        },
        context
      );
      expect(JSON.parse(result2.content[0].text).success).toBe(true);

      // Rename C
      const newCPath = path.join(reorgDir, 'concept-gamma.md');
      const result3 = await renameNoteHandler(
        {
          oldPath: noteCPath,
          newPath: newCPath,
          updateLinks: true
        },
        context
      );
      expect(JSON.parse(result3.content[0].text).success).toBe(true);

      // Verify: All files moved
      const oldAExists = await fs.access(noteAPath).then(() => true).catch(() => false);
      const oldBExists = await fs.access(noteBPath).then(() => true).catch(() => false);
      const oldCExists = await fs.access(noteCPath).then(() => true).catch(() => false);
      const newAExists = await fs.access(newAPath).then(() => true).catch(() => false);
      const newBExists = await fs.access(newBPath).then(() => true).catch(() => false);
      const newCExists = await fs.access(newCPath).then(() => true).catch(() => false);

      expect(oldAExists).toBe(false);
      expect(oldBExists).toBe(false);
      expect(oldCExists).toBe(false);
      expect(newAExists).toBe(true);
      expect(newBExists).toBe(true);
      expect(newCExists).toBe(true);

      // Verify: Bidirectional links intact (using note-name-only format)
      const finalAContent = await fs.readFile(newAPath, 'utf-8');
      expect(finalAContent).toContain('[[concept-beta]]');
      expect(finalAContent).toContain('[[concept-gamma]]');

      const finalBContent = await fs.readFile(newBPath, 'utf-8');
      expect(finalBContent).toContain('[[concept-alpha]]');
      expect(finalBContent).toContain('[[concept-gamma]]');

      const finalCContent = await fs.readFile(newCPath, 'utf-8');
      expect(finalCContent).toContain('[[concept-alpha]]');
      expect(finalCContent).toContain('[[concept-beta]]');

      // Verify: Graph consistency (all old references gone)
      expect(finalAContent).not.toContain('[[note-b]]');
      expect(finalAContent).not.toContain('[[note-c]]');
      expect(finalBContent).not.toContain('[[note-a]]');
      expect(finalBContent).not.toContain('[[note-c]]');
      expect(finalCContent).not.toContain('[[note-a]]');
      expect(finalCContent).not.toContain('[[note-b]]');
    });
  });
});
