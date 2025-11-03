/**
 * Vault Configuration Tests
 *
 * Tests various vault setups and configurations against MCP-129 contracts:
 * - Complex YAML frontmatter preservation
 * - PARA folder structure moves
 * - Mixed link formats (wikilinks, aliases, block refs, headings)
 * - Template interactions
 *
 * @see dev/contracts/MCP-129-contracts.ts
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { promises as fs } from 'fs';
import * as path from 'path';
import { VaultUtils } from '../../src/vault-utils.js';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';
import type { ToolHandlerContext } from '../../dev/contracts/MCP-8-contracts.js';
import type { RenameNoteOutput } from '../../dev/contracts/MCP-105-contracts.js';

describe('Vault Configuration Tests', () => {
  let vaultPath: string;
  let originalConfig: any;
  let renameNoteHandler: any;

  beforeEach(async () => {
    // Create temporary vault
    const randomId = randomBytes(8).toString('hex');
    vaultPath = path.join(tmpdir(), `test-vault-${randomId}`);
    await fs.mkdir(vaultPath, { recursive: true });

    // Mock the LIFEOS_CONFIG
    const { LIFEOS_CONFIG } = await import('../../src/config.js');
    originalConfig = { ...LIFEOS_CONFIG };
    LIFEOS_CONFIG.vaultPath = vaultPath;

    // Reset VaultUtils singletons
    VaultUtils.resetSingletons();

    // Import the handler
    const { registerNoteHandlers } = await import('../../src/server/handlers/note-handlers.js');
    const handlerRegistry = new Map();
    registerNoteHandlers(handlerRegistry);
    renameNoteHandler = handlerRegistry.get('rename_note');
  });

  afterEach(async () => {
    // Restore original config
    if (originalConfig) {
      const { LIFEOS_CONFIG } = await import('../../src/config.js');
      Object.assign(LIFEOS_CONFIG, originalConfig);
    }

    // Clean up temporary vault
    if (vaultPath) {
      await fs.rm(vaultPath, { recursive: true, force: true });
    }
  });

  describe('Complex YAML Frontmatter Preservation', () => {
    it('should preserve all YAML fields including custom and nested structures', async () => {
      const sourcePath = path.join(vaultPath, 'complex-yaml.md');
      const frontmatter = `---
title: Complex YAML Note
tags: [project, important, review]
category: Projects
contentType: Note
status: in-progress
priority: high
dueDate: 2025-12-31
metadata:
  author: Test User
  version: 1.0
  reviewers:
    - Alice
    - Bob
customField: Custom Value
nestedObject:
  level1:
    level2: Nested Value
arrayField:
  - item1
  - item2
  - item3
---

# Complex YAML Note

Content here.
`;
      await fs.writeFile(sourcePath, frontmatter);

      const context: ToolHandlerContext = {
        registryConfig: { serverVersion: '2.0.1', toolMode: 'consolidated-only' },
        analytics: { logToolCall: () => Promise.resolve() } as any
      };

      const destPath = path.join(vaultPath, 'complex-yaml-renamed.md');
      const result = await renameNoteHandler(
        {
          oldPath: sourcePath,
          newPath: destPath,
          updateLinks: false
        },
        context
      );

      const output = JSON.parse(result.content[0].text) as RenameNoteOutput;

      expect(output.success).toBe(true);

      // Verify: All YAML fields preserved
      const renamedContent = await fs.readFile(destPath, 'utf-8');
      expect(renamedContent).toContain('title: Complex YAML Note');
      expect(renamedContent).toContain('tags: [project, important, review]');
      expect(renamedContent).toContain('category: Projects');
      expect(renamedContent).toContain('status: in-progress');
      expect(renamedContent).toContain('priority: high');
      expect(renamedContent).toContain('dueDate: 2025-12-31');

      // Verify: Nested structures preserved
      expect(renamedContent).toContain('metadata:');
      expect(renamedContent).toContain('author: Test User');
      expect(renamedContent).toContain('reviewers:');
      expect(renamedContent).toContain('- Alice');

      // Verify: Custom fields preserved
      expect(renamedContent).toContain('customField: Custom Value');
      expect(renamedContent).toContain('nestedObject:');
      expect(renamedContent).toContain('arrayField:');
    });

    it('should update auto-managed fields while preserving custom fields', async () => {
      const sourcePath = path.join(vaultPath, 'auto-managed.md');
      const content = `---
title: Auto Managed Note
tags: [test]
created: 2025-01-01
modified: 2025-01-02
customField: Keep Me
---

# Auto Managed Note
`;
      await fs.writeFile(sourcePath, content);

      const context: ToolHandlerContext = {
        registryConfig: { serverVersion: '2.0.1', toolMode: 'consolidated-only' },
        analytics: { logToolCall: () => Promise.resolve() } as any
      };

      const destPath = path.join(vaultPath, 'auto-managed-renamed.md');
      const result = await renameNoteHandler(
        {
          oldPath: sourcePath,
          newPath: destPath,
          updateLinks: false
        },
        context
      );

      const output = JSON.parse(result.content[0].text) as RenameNoteOutput;

      expect(output.success).toBe(true);

      // Verify: Custom fields preserved
      const renamedContent = await fs.readFile(destPath, 'utf-8');
      expect(renamedContent).toContain('customField: Keep Me');
      expect(renamedContent).toContain('title: Auto Managed Note');
    });
  });

  describe('PARA Folder Structure Moves', () => {
    it('should handle cross-folder moves within PARA structure', async () => {
      // Create PARA structure
      const projectsDir = path.join(vaultPath, 'Projects');
      const areasDir = path.join(vaultPath, 'Areas');
      const resourcesDir = path.join(vaultPath, 'Resources');
      const archivesDir = path.join(vaultPath, 'Archives');

      await fs.mkdir(projectsDir, { recursive: true });
      await fs.mkdir(areasDir, { recursive: true });
      await fs.mkdir(resourcesDir, { recursive: true });
      await fs.mkdir(archivesDir, { recursive: true });

      // Create note in Projects
      const sourcePath = path.join(projectsDir, 'active-project.md');
      await fs.writeFile(sourcePath, '---\ntitle: Active Project\n---\n\n# Active Project');

      const context: ToolHandlerContext = {
        registryConfig: { serverVersion: '2.0.1', toolMode: 'consolidated-only' },
        analytics: { logToolCall: () => Promise.resolve() } as any
      };

      // Move to Archives
      const destPath = path.join(archivesDir, 'active-project.md');
      const result = await renameNoteHandler(
        {
          oldPath: sourcePath,
          newPath: destPath,
          updateLinks: false
        },
        context
      );

      const output = JSON.parse(result.content[0].text) as RenameNoteOutput;

      expect(output.success).toBe(true);
      expect(output.newPath).toBe(destPath);

      // Verify: File moved across folders
      const oldExists = await fs.access(sourcePath).then(() => true).catch(() => false);
      const newExists = await fs.access(destPath).then(() => true).catch(() => false);

      expect(oldExists).toBe(false);
      expect(newExists).toBe(true);
    });

    it('should update folder-scoped links when moving across PARA folders', async () => {
      // Create PARA folders
      const projectsDir = path.join(vaultPath, 'Projects');
      const areasDir = path.join(vaultPath, 'Areas');

      await fs.mkdir(projectsDir, { recursive: true });
      await fs.mkdir(areasDir, { recursive: true });

      // Create note in Projects
      const targetPath = path.join(projectsDir, 'project-note.md');
      await fs.writeFile(targetPath, '# Project Note');

      // Create linking note in Areas
      const linkingPath = path.join(areasDir, 'area-note.md');
      await fs.writeFile(linkingPath, 'Reference to [[Projects/project-note]]');

      const context: ToolHandlerContext = {
        registryConfig: { serverVersion: '2.0.1', toolMode: 'consolidated-only' },
        analytics: { logToolCall: () => Promise.resolve() } as any
      };

      // Move project note to Areas
      const destPath = path.join(areasDir, 'project-note.md');
      const result = await renameNoteHandler(
        {
          oldPath: targetPath,
          newPath: destPath,
          updateLinks: true
        },
        context
      );

      const output = JSON.parse(result.content[0].text) as RenameNoteOutput;

      expect(output.success).toBe(true);

      // Verify: Link still references the note
      const updatedLinking = await fs.readFile(linkingPath, 'utf-8');
      expect(updatedLinking).toContain('project-note');
    });
  });

  describe('Mixed Link Formats', () => {
    it('should handle all link types: simple wikilinks, aliases, block refs, and headings', async () => {
      // Create target note with headings and block refs
      const targetPath = path.join(vaultPath, 'target-note.md');
      const targetContent = `---
title: Target Note
---

# Target Note

## Section One ^section-one

Content here.

## Section Two

More content ^block-ref
`;
      await fs.writeFile(targetPath, targetContent);

      // Create linking note with all link types
      const linkingPath = path.join(vaultPath, 'linking-note.md');
      const linkingContent = `---
title: Linking Note
---

# References

- Simple wikilink: [[target-note]]
- Aliased wikilink: [[target-note|My Target]]
- Block reference: [[target-note#^block-ref]]
- Heading link: [[target-note#Section One]]
- Heading link with alias: [[target-note#Section Two|Second Section]]
`;
      await fs.writeFile(linkingPath, linkingContent);

      const context: ToolHandlerContext = {
        registryConfig: { serverVersion: '2.0.1', toolMode: 'consolidated-only' },
        analytics: { logToolCall: () => Promise.resolve() } as any
      };

      const destPath = path.join(vaultPath, 'renamed-target.md');
      const result = await renameNoteHandler(
        {
          oldPath: targetPath,
          newPath: destPath,
          updateLinks: true
        },
        context
      );

      const output = JSON.parse(result.content[0].text) as RenameNoteOutput;

      expect(output.success).toBe(true);

      // Verify: All link types updated correctly
      const updatedLinking = await fs.readFile(linkingPath, 'utf-8');

      expect(updatedLinking).toContain('[[renamed-target]]');
      expect(updatedLinking).toContain('[[renamed-target|My Target]]');
      expect(updatedLinking).toContain('[[renamed-target#^block-ref]]'); // Block ref with caret
      expect(updatedLinking).toContain('[[renamed-target#Section One]]');
      expect(updatedLinking).toContain('[[renamed-target#Section Two|Second Section]]');

      // Verify: Block reference caret preserved
      const updatedTarget = await fs.readFile(destPath, 'utf-8');
      expect(updatedTarget).toContain('^section-one');
      expect(updatedTarget).toContain('^block-ref');
    });

    it('should preserve aliases when updating wikilinks', async () => {
      const targetPath = path.join(vaultPath, 'original.md');
      await fs.writeFile(targetPath, '# Original Note');

      const linkingPath = path.join(vaultPath, 'linking.md');
      await fs.writeFile(linkingPath, '[[original|Custom Alias]]');

      const context: ToolHandlerContext = {
        registryConfig: { serverVersion: '2.0.1', toolMode: 'consolidated-only' },
        analytics: { logToolCall: () => Promise.resolve() } as any
      };

      const destPath = path.join(vaultPath, 'renamed.md');
      const result = await renameNoteHandler(
        {
          oldPath: targetPath,
          newPath: destPath,
          updateLinks: true
        },
        context
      );

      const output = JSON.parse(result.content[0].text) as RenameNoteOutput;

      expect(output.success).toBe(true);

      // Verify: Alias preserved in updated link
      const updatedLinking = await fs.readFile(linkingPath, 'utf-8');
      expect(updatedLinking.trim()).toBe('[[renamed|Custom Alias]]');
    });
  });

  describe('Template Interactions', () => {
    it('should preserve template metadata fields when renaming templated notes', async () => {
      // Create note with template metadata
      const sourcePath = path.join(vaultPath, 'template-note.md');
      const content = `---
title: Template Note
template: daily-note
templateVersion: 1.0
templateApplied: 2025-01-01
customTemplateField: Custom Value
---

# Template Note

Content from template.
`;
      await fs.writeFile(sourcePath, content);

      const context: ToolHandlerContext = {
        registryConfig: { serverVersion: '2.0.1', toolMode: 'consolidated-only' },
        analytics: { logToolCall: () => Promise.resolve() } as any
      };

      const destPath = path.join(vaultPath, 'template-note-renamed.md');
      const result = await renameNoteHandler(
        {
          oldPath: sourcePath,
          newPath: destPath,
          updateLinks: false
        },
        context
      );

      const output = JSON.parse(result.content[0].text) as RenameNoteOutput;

      expect(output.success).toBe(true);

      // Verify: Template metadata preserved
      const renamedContent = await fs.readFile(destPath, 'utf-8');
      expect(renamedContent).toContain('template: daily-note');
      expect(renamedContent).toContain('templateVersion: 1.0');
      expect(renamedContent).toContain('templateApplied: 2025-01-01');
      expect(renamedContent).toContain('customTemplateField: Custom Value');
    });

    it('should not corrupt template-specific frontmatter fields', async () => {
      const sourcePath = path.join(vaultPath, 'daily-note.md');
      const content = `---
title: November 3, 2025
date: 2025-11-03
template: tpl-daily
weekday: Sunday
tags: [daily]
---

# November 3, 2025

Daily note content.
`;
      await fs.writeFile(sourcePath, content);

      const context: ToolHandlerContext = {
        registryConfig: { serverVersion: '2.0.1', toolMode: 'consolidated-only' },
        analytics: { logToolCall: () => Promise.resolve() } as any
      };

      const destPath = path.join(vaultPath, '2025-11-03.md');
      const result = await renameNoteHandler(
        {
          oldPath: sourcePath,
          newPath: destPath,
          updateLinks: false
        },
        context
      );

      const output = JSON.parse(result.content[0].text) as RenameNoteOutput;

      expect(output.success).toBe(true);

      // Verify: Template fields intact
      const renamedContent = await fs.readFile(destPath, 'utf-8');
      expect(renamedContent).toContain('date: 2025-11-03');
      expect(renamedContent).toContain('template: tpl-daily');
      expect(renamedContent).toContain('weekday: Sunday');
    });
  });
});
