/**
 * Unit tests for Link Updater functionality
 *
 * Tests link update functions for rename_note Phase 3 implementation:
 * - VaultUtils.buildNewLinkText(): Wikilink reconstruction with all format combinations
 * - VaultUtils.updateNoteLinks(): Content transformation with link rewriting
 * - updateVaultLinks(): Orchestration with mocked I/O
 *
 * @since MCP-107
 */

import { updateVaultLinks } from '../../src/link-updater.js';
import { LinkScanner } from '../../src/link-scanner.js';
import { VaultUtils } from '../../src/vault-utils.js';
import type { LinkScanResult } from '../../src/link-scanner.js';
import * as fileIo from '../../src/modules/files/file-io.js';

// Mock only I/O dependencies (not helper functions)
jest.mock('../../src/link-scanner.js');

// Spy on file I/O functions for updateVaultLinks tests
const readFileSpy = jest.spyOn(fileIo, 'readFileWithRetry');
const writeFileSpy = jest.spyOn(fileIo, 'writeFileWithRetry');

describe('Link Updater', () => {
  describe('VaultUtils.buildNewLinkText', () => {
    it('should build basic wikilink [[Note]]', () => {
      const result = VaultUtils.buildNewLinkText(undefined, 'NewNote', undefined, undefined, undefined);
      expect(result).toBe('[[NewNote]]');
    });

    it('should build embed link ![[Note]]', () => {
      const result = VaultUtils.buildNewLinkText('!', 'NewNote', undefined, undefined, undefined);
      expect(result).toBe('![[NewNote]]');
    });

    it('should build alias link [[Note|Alias]]', () => {
      const result = VaultUtils.buildNewLinkText(undefined, 'NewNote', undefined, undefined, 'Display Text');
      expect(result).toBe('[[NewNote|Display Text]]');
    });

    it('should build heading link [[Note#Section]]', () => {
      const result = VaultUtils.buildNewLinkText(undefined, 'NewNote', 'Section', undefined, undefined);
      expect(result).toBe('[[NewNote#Section]]');
    });

    it('should build block reference link [[Note#^block]]', () => {
      const result = VaultUtils.buildNewLinkText(undefined, 'NewNote', undefined, '^block123', undefined);
      expect(result).toBe('[[NewNote#^block123]]');
    });

    it('should build heading + alias [[Note#Section|Alias]]', () => {
      const result = VaultUtils.buildNewLinkText(undefined, 'NewNote', 'Section', undefined, 'Link Text');
      expect(result).toBe('[[NewNote#Section|Link Text]]');
    });

    it('should build block + alias [[Note#^block|Alias]]', () => {
      const result = VaultUtils.buildNewLinkText(undefined, 'NewNote', undefined, '^block123', 'Link Text');
      expect(result).toBe('[[NewNote#^block123|Link Text]]');
    });

    it('should prioritize block ref over heading when both provided', () => {
      // When both heading and blockRef are set, blockRef takes precedence
      const result = VaultUtils.buildNewLinkText(undefined, 'NewNote', 'Section', '^block123', undefined);
      expect(result).toBe('[[NewNote#^block123]]');
    });

    it('should build embed with heading ![[Note#Section]]', () => {
      const result = VaultUtils.buildNewLinkText('!', 'NewNote', 'Section', undefined, undefined);
      expect(result).toBe('![[NewNote#Section]]');
    });

    it('should build embed with alias ![[Note|Alias]]', () => {
      const result = VaultUtils.buildNewLinkText('!', 'NewNote', undefined, undefined, 'Display');
      expect(result).toBe('![[NewNote|Display]]');
    });
  });

  describe('VaultUtils.updateNoteLinks', () => {
    it('should update single basic link', () => {
      const content = 'See [[OldNote]] for details';
      const result = VaultUtils.updateNoteLinks(content, 'OldNote', 'NewNote');
      expect(result).toContain('[[NewNote]]');
      expect(result).not.toContain('[[OldNote]]');
    });

    it('should update multiple links in content', () => {
      const content = 'See [[OldNote]] and also [[OldNote]] again';
      const result = VaultUtils.updateNoteLinks(content, 'OldNote', 'NewNote');
      const matches = result.match(/\[\[NewNote\]\]/g);
      expect(matches).toHaveLength(2);
    });

    it('should update link with alias', () => {
      const content = '[[OldNote|Display Text]]';
      const result = VaultUtils.updateNoteLinks(content, 'OldNote', 'NewNote');
      expect(result).toContain('[[NewNote|Display Text]]');
    });

    it('should update link with heading', () => {
      const content = '[[OldNote#Section]]';
      const result = VaultUtils.updateNoteLinks(content, 'OldNote', 'NewNote');
      expect(result).toContain('[[NewNote#Section]]');
    });

    it('should update link with block reference', () => {
      const content = '[[OldNote#^block123]]';
      const result = VaultUtils.updateNoteLinks(content, 'OldNote', 'NewNote');
      expect(result).toContain('[[NewNote#^block123]]');
    });

    it('should distinguish block refs from headings during update', () => {
      const content = '[[OldNote#^block]] and [[OldNote#heading]]';
      const result = VaultUtils.updateNoteLinks(content, 'OldNote', 'NewNote');
      expect(result).toContain('[[NewNote#^block]]'); // Block ref preserved with ^
      expect(result).toContain('[[NewNote#heading]]'); // Heading preserved without ^
    });

    it('should update embed link', () => {
      const content = '![[OldNote]]';
      const result = VaultUtils.updateNoteLinks(content, 'OldNote', 'NewNote');
      expect(result).toContain('![[NewNote]]');
    });

    it('should preserve non-matching links', () => {
      const content = '[[OtherNote]] and [[OldNote]]';
      const result = VaultUtils.updateNoteLinks(content, 'OldNote', 'NewNote');
      expect(result).toContain('[[OtherNote]]');
      expect(result).toContain('[[NewNote]]');
    });

    it('should be case-insensitive when matching', () => {
      const content = '[[oldnote]] and [[OLDNOTE]] and [[OldNote]]';
      const result = VaultUtils.updateNoteLinks(content, 'OldNote', 'NewNote');
      const matches = result.match(/\[\[NewNote\]\]/g);
      expect(matches).toHaveLength(3);
    });

    it('should strip .md extension from note names', () => {
      const content = '[[OldNote]]';
      const result = VaultUtils.updateNoteLinks(content, 'OldNote.md', 'NewNote.md');
      expect(result).toContain('[[NewNote]]');
    });

    it('should preserve frontmatter structure (read-only)', () => {
      const content = `---
title: Test Note
tags: [test]
---

See [[OldNote]] for details`;

      const result = VaultUtils.updateNoteLinks(content, 'OldNote', 'NewNote');

      // Check frontmatter is preserved (gray-matter may reformat)
      expect(result).toContain('title: Test Note');
      expect(result).toMatch(/tags:/); // May be reformatted by gray-matter

      // Check link is updated in content ONLY
      expect(result).toContain('[[NewNote]]');
    });

    it('should update links in both frontmatter and content (MCP-110)', () => {
      const content = `---
related: "[[OldNote]]"
---

Body with [[OldNote]]`;

      const result = VaultUtils.updateNoteLinks(content, 'OldNote', 'NewNote');

      // Frontmatter link NOW UPDATED (implemented in MCP-110)
      const frontmatterMatch = result.match(/---[\s\S]*?---/);
      expect(frontmatterMatch![0]).toContain('[[NewNote]]');

      // Body link should be updated
      const bodyMatch = result.split('---')[2];
      expect(bodyMatch).toContain('[[NewNote]]');

      // No old references anywhere
      expect(result).not.toContain('[[OldNote]]');
    });

    it('should preserve content structure and formatting', () => {
      const content = `# Heading

Paragraph with [[OldNote]] link.

- List item
- Another [[OldNote]] reference

> Blockquote with [[OldNote]]`;

      const result = VaultUtils.updateNoteLinks(content, 'OldNote', 'NewNote');

      // Check structure preserved
      expect(result).toContain('# Heading');
      expect(result).toContain('- List item');
      expect(result).toContain('> Blockquote');

      // Check all links updated
      const matches = result.match(/\[\[NewNote\]\]/g);
      expect(matches).toHaveLength(3);
    });
  });

  describe('updateVaultLinks', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should throw error for empty note names', async () => {
      await expect(updateVaultLinks('', 'NewNote')).rejects.toThrow();
      await expect(updateVaultLinks('OldNote', '')).rejects.toThrow();
    });

    it('should successfully update links across multiple files', async () => {
      // Mock LinkScanner with references in 3 files
      const mockScanResult: LinkScanResult = {
        targetNote: 'OldNote',
        totalReferences: 3,
        references: [
          { sourcePath: '/vault/note1.md', linkText: '[[OldNote]]', lineNumber: 1, columnNumber: 0, target: 'OldNote', alias: undefined, heading: undefined, blockRef: undefined, isEmbed: false },
          { sourcePath: '/vault/note2.md', linkText: '[[OldNote]]', lineNumber: 1, columnNumber: 0, target: 'OldNote', alias: undefined, heading: undefined, blockRef: undefined, isEmbed: false },
          { sourcePath: '/vault/note3.md', linkText: '[[OldNote]]', lineNumber: 1, columnNumber: 0, target: 'OldNote', alias: undefined, heading: undefined, blockRef: undefined, isEmbed: false }
        ],
        scanTimeMs: 100
      };

      (LinkScanner.scanVaultForLinks as jest.Mock).mockResolvedValue(mockScanResult);
      readFileSpy.mockReturnValue('Content with [[OldNote]]');
      writeFileSpy.mockImplementation(() => {});

      const result = await updateVaultLinks('OldNote', 'NewNote');

      expect(result.success).toBe(true);
      expect(result.updatedCount).toBe(3);
      expect(result.totalReferences).toBe(3);
      expect(result.failedFiles).toHaveLength(0);
    });

    it('should handle individual file failures gracefully', async () => {
      // Mock LinkScanner with references in 3 files
      const mockScanResult: LinkScanResult = {
        targetNote: 'OldNote',
        totalReferences: 3,
        references: [
          { sourcePath: '/vault/note1.md', linkText: '[[OldNote]]', lineNumber: 1, columnNumber: 0, target: 'OldNote', alias: undefined, heading: undefined, blockRef: undefined, isEmbed: false },
          { sourcePath: '/vault/note2.md', linkText: '[[OldNote]]', lineNumber: 1, columnNumber: 0, target: 'OldNote', alias: undefined, heading: undefined, blockRef: undefined, isEmbed: false },
          { sourcePath: '/vault/note3.md', linkText: '[[OldNote]]', lineNumber: 1, columnNumber: 0, target: 'OldNote', alias: undefined, heading: undefined, blockRef: undefined, isEmbed: false }
        ],
        scanTimeMs: 100
      };

      (LinkScanner.scanVaultForLinks as jest.Mock).mockResolvedValue(mockScanResult);
      readFileSpy.mockReturnValueOnce('Content')
        .mockReturnValueOnce('Content')
        .mockImplementationOnce(() => { throw new Error('Permission denied'); });
      writeFileSpy.mockImplementation(() => {});

      const result = await updateVaultLinks('OldNote', 'NewNote');

      expect(result.success).toBe(false);
      expect(result.updatedCount).toBe(2);
      expect(result.partialSuccess).toBe(true);
      expect(result.failedFiles).toHaveLength(1);
      expect(result.failedFiles[0].path).toBe('/vault/note3.md');
    });

    it('should report complete failure when all files fail', async () => {
      const mockScanResult: LinkScanResult = {
        targetNote: 'OldNote',
        totalReferences: 1,
        references: [
          { sourcePath: '/vault/note1.md', linkText: '[[OldNote]]', lineNumber: 1, columnNumber: 0, target: 'OldNote', alias: undefined, heading: undefined, blockRef: undefined, isEmbed: false }
        ],
        scanTimeMs: 100
      };

      (LinkScanner.scanVaultForLinks as jest.Mock).mockResolvedValue(mockScanResult);
      readFileSpy.mockImplementation(() => { throw new Error('File not found'); });

      const result = await updateVaultLinks('OldNote', 'NewNote');

      expect(result.success).toBe(false);
      expect(result.updatedCount).toBe(0);
      expect(result.partialSuccess).toBe(false);
      expect(result.failedFiles).toHaveLength(1);
    });

    it('should handle no references found', async () => {
      const mockScanResult: LinkScanResult = {
        targetNote: 'OldNote',
        totalReferences: 0,
        references: [],
        scanTimeMs: 50
      };

      (LinkScanner.scanVaultForLinks as jest.Mock).mockResolvedValue(mockScanResult);

      const result = await updateVaultLinks('OldNote', 'NewNote');

      expect(result.success).toBe(true);
      expect(result.updatedCount).toBe(0);
      expect(result.totalReferences).toBe(0);
      expect(result.failedFiles).toHaveLength(0);
    });
  });
});
