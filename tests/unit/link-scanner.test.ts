/**
 * Unit tests for LinkScanner infrastructure
 *
 * Tests link detection, regex pattern matching, and content extraction
 * for all Obsidian wikilink formats.
 *
 * @since MCP-106
 */

import { LinkScanner, type LinkReference } from '../../src/link-scanner.js';
import { WIKILINK_PATTERN } from '../../src/regex-utils.js';
import type { LifeOSNote } from '../../src/types.js';

describe('LinkScanner', () => {
  describe('WIKILINK_PATTERN regex', () => {
    it('should match basic wikilink [[Note]]', () => {
      const content = 'See [[Note]] for details';
      const matches = Array.from(content.matchAll(WIKILINK_PATTERN));

      expect(matches).toHaveLength(1);
      expect(matches[0][0]).toBe('[[Note]]'); // Full match
      expect(matches[0][1]).toBeUndefined(); // No embed flag
      expect(matches[0][2]).toBe('Note'); // Target note
      expect(matches[0][3]).toBeUndefined(); // No anchor
      expect(matches[0][4]).toBeUndefined(); // No alias
    });

    it('should match embed link ![[Image]]', () => {
      const content = '![[Image]]';
      const matches = Array.from(content.matchAll(WIKILINK_PATTERN));

      expect(matches).toHaveLength(1);
      expect(matches[0][0]).toBe('![[Image]]');
      expect(matches[0][1]).toBe('!'); // Embed flag
      expect(matches[0][2]).toBe('Image'); // Target
    });

    it('should match alias link [[Note|Display Text]]', () => {
      const content = '[[Note|Display Text]]';
      const matches = Array.from(content.matchAll(WIKILINK_PATTERN));

      expect(matches).toHaveLength(1);
      expect(matches[0][0]).toBe('[[Note|Display Text]]');
      expect(matches[0][2]).toBe('Note'); // Target (note name before |)
      expect(matches[0][4]).toBe('Display Text'); // Alias (display text after |)
    });

    it('should match heading link [[Note#Section]]', () => {
      const content = '[[Note#Section]]';
      const matches = Array.from(content.matchAll(WIKILINK_PATTERN));

      expect(matches).toHaveLength(1);
      expect(matches[0][0]).toBe('[[Note#Section]]');
      expect(matches[0][2]).toBe('Note'); // Target
      expect(matches[0][3]).toBe('Section'); // Anchor (heading)
    });

    it('should match block reference [[Note#^blockid]]', () => {
      const content = '[[Note#^blockid]]';
      const matches = Array.from(content.matchAll(WIKILINK_PATTERN));

      expect(matches).toHaveLength(1);
      expect(matches[0][0]).toBe('[[Note#^blockid]]');
      expect(matches[0][2]).toBe('Note'); // Target
      expect(matches[0][3]).toBe('^blockid'); // Anchor (block ref with ^ prefix)
    });

    it('should match complex link [[Note#Heading|Alias]]', () => {
      const content = '[[Note#Heading|Alias]]';
      const matches = Array.from(content.matchAll(WIKILINK_PATTERN));

      expect(matches).toHaveLength(1);
      expect(matches[0][0]).toBe('[[Note#Heading|Alias]]');
      expect(matches[0][2]).toBe('Note'); // Target
      expect(matches[0][3]).toBe('Heading'); // Anchor (heading)
      expect(matches[0][4]).toBe('Alias'); // Alias
    });

    it('should match block reference with alias [[Note#^block123|Link]]', () => {
      const content = '[[Note#^block123|Link]]';
      const matches = Array.from(content.matchAll(WIKILINK_PATTERN));

      expect(matches).toHaveLength(1);
      expect(matches[0][0]).toBe('[[Note#^block123|Link]]');
      expect(matches[0][2]).toBe('Note'); // Target
      expect(matches[0][3]).toBe('^block123'); // Anchor (block ref with ^ prefix)
      expect(matches[0][4]).toBe('Link'); // Alias
    });

    it('should distinguish [[Note#^block]] from [[Note#heading]]', () => {
      const content = '[[Note#^block]] and [[Note#heading]]';
      const matches = Array.from(content.matchAll(WIKILINK_PATTERN));

      expect(matches).toHaveLength(2);
      // First match: block reference
      expect(matches[0][3]).toBe('^block'); // Starts with ^
      // Second match: heading
      expect(matches[1][3]).toBe('heading'); // No ^ prefix
    });

    it('should match multiple links in one line', () => {
      const content = 'See [[Note1]] and [[Note2]] and [[Note3]]';
      const matches = Array.from(content.matchAll(WIKILINK_PATTERN));

      expect(matches).toHaveLength(3);
      expect(matches[0][2]).toBe('Note1');
      expect(matches[1][2]).toBe('Note2');
      expect(matches[2][2]).toBe('Note3');
    });

    it('should not match incomplete links [[Note', () => {
      const content = 'Incomplete [[Note without closing';
      const matches = Array.from(content.matchAll(WIKILINK_PATTERN));

      expect(matches).toHaveLength(0);
    });

    it('should not match single brackets [Note]', () => {
      const content = 'Single [Note] brackets';
      const matches = Array.from(content.matchAll(WIKILINK_PATTERN));

      expect(matches).toHaveLength(0);
    });
  });

  describe('extractLinksFromContent', () => {
    it('should extract basic link with correct metadata', () => {
      const content = 'See [[Note]] for details';
      const sourcePath = '/vault/source.md';

      const links = LinkScanner.extractLinksFromContent(content, sourcePath);

      expect(links).toHaveLength(1);
      expect(links[0]).toMatchObject({
        sourcePath: '/vault/source.md',
        sourceNote: 'source',
        linkText: '[[Note]]',
        targetNote: 'Note',
        isEmbed: false,
        lineNumber: 1,
        lineText: 'See [[Note]] for details',
        columnStart: 4,
        columnEnd: 12,
        isAmbiguous: false,
      });
      expect(links[0].alias).toBeUndefined();
      expect(links[0].heading).toBeUndefined();
      expect(links[0].blockRef).toBeUndefined();
    });

    it('should extract embed link', () => {
      const content = '![[Image]]';
      const links = LinkScanner.extractLinksFromContent(content, '/vault/note.md');

      expect(links).toHaveLength(1);
      expect(links[0].isEmbed).toBe(true);
      expect(links[0].targetNote).toBe('Image');
    });

    it('should extract alias link', () => {
      const content = '[[Target|Display]]';
      const links = LinkScanner.extractLinksFromContent(content, '/vault/note.md');

      expect(links).toHaveLength(1);
      expect(links[0].targetNote).toBe('Target');
      expect(links[0].alias).toBe('Display');
    });

    it('should extract heading link', () => {
      const content = '[[Note#Introduction]]';
      const links = LinkScanner.extractLinksFromContent(content, '/vault/note.md');

      expect(links).toHaveLength(1);
      expect(links[0].targetNote).toBe('Note');
      expect(links[0].heading).toBe('Introduction');
    });

    it('should extract block reference link [[Note#^abc123]]', () => {
      const content = '[[Note#^abc123]]';
      const links = LinkScanner.extractLinksFromContent(content, '/vault/note.md');

      expect(links).toHaveLength(1);
      expect(links[0].targetNote).toBe('Note');
      expect(links[0].blockRef).toBe('^abc123'); // Includes ^ prefix
      expect(links[0].heading).toBeUndefined();
    });

    it('should distinguish block ref [[Note#^block]] from heading [[Note#heading]]', () => {
      const content = '[[Note#^block]] and [[Note#heading]]';
      const links = LinkScanner.extractLinksFromContent(content, '/vault/note.md');

      expect(links).toHaveLength(2);
      // First link: block reference
      expect(links[0].blockRef).toBe('^block');
      expect(links[0].heading).toBeUndefined();
      // Second link: heading
      expect(links[1].heading).toBe('heading');
      expect(links[1].blockRef).toBeUndefined();
    });

    it('should reject malformed block reference [[Note#^]] with bare caret', () => {
      const content = '[[Note#^]] is malformed';
      const links = LinkScanner.extractLinksFromContent(content, '/vault/note.md');

      expect(links).toHaveLength(1);
      // Malformed block ref (bare ^ without ID) should be rejected
      expect(links[0].blockRef).toBeUndefined();
      expect(links[0].heading).toBeUndefined();
      expect(links[0].targetNote).toBe('Note');
    });

    it('should extract multiple links from multiple lines', () => {
      const content = `Line 1 with [[Note1]]
Line 2 with [[Note2]]
Line 3 with [[Note3]]`;
      const links = LinkScanner.extractLinksFromContent(content, '/vault/note.md');

      expect(links).toHaveLength(3);
      expect(links[0].lineNumber).toBe(1);
      expect(links[0].targetNote).toBe('Note1');
      expect(links[1].lineNumber).toBe(2);
      expect(links[1].targetNote).toBe('Note2');
      expect(links[2].lineNumber).toBe(3);
      expect(links[2].targetNote).toBe('Note3');
    });

    it('should skip code blocks by default', () => {
      const content = `Normal [[Note1]]
\`\`\`
Code [[Note2]]
\`\`\`
Normal [[Note3]]`;
      const links = LinkScanner.extractLinksFromContent(content, '/vault/note.md');

      expect(links).toHaveLength(2);
      expect(links[0].targetNote).toBe('Note1');
      expect(links[1].targetNote).toBe('Note3');
    });

    it('should include code blocks when skipCodeBlocks is false', () => {
      const content = `Normal [[Note1]]
\`\`\`
Code [[Note2]]
\`\`\``;
      const links = LinkScanner.extractLinksFromContent(content, '/vault/note.md', {
        skipCodeBlocks: false,
      });

      expect(links).toHaveLength(2);
      expect(links[0].targetNote).toBe('Note1');
      expect(links[1].targetNote).toBe('Note2');
    });

    it('should skip frontmatter by default', () => {
      const content = `---
related: [[Note1]]
---
Content [[Note2]]`;
      const links = LinkScanner.extractLinksFromContent(content, '/vault/note.md');

      expect(links).toHaveLength(1);
      expect(links[0].targetNote).toBe('Note2');
    });

    it('should include frontmatter when skipFrontmatter is false', () => {
      const content = `---
related: [[Note1]]
---
Content [[Note2]]`;
      const links = LinkScanner.extractLinksFromContent(content, '/vault/note.md', {
        skipFrontmatter: false,
      });

      expect(links).toHaveLength(2);
      expect(links[0].targetNote).toBe('Note1');
      expect(links[1].targetNote).toBe('Note2');
    });

    it('should filter embeds when includeEmbeds is false', () => {
      const content = 'Regular [[Note1]] and embed ![[Note2]]';
      const links = LinkScanner.extractLinksFromContent(content, '/vault/note.md', {
        includeEmbeds: false,
      });

      expect(links).toHaveLength(1);
      expect(links[0].targetNote).toBe('Note1');
      expect(links[0].isEmbed).toBe(false);
    });

    it('should strip .md extension from target notes', () => {
      const content = '[[Note.md]]';
      const links = LinkScanner.extractLinksFromContent(content, '/vault/note.md');

      expect(links).toHaveLength(1);
      expect(links[0].targetNote).toBe('Note');
    });

    it('should track column positions accurately', () => {
      const content = '   [[Note]]   ';
      const links = LinkScanner.extractLinksFromContent(content, '/vault/note.md');

      expect(links).toHaveLength(1);
      expect(links[0].columnStart).toBe(3);
      expect(links[0].columnEnd).toBe(11);
    });
  });

  describe('scanNoteForLinks', () => {
    it('should scan a note for all links', () => {
      const note: LifeOSNote = {
        path: '/vault/source.md',
        frontmatter: { title: 'Source Note' },
        content: '[[Note1]] and [[Note2]]',
        created: new Date('2025-01-01'),
        modified: new Date('2025-01-02'),
      };

      const links = LinkScanner.scanNoteForLinks(note);

      expect(links).toHaveLength(2);
      expect(links[0].sourcePath).toBe('/vault/source.md');
      expect(links[0].sourceNote).toBe('source');
      expect(links[0].targetNote).toBe('Note1');
      expect(links[1].targetNote).toBe('Note2');
    });
  });

  describe('error handling', () => {
    it('should throw error for empty target note name', async () => {
      await expect(LinkScanner.scanVaultForLinks('')).rejects.toThrow(
        'Invalid target note name'
      );
    });

    it('should throw error for whitespace-only target', async () => {
      await expect(LinkScanner.scanVaultForLinks('   ')).rejects.toThrow(
        'Invalid target note name'
      );
    });
  });

  describe('edge cases', () => {
    it('should handle nested brackets in link text', () => {
      const content = '[[Note [with] brackets]]';
      const links = LinkScanner.extractLinksFromContent(content, '/vault/note.md');

      expect(links).toHaveLength(1);
      expect(links[0].targetNote).toBe('Note [with] brackets');
    });

    it('should handle special characters in note names', () => {
      const content = '[[Note-with-dashes]] and [[Note_with_underscores]]';
      const links = LinkScanner.extractLinksFromContent(content, '/vault/note.md');

      expect(links).toHaveLength(2);
      expect(links[0].targetNote).toBe('Note-with-dashes');
      expect(links[1].targetNote).toBe('Note_with_underscores');
    });

    it('should handle empty content', () => {
      const links = LinkScanner.extractLinksFromContent('', '/vault/note.md');
      expect(links).toHaveLength(0);
    });

    it('should handle content with no links', () => {
      const content = 'Just regular text with no wikilinks at all';
      const links = LinkScanner.extractLinksFromContent(content, '/vault/note.md');
      expect(links).toHaveLength(0);
    });

    it('should handle unclosed code blocks', () => {
      const content = `Normal [[Note1]]
\`\`\`
Code [[Note2]]
No closing backticks`;
      const links = LinkScanner.extractLinksFromContent(content, '/vault/note.md');

      // Should skip everything after opening code block
      expect(links).toHaveLength(1);
      expect(links[0].targetNote).toBe('Note1');
    });
  });
});
